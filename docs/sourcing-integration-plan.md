# Wekbench multi-provider sourcing — architecture & build plan

This document describes how Wekbench sources real pricing/availability for RFQ line
items across many supplier APIs (Nexar, OEMsecrets, IT distributors, industrial, …)
without forking the workflow per user type, while keeping AI usage and latency low.

## 1. Principle: one pipeline, many adapters

There is **one** sourcing pipeline that every workspace runs. What varies between
verticals (IT, electrical, industrial, …) is **configuration**, not code path.

```
RFQ → AI extract + classify (1 batched call) → deterministic Router
    → parallel Provider Adapters (by line-item category) → normalized Offer cache
    → best offer sets quote line unit_cost → FX & landed cost → Quote
```

Two rules make this cheap and fast:

1. **AI runs once per RFQ**, batched across all lines, and only does the fuzzy work
   (extract line items, tag a category, guess an MPN/keywords). Everything after that
   is deterministic code — routing and pricing never call a model.
2. **Route per line item by product category, not by user type.** A real RFQ is mixed
   (an electrical contractor's request can contain an IT switch). The user's vertical
   only sets which providers are enabled by default.

## 2. Data model

### 2.1 New: `sourcing_providers` (global registry)

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| key | text unique | e.g. `nexar`, `oemsecrets`, `sitc`, `industrial_manual` |
| name | text | display name |
| kind | text | `api` \| `catalog` \| `manual` |
| categories | text[] | categories this provider serves (see §2.5) |
| is_active | boolean | global kill switch |
| priority | int | tie-break ordering |

### 2.2 New: `workspace_providers` (per-workspace config)

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| workspace_id | uuid fk | |
| provider_id | uuid fk | |
| enabled | boolean | vertical default + user override |
| preferred | boolean | rank first in results |
| config | jsonb | currency, country, distributor filters, margin rules |

A workspace's vertical just seeds rows here. No separate workflow per user type.

### 2.3 New: `provider_offers` (normalized cache — the key table)

One part has many distributor offers, so they cannot be columns. This table is also
the cache that protects each API's quota/rate limits.

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| workspace_id | uuid fk | |
| provider_id | uuid fk | which adapter produced it |
| identifier | text | the MPN / SKU used to fetch |
| external_part_id | text | provider's part id (e.g. Nexar/Octopart id) — re-query cheaply |
| distributor_name | text | |
| distributor_external_id | text | provider's seller id |
| distributor_sku | text | |
| stock_qty | int | inventoryLevel |
| moq | int | minimum order qty |
| order_multiple | int | |
| packaging | text | |
| lead_time_days | int | factoryLeadDays |
| price_breaks | jsonb | `[{quantity, price, currency, converted_price, converted_currency}]` |
| currency | text | seller native |
| buy_url | text | clickUrl |
| is_authorised | boolean | authorized distributor |
| fetched_at | timestamptz | freshness / staleness window |

### 2.4 Line-item additions

`extracted_line_items` (output of the AI pass):

- `category` text — routing key (see §2.5)
- `mpn` text, `manufacturer` text — AI best-guess identity
- `routing_status` text — `pending` \| `routed` \| `priced` \| `no_source` \| `manual`

`quote_line_items` (the sourcing decision):

- `mpn` text, `manufacturer` text, `external_part_id` text
- `selected_offer_id` uuid fk → `provider_offers`
- `source_distributor` text (denormalized for display)
- `price_fetched_at` timestamptz (freshness badge)

`suppliers` (map your distributors to provider sellers):

- `provider_id` uuid fk, `external_seller_id` text, `is_authorised_distributor` boolean

### 2.5 Category taxonomy (starter)

`electronic_component`, `it_hardware`, `electrical`, `industrial_mechanical`,
`consumable`, `other`. Each `sourcing_providers.categories` lists which it serves;
`other`/unknown falls back to the manual-RFQ provider.

## 3. Adapter interface

Every provider implements the same interface and returns the **same normalized shape**.
Core code never imports a specific API client.

```ts
export type NormalizedOffer = {
  distributorName: string
  distributorExternalId?: string
  distributorSku?: string
  stockQty?: number
  moq?: number
  orderMultiple?: number
  packaging?: string
  leadTimeDays?: number
  priceBreaks: { quantity: number; price: number; currency: string;
                 convertedPrice?: number; convertedCurrency?: string }[]
  buyUrl?: string
  isAuthorised?: boolean
}

export type NormalizedPart = {
  externalPartId?: string
  mpn?: string
  manufacturer?: string
  lifecycleStatus?: string
  datasheetUrl?: string
  offers: NormalizedOffer[]
}

export interface SourcingAdapter {
  key: string
  kind: "api" | "catalog" | "manual"
  categories: string[]
  // exact identity match (preferred — cheapest, most precise)
  matchByMpn(input: { mpn: string; manufacturer?: string; qty?: number;
                      currency?: string; country?: string }): Promise<NormalizedPart[]>
  // fuzzy fallback when no MPN
  search(input: { query: string; qty?: number;
                  currency?: string; country?: string }): Promise<NormalizedPart[]>
}
```

Adding a supplier later = one new file implementing `SourcingAdapter` + a
`sourcing_providers` row. The pipeline does not change.

Non-API verticals still get an adapter:
- `catalog` adapter reads `catalog_items` / an imported price list.
- `manual` adapter drafts a quote-request email to a known supplier (no API).

## 4. The AI pass (where credits are spent — keep it to one call)

Fold classification into the extraction you already run:

1. **Deterministic pre-filter first.** Regex/keyword rules tag the obvious lines
   (Dell/Cisco/HP SKU → `it_hardware`; MPN pattern or "resistor/capacitor/IC" →
   `electronic_component`). These skip the model entirely.
2. **One Haiku call per RFQ**, batched over the remaining lines, returns for each:
   `{ description, qty, unit, category, mpn?, manufacturer?, keywords? }`.
3. **Cache.** Persist the classification on `extracted_line_items`. Re-quoting the
   same item never re-invokes the model.

Routing is **not** an AI decision — it is a lookup (`category → providers` from the
registry). The model only parses messy human input; code does everything else.

## 5. Routing & fan-out (deterministic, parallel)

```
for each extracted line:
  providers = workspace_providers
              .enabled
              .where(provider.categories contains line.category)
  fan out matchByMpn() (or search() when no mpn) to those providers IN PARALLEL
  with a per-provider timeout (e.g. 6s)
  normalize → upsert provider_offers (skip fetch if a fresh row exists)
  pick best offer (qty-aware price break, in stock, preferred/authorised first)
  set quote_line_items.unit_cost + selected_offer_id, then apply margin
```

Run server-side (Supabase edge function / server fn). Stream results into the UI per
line ("pricing…") so a slow industrial source never blocks electronics results.

## 6. Performance & credit rules

- **One AI call per RFQ**, batched, Haiku, cached. Never per-line, never per-provider.
- **Parallel fan-out** with per-provider timeouts.
- **Offer cache with a freshness window** (`provider_offers.fetched_at`) — reuse within
  N hours instead of re-querying. This is also how we respect Nexar's monthly part
  quota and other APIs' rate limits.
- **Token cache per provider** (Nexar tokens last 24h — cache server-side, don't
  re-auth per request). One queue/limiter per provider.
- **Secrets server-side only** (provider client_id/secret in env or a secrets table);
  never in client code, never committed.
- **Currency/landed cost**: store native + converted price; quotes are in GH₵, so an
  FX step (existing `FxRatesCard`) plus landed-cost/shipping turns an ex-works
  distributor price into a real delivered cost.

## 7. Phased rollout (Nexar first)

- **Phase 0 — schema.** Migrations for §2 tables/columns. (Run via Lovable DB tool.)
- **Phase 1 — Nexar adapter.** Server-side Nexar client: OAuth client-credentials with
  token caching; `matchByMpn` via `supMultiMatch`, `search` via `supSearchMpn`;
  normalize to `NormalizedPart`. Seed `sourcing_providers` with `nexar`.
- **Phase 2 — line classification.** Extend the extraction pass to emit
  `category`/`mpn`/`manufacturer` + the deterministic pre-filter; persist on
  `extracted_line_items`.
- **Phase 3 — router + fan-out.** Deterministic router, parallel fetch, `provider_offers`
  cache with freshness, best-offer selection → `quote_line_items.unit_cost`.
- **Phase 4 — offer UI.** "Find on Nexar" + offer-comparison drawer + refresh/staleness
  badges + stock/lifecycle/datasheet on the quote builder.
- **Phase 5 — add providers.** OEMsecrets adapter, an IT source (Stock in the Channel),
  an industrial `manual`/`catalog` adapter — each is just a new adapter + registry row.

## 8. Open questions to confirm before Phase 1

- Default **country/currency** per workspace for Nexar (availability is region-specific;
  GH₵ needs an FX step).
- Offer cache **freshness window** (e.g. 6h for price, longer for specs).
- Best-offer **policy**: cheapest vs. in-stock vs. authorised-distributor-first.
- Which **IT** and **industrial** sources to target first (API vs. manual).
