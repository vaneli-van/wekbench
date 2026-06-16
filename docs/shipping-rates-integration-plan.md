# Shipping rate comparison — integration plan

Goal: let a quoter compare live shipping/freight rates from multiple carriers
(DHL, FedEx, UPS, Aramex, ocean/air forwarders) inside the quote builder, the
same way we already compare part offers — and roll the chosen rate into the
quote as a freight line.

Scope decided with Samuel: **mixed shipment modes** (some orders go express
courier, some go ocean/air freight). Build the courier rate panel first, design
the data model so a freight provider slots in later. This doc is the scope only;
no code yet.

---

## 1. The realistic landscape

There is no single API that aggregates *both* parcel-courier rates *and*
freight-forwarder rates for Africa. There are two distinct worlds, and we need a
provider in each.

### A. Courier / express parcels  (build first)
Small, high-value electronics & IT gear by DHL Express / FedEx / UPS / Aramex,
priced by weight + dimensions + origin/destination.

| Provider | Fit for wekbench | Notes |
|---|---|---|
| **Terminal Africa (TShip)** | Best pan-African fit | One API → rates from DHL Express, FedEx, UPS, Aramex. Clean docs. **Origin coverage is Nigeria-first — Ghana origin must be confirmed with Terminal before committing.** |
| **Shipbubble** | Alternative | 50+ partners, also Nigeria-first. |
| **EasyPost / Shippo / Easyship** | Global fallback | Strong DHL/FedEx/UPS rates worldwide, thinner local African carrier depth. Good if Ghana origin isn't supported by the Africa-native ones. |

### B. Ocean / air freight  (phase 2)
Bulk/industrial goods, FCL/LCL or air cargo via forwarders through Tema / Kotoka.

| Provider | Fit | Notes |
|---|---|---|
| **Freightos / WebCargo** | The only credible API | On-demand air/ocean/trucking estimates & bookable rates from a large marketplace. Transactional API is free but it's a heavier, account-gated B2B integration. |

**Caveat to set expectations:** the courier APIs return *firm, bookable* rates.
Freightos returns *estimates* plus some bookable lanes — freight pricing is
inherently quote-based, so phase 2 is "indicative rate + request firm quote",
not instant-buy.

---

## 2. Where it lives in the product

A **"Compare shipping" panel** on the quote builder, parallel to the existing
part-offer drawer. Trigger sits near the quote totals (freight is a quote-level
cost, not a per-line cost).

Flow:
1. Quoter clicks **Compare shipping** on a quote.
2. We need: **origin** (supplier location / port), **destination** (buyer
   address — pull from the buyer record), **parcel** (total weight + dims, or
   freight: container type / volume / mode).
3. Fan out to every enabled shipping provider in parallel (reuse the sourcing
   router pattern), normalise, show a sortable list: carrier, service, ETA,
   amount (FX-converted to the quote currency via the existing `convertAmount`).
4. Quoter picks one → it's written as a **freight line** on the quote
   (description = carrier + service, unit_cost = converted amount, source
   currency/rate stored for provenance, exactly like `applyOfferToLine`).

This reuses four things we already have: the adapter+router+cache pattern, the
FX conversion helper, the offer-drawer UI shell, and the "apply to quote line"
write path.

---

## 3. Data model (additive, mirrors the sourcing tables)

```
shipping_providers            -- per-workspace enablement + mode
  id, workspace_id, slug ('terminal-africa' | 'freightos' | ...),
  mode ('courier' | 'freight'), enabled, display_name, created_at

shipping_rate_cache           -- dedupe + speed, like provider_offers
  id, workspace_id, provider_slug, request_hash,
  origin, destination, parcel jsonb, response jsonb, fetched_at

quote_shipments               -- the chosen rate attached to a quote
  id, workspace_id, quote_id, provider_slug, mode,
  carrier_name, carrier_service, currency, amount,
  source_currency, source_amount, fx_rate,
  eta_text, eta_minutes, rate_ref (provider rate_id), created_at
```

Member-based RLS via the existing `is_workspace_member()` helper. No secrets in
the DB — provider API keys live in Lovable Cloud → Secrets and are read inside
the server functions (same as Nexar/OEMsecrets).

### Normalised rate shape (what every adapter returns)
Modelled on the Terminal Africa response, since it's the richest:
```ts
type ShippingRate = {
  providerSlug: string;
  mode: "courier" | "freight";
  carrierName: string;          // "DHL Express", "FedEx", ...
  carrierLogo?: string;
  service: string;              // "EXPRESS DOMESTIC", "Air — LCL", ...
  amount: number;
  currency: string;             // convert to quote currency for display
  etaText?: string;             // "Within 3 days"
  etaMinutes?: number;
  includesInsurance?: boolean;
  bookable: boolean;            // courier: true; freight: often estimate-only
  rateRef?: string;             // provider rate_id, for later booking
  raw: unknown;                 // keep provider payload
};
```

---

## 4. Adapter interface (parallel to `SourcingAdapter`)

```ts
interface ShippingAdapter {
  slug: string;
  mode: "courier" | "freight";
  getRates(input: {
    origin: Address;
    destination: Address;
    parcel?: Parcel;            // courier: weight + LxWxH
    freight?: FreightSpec;      // mode/containers/volume/weight
    currency?: string;
  }): Promise<ShippingRate[]>;
}
```

- **TerminalAfricaAdapter** (`mode: "courier"`) — POST a shipment to
  `api.terminal.africa` to generate rates, map the `data.rates[]` array
  (`amount`, `carrier_name`, `carrier_slug`, `currency`, `delivery_time`,
  `delivery_eta`, `rate_id`, `includes_insurance`) into `ShippingRate`.
- **FreightosAdapter** (`mode: "freight"`, phase 2) — call the Freightos
  estimates endpoint, map air/ocean/trucking results; mark `bookable` per lane.

A small `shipping/router.server.ts` fans out to enabled providers, dedupes via
`shipping_rate_cache`, merges, sorts. Deterministic — no AI.

---

## 5. Phasing

**Phase 1 — Courier (Terminal Africa)**
1. Confirm Ghana origin support with Terminal (blocking decision — see §6).
2. `shipping_providers`, `shipping_rate_cache`, `quote_shipments` tables + RLS.
3. `ShippingAdapter` type, registry, `TerminalAfricaAdapter`, router.
4. Server fns: `getShippingRates`, `applyShipmentToQuote`, `listQuoteShipments`.
5. "Compare shipping" panel in the quote builder + freight line write-back.
6. Typecheck + handoff.

**Phase 2 — Freight (Freightos/WebCargo)**
7. `FreightosAdapter` + freight input form (mode, container/volume).
8. "Estimate + request firm quote" UX for non-bookable lanes.

---

## 6. Open decisions / things you need to do

1. **Ghana origin (blocking for Phase 1).** Verify Terminal Africa can quote
   *from* Ghana, not just Nigeria. If not, we use EasyPost/Shippo for the
   DHL/FedEx/UPS courier rates instead — same adapter shape, different client.
   Worth a quick check with both before I build.
2. **API keys.** You add the Terminal Africa key (and later Freightos) yourself
   in Lovable Cloud → Secrets. I never handle the keys.
3. **Origin source.** Where does a shipment originate — the supplier's address,
   a fixed warehouse, or a port? Determines what we send as origin.
4. **Parcel weight.** Courier rates need weight/dims. Do quote line items carry
   weight, or does the quoter enter a total parcel weight at compare time?
   (Simplest start: quoter enters total weight + box size on the panel.)
5. **Markup.** Do you pass carrier cost straight through, or add a freight
   margin % before it lands on the quote? (Mirrors how part cost vs. sell price
   works today.)

---

## 7. Effort estimate

- Phase 1 (courier, one provider): ~the size of the OEMsecrets sourcing build —
  schema + adapter + router + panel. A few focused sessions.
- Phase 2 (freight): larger, mostly because of the freight input form and the
  estimate-vs-bookable UX.

Sources: Terminal Africa TShip docs (docs.terminal.africa/tship), Shipbubble
(shipbubble.com/developers), Freightos Developer Portal
(developer.freightos.com).
