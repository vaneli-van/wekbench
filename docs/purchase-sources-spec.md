# Wekbench — Buyer Purchase Sources (Amazon Business & friends)

**Status:** Draft spec for review (pre-build)
**Goal:** Let a buyer pick where to buy from (Amazon Business, Grainger, RS, distributors…), shop that source from inside Wekbench as much as possible, and see the price fully landed to their country.

---

## 1. The key finding from research (read this first)

The big business sites do **not** offer a native "resale product + price API" you can render inside your own app. Concretely:

- **Amazon** — the affiliate **Product Advertising API is being deprecated (15 May 2026)** and requires qualifying affiliate sales; **SP-API is for sellers managing their own Amazon business**, not for pulling a resale catalogue. So there is **no clean native Amazon catalogue API** for a procurement app. Amazon Business integrates via **PunchOut (cXML/OCI)** — the documented, supported path (200+ e-procurement systems).
- **Grainger** — integrates via **PunchOut** (email your Grainger account rep, ~4–6 weeks, they issue credentials + ShipTo IDs). Has APIs, but access is account-rep gated.
- **RS Group** — **PunchOut / eProcurement** (SAP Ariba, Coupa), 750k SKUs, 32 countries (best international reach).

**Conclusion:** "fully internal, never leave the app" native rendering is only possible for sources with a real product/price **API** — which are the distributor/aggregator adapters you already have (Nexar, OEMsecrets, SITC) and possibly RS's part-search. **Every big business site (Amazon Business, Grainger, RS, Staples, CDW) is PunchOut**, which is *assisted* buying: the shopping happens in a hosted supplier session (embeddable in a panel), and a cart is returned to Wekbench. So we support **two source types**, not one.

---

## 2. Two source types

### A) API source (fully internal)
Product + price come back over an API; Wekbench renders the catalogue and prices natively. The buyer never leaves. This is the existing **sourcing router adapter** pattern (Nexar/OEMsecrets/SITC). New API sources drop in the same way.

### B) PunchOut source (assisted / semi-internal)
The buyer clicks "Shop on Amazon Business," Wekbench opens a **PunchOut session** (cXML `PunchOutSetupRequest` → the supplier returns a session URL, shown in an embedded panel/popup). The buyer builds a cart on the supplier's site; on checkout the supplier POSTs the cart back to Wekbench (`PunchOutOrderMessage`). Wekbench parses the cart lines + prices, **applies landed cost**, and creates the order/PO. This is how Amazon Business, Grainger, RS are actually integrated.

> Note: PunchOut sessions are *designed* to be embedded, so the experience can live inside a Wekbench panel — much closer to "internal" than opening amazon.com raw (which can't be iframed at all).

---

## 3. Source selector (UX)

On a sourcing request, before/after pricing, the buyer sees a **"Buy from"** selector listing the sources connected to their workspace:

- **API sources** → priced automatically in the landed table (as today), tagged with the source.
- **PunchOut sources** → a "Shop on {source}" button that opens the embedded session; returned cart lines land back in the request, then get landed-costed.

Each line/offer shows its **source** and whether the price is live-API or punchout-cart.

---

## 4. Landed cost hook (already built — reuse)

Whatever the goods price and currency (API item price *or* returned punchout cart total), it feeds the **existing landed-cost engine**: goods → + freight → + duty → + VAT/levies → landed total, converted to the buyer's currency. No new pricing logic. The only source-specific input is the currency (USD for Amazon US, GBP for RS UK, etc.), which FX already handles.

---

## 5. The Ghana reality (important)

None of these have a Ghana marketplace. The real model is the **GollyExpress pattern**: buy on the source's US/UK marketplace, ship via a **forwarder/freight leg** to Ghana, then duties/VAT. So a complete "buy from Amazon Business" needs:

1. A **business account** with the source (see §7 open decision on who holds it),
2. A **forwarding/ship-to address** (Wekbench's or a partner forwarder's US/UK address) used as the PunchOut ShipTo,
3. **Landed cost** (freight for the forwarder leg + GH duties/VAT) — the engine we have, with freight ideally from the forwarder's rates later.

This is exactly the concierge value: the buyer shops Amazon as if local, and Wekbench handles import + landed price.

---

## 6. Data model additions

- `purchase_sources` (global reference): key, name, type (`api` | `punchout`), regions, marketplace_currency, logo, docs_url. Seed rows: amazon_business_us, grainger_us, rs_uk, plus the existing API adapters.
- `workspace_purchase_sources` (tenant): which sources a workspace has enabled + connection state (credentials/PunchOut endpoint + ShipTo id + shared-secret ref). Secrets stored server-side only.
- `punchout_sessions` (tenant): sourcing_request_id, source key, session token, status (open/returned/expired), started_at.
- `punchout_carts` (tenant): session_id, raw cXML/parsed lines (description, sku, qty, unit_price, currency), returned_at.
- `sourcing_request_items` already carries `best_distributor`, `best_price`, `converted_unit_price`, `item_status` — extend `item_status` with `punchout_cart` and add a `source` column so a line records where its price came from.

RLS: all tenant tables member-scoped; source credentials/secrets never leave the server.

---

## 7. Open decisions (need your call before build)

1. **Who holds the source account?** Two models:
   - **Wekbench-master:** Wekbench holds the Amazon Business / Grainger / RS accounts and resells to buyers (buyers never need their own). Simpler for buyers; Wekbench is the merchant of record; margin lives here.
   - **Buyer-connected:** each buyer connects *their own* business account (BYO). No reselling; Wekbench is the tooling. Less liability, but every buyer must have (and be admin of) an Amazon Business account — unrealistic for most Ghana SMEs.
   - *Recommendation:* **Wekbench-master** for the concierge model — it's the GollyExpress promise.
2. **Forwarder leg:** integrate a forwarder's ShipTo + freight rates (MyUS-type, or a Wekbench US/UK address) now, or keep freight as the % estimate for v1?
3. **Embed vs popup** for the PunchOut session (embedded panel is nicer but some suppliers behave better in a popup).
4. **Order path after cart return:** auto-place the supplier order via PunchOut Order Request (cXML PO back to Amazon), or hold as a Wekbench order the ops team places? (Auto-PO needs the level-2 PunchOut PO integration + payment on the source account.)

---

## 8. Pilot recommendation & phasing

**Pilot: Amazon Business PunchOut** — biggest catalogue, best-documented, self-configurable by an Amazon Business admin, embeddable session, and it's the source most aligned with "shop a familiar site, priced landed."

- **Phase 1 — framework + selector:** `purchase_sources` + `workspace_purchase_sources` + a "Buy from" selector on the sourcing request. API sources price as today; punchout sources show a "Shop on {source}" button (stubbed).
- **Phase 2 — Amazon Business PunchOut (level 1):** `PunchOutSetupRequest` → embedded session → parse returned `PunchOutOrderMessage` cart → land the lines into the request → landed cost → create a Wekbench order (ops places the actual Amazon order). Requires a Wekbench Amazon Business account + ShipTo (forwarder).
- **Phase 3 — auto-PO (level 2):** send the cXML PO back to Amazon to place the order automatically; wire the forwarder's real freight into landed cost.
- **Phase 4 — add Grainger + RS** punchout connectors on the same framework.

---

## 9. Honest constraints

- **Access is the gate, not code.** Amazon Business account (admin), Grainger account rep + 4–6 week setup, RS eProcurement onboarding. None instant.
- **Region:** all are US/UK marketplaces → forwarder leg to Ghana is mandatory; treat it as part of landed cost.
- **Legal:** official PunchOut/API only — no scraping, no raw iframing of retail sites (blocked by X-Frame-Options anyway).
- **Merchant-of-record & payment:** the Wekbench-master model means Wekbench pays the source and collects landed from the buyer — a real financial/operational commitment, not just an integration.
