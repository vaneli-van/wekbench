# Wekbench — Product Audit & Fault Log

A product-manager-style end-to-end review of the current build, grounded in the
actual code and database. Findings are prioritised:

- **P0 — Blocker:** breaks a core flow, loses data, or blocks real multi-user use.
- **P1 — Major:** wrong/misleading behaviour, dead-ends, or a tab that looks done but isn't.
- **P2 — Minor/Polish:** cosmetic, messaging, or "known follow-on" items.

What's genuinely working (real, DB-backed): Inbox, AI Extractions, Review Queue,
Quotes (pipeline + builder), live Sourcing (OEMsecrets), Orders + public Tracking,
Suppliers, Catalog, Settings, Dashboard activity feed, and the live FX card.

---

## P0 — Blockers

### 1. The app only works for the workspace **owner**
Every server function resolves the workspace with `workspaces.owner_id = auth.uid()`,
and all RLS policies read "Workspace **owner** manages…". A second user invited to the
same workspace would get *No workspace found* or empty data and could not see quotes,
orders, RFQs, etc.
- **Impact:** Wekbench is effectively single-user per workspace today. Any "invite a
  teammate" expectation fails silently.
- **Where:** `*.functions.ts` (`resolveWorkspace`/`owner_id` lookups), all RLS policies.
- **Fix:** Introduce a `workspace_members` table (or use the existing `user_roles`) and
  change RLS + workspace resolution to "user is a **member** of the workspace."

### 2. Invoices tab is non-functional and has dead links
There is no `invoices` table; the page is mock. Its rows link to `/orders/$id` using
mock invoice/order ids, which the real Orders route now rejects as invalid UUIDs →
"Order not found."
- **Impact:** A whole top-level tab looks real but does nothing, and its links 404.
- **Where:** `src/routes/_app.invoices.index.tsx`, `_app.invoices.$id.tsx`.
- **Fix:** Either build a real `invoices` table (generated from accepted orders) or
  clearly mark the tab "Coming soon" and remove the broken links.

---

## P1 — Major

### 3. Sourced cost currency is never converted (FX gap in the money path)
The sourcing flow writes `unit_cost` in the **offer's currency** (usually USD) onto
quote lines, but quotes are denominated in **GH₵**. Margin and totals are then computed
across mixed currencies with no conversion.
- **Impact:** Quote totals and margins are silently wrong whenever a sourced (USD) cost
  is applied to a cedi quote. This is a correctness bug, not cosmetic.
- **Where:** `applyOfferToLine` (`quotes.functions.ts`), `recomputeQuoteTotals`.
- **Fix:** Convert the offer price to the quote currency at apply-time using the same FX
  source as `/api/fx`; store the FX rate + original currency on the line for audit.

### 4. Fragmented buyer model — no single source of truth
"Buyer" exists in four disconnected forms: RFQ fields (`buyer_name/email/company`),
`quotes.buyer_name`, the **mock** Buyers page (`lib/data`), and **session-only** buyers
in the New Quote dialog. "Create new buyer" persists nowhere and links to nothing.
- **Impact:** Buyers can't be reused, reported on, or tied to their RFQs/quotes/orders;
  the Buyers tab is decorative.
- **Where:** `_app.buyers.tsx`, `new-quote-dialog.tsx`, `lib/session-buyers.ts`, quotes/rfqs.
- **Fix:** A real `buyers` table; reference `buyer_id` from rfqs/quotes/orders; wire the
  Buyers page and the New Quote picker to it.

### 5. Product Search tab is mock while real sourcing exists elsewhere
The dedicated **Product Search** tab runs on mock `productMatches`/`suppliers`, even
though the real multi-provider sourcing router is already built and live (it currently
only surfaces inside the quote builder and the Integrations test card).
- **Impact:** The most natural home for sourcing is fake; users won't find the real feature.
- **Where:** `_app.product-search.tsx` vs `sourcing.functions.ts`.
- **Fix:** Point Product Search at `routePreview`/the router and the `provider_offers` cache.

### 6. Dashboard headline numbers are hardcoded
KPI strip ("Open RFQs 4", "Quotes awaiting 3", "Won this month GH₵94.2M", "Orders in
transit 2") and the Quote-pipeline summary counts/values are static literals; "Top buyers"
comes from mock buyers.
- **Impact:** The first screen a user sees presents fake metrics — undermines trust in
  everything else that *is* real.
- **Where:** `_app.dashboard.tsx` (`kpis`, `pipeline`, `topBuyers`).
- **Fix:** Aggregate from real tables (counts of open rfqs, sent quotes, won quotes this
  month, in-transit orders; pipeline counts by `quotes.stage`).

---

## P2 — Minor / Polish

### 7. Accepting a quote gives no feedback that an order was created
`Mark Accepted` silently creates an order behind the scenes — no toast, no link to the
new order/tracking. Users won't know fulfilment started.
- **Fix:** On accept, toast "Order ORD-… created" with a link to `/orders/$id`.

### 8. Dashboard pipeline links don't filter
Pipeline segments link to `/quotes?stage=X`, but `/quotes` ignores the `stage` query
param, so the board isn't pre-filtered.
- **Fix:** Read `?stage` in `_app.quotes.tsx` and apply it as a board filter.

### 9. Orders carry no itemised contents
Orders store a single `description` string; the buyer tracking page can no longer show
the per-line item list the old mock had. Quote line items aren't copied to the order.
- **Fix:** Copy `quote_line_items` → an `order_items` table on creation; show them on `/track`.

### 10. Sourcing UX rough edges
- Nexar shows the raw "part limit of 0" error in the offer drawer until a plan is bought
  — should render a friendly "Nexar plan not active" state.
- IT/industrial lines return "no offers / manual" with no explanation to the user.
- Carrier tracking is **manual entry only** (the carrier-API adapter is still to build).

### 11. Still-mock tabs: Documents, Reports, Email Capture
Functional-looking but static. Either wire to real data or label clearly.

### 12. Validation & robustness
Manual order / new quote / add-event forms do minimal validation (e.g., value field not
constrained to numeric). No automated tests exist. Server code leans on `as any` casts.

### 13. Branding
The visible logo (`wekbench-logo.png`) still reads lowercase "wekbench" even though all
display text is now "Wekbench." Needs an updated logo image or a text wordmark.

### 14. Security notes (low risk, worth tracking)
- `get_tracking` is anon-callable by token (by design) but unthrottled — fine given long
  random tokens; consider rate-limiting if abused.
- RLS is owner-scoped (see P0 #1) — also a security-surface simplification to revisit.

---

## Suggested fix order

1. **#1 workspace membership** (unblocks real multi-user) and **#3 FX in pricing**
   (money correctness) — these are the two that make the app *trustworthy*.
2. **#6 real dashboard metrics** and **#2 invoices** (kill the most visible fakery/dead links).
3. **#4 buyers** and **#5 product search** (consolidate the half-built real features).
4. Sweep the P2 polish list per tab.

> Note: a live black-box pass (e.g., via the Claude-in-Chrome agent or a tool like
> QA.tech / TestSprite) would add runtime-only findings — visual glitches, focus/keyboard
> issues, mobile breakpoints — that a code audit can't see. Recommended as a second pass.
