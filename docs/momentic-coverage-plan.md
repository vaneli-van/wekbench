# Wekbench — full Momentic coverage plan

End-to-end test coverage for the entire application, start to finish, run with Momentic.
Built on the two-tests-per-build convention (`docs/testing-convention.md`): every area
gets a **journey** test (the happy path a user walks) and a **technical** test (the
guarantees underneath — no-login pages, persistence, invalid input, tenant boundaries).

- **Target:** `https://wekbench.com` (production).
- **Runner:** the existing `.github/workflows/momentic.yml` runs the whole `*.test.yaml`
  suite on every push to `main` and every PR, via the `ci` environment.
- **Prerequisite:** a feature must be **published** to `wekbench.com` before its tests can
  pass. Publish the latest build first, or these will (correctly) fail on un-deployed code.

## How to read this

Each row is one test file. Risk tiers drive the build order:

- **P0 — money-path.** Pricing/margin, FX, AR math, tenant isolation, buyer-facing pages.
  Never ship with these red.
- **P1 — core product.** The everyday flows a customer relies on.
- **P2 — secondary.** Supporting pages, settings, reporting, gating polish.

Status legend: ✅ exists · ✏️ exists, extend · ☐ to build.

---

## Wave 1 — P0 money-path (build first)

| Area | journey test | technical test | Notes |
|---|---|---|---|
| **Smoke / shell** | `wekbench-smoke` ✅ — app loads, no error | — | already green |
| **Auth** | `auth.journey` ☐ — sign in → dashboard | `auth.technical` ☐ — wrong password rejected; a protected route (`/quotes`) redirects to `/signin` when logged out; reset-password page renders | extends `homepage-to-signin` ✅ |
| **Quote pricing & margin** | `quote-pricing.journey` ☐ — create quote → add line → set qty/unit price/margin → **total is mathematically correct** | `quote-pricing.technical` ☐ — totals recompute on qty/price/discount change; tax applied; subtotal+tax = total | the core money number |
| **FX correctness** | — | `fx.technical` ☐ — a GBP/USD sourced offer converts to GH₵ with a **fresh, non-zero** rate; provenance shown; never stale/zero | highest-risk seam |
| **Quote accept / e-sign** | `quote-accept.journey` ☐ — buyer opens `/q/<token>` → accept & e-sign → **order is created** | `quote-accept.technical` ☐ — invalid token → "not available"; decline path; no login required; draft quote not exposed | reuses `/q/$token` |
| **Invoices / AR** | `ar.journey` ☐ — open invoice → record a payment → **aging/balance updates** | `ar.technical` ☐ — aging buckets correct; rounding to the cedi; partial payment math; overdue flag | AR math |
| **Tenant isolation** | — | `tenant-isolation.technical` ☐ — signed in as workspace A, a direct URL to workspace B's quote/order/invoice is **denied**; B's share tokens don't leak A's data | **needs a 2nd account/workspace** |

## Wave 2 — P1 core product

| Area | journey test | technical test | Notes |
|---|---|---|---|
| **Onboarding / activation** | `onboarding.journey` ✏️ — sign up → onboarding → first quote | `onboarding.technical` ✅/✏️ — `?new=1` opens New Quote dialog (`first-quote-activation`) | signup needs a **provisioned inbox** (email confirm) |
| **Quotes pipeline** | `quotes-pipeline.journey` ☐ — board loads → move a quote across a stage → filter/search | `quotes-pipeline.technical` ☐ — stage change **persists** on reload; kanban/list toggle | |
| **RFQ → quote** | `rfq-to-quote.journey` ☐ — open an RFQ → generate/open its quote | `rfq-to-quote.technical` ☐ — RFQ detail renders; quote links back to RFQ | |
| **Sourcing offers** | `sourcing.journey` ☐ — quote line → get offers → apply an offer → **price flows to the line** | `sourcing.technical` ☐ — SITC/OEMsecrets lookup returns offers; classifier routes a part vs an IT item; cache | depends on provider APIs |
| **Shipping** | `shipping.journey` ☐ — quote → compare shipping → rate auto-fills from catalogue weight | `shipping.technical` ☐ — chargeable weight = max(actual, volumetric÷5000); no double entry | |
| **Clarification round-trip** | `clarification.journey` ✅ | `clarification.technical` ✅ | built |
| **Orders + PO** | `orders.journey` ☐ — order detail → acknowledge PO → line items | `orders.technical` ☐ — public `/track/<token>` shows status/events; no login | |
| **Buyers + contracts** | `buyers.journey` ☐ — create buyer → add a contract / agreed price | `buyers.technical` ☐ — agreed price applies on a quote line; member scoping | |
| **Catalog** | `catalog.journey` ☐ — add a catalog item → use it in a quote | `catalog.technical` ☐ — category filter/group; unit carries through | |
| **Documents** | `documents.journey` ☐ — open an order → upload to its doc pack | `documents.technical` ☐ — storage access is workspace-scoped; file lists per order | upload needs a fixture file |
| **Team / membership** | `team.journey` ☐ — invite a member, set a role | `team.technical` ☐ — invite claim on login; seat-limit paywall on Starter | |

## Wave 3 — P2 secondary & gating

| Area | journey test | technical test | Notes |
|---|---|---|---|
| **Freemium gating** | — | `gating.technical` ☐ — Starter quote cap → paywall; seat gate; sourcing-depth gate; AR gating | **needs a Starter-plan account** |
| **Dashboard** | `dashboard.journey` ☐ — feeds + RFQ-attention render with data | `dashboard.technical` ☐ — empty-state for a fresh workspace; email-highlights feed | |
| **RFQ inbox / extraction** | `inbox.journey` ☐ — inbox → extraction → review-queue → approve to RFQ | `inbox.technical` ☐ — inbound-email capture | **inbound email needs a provisioned inbox** |
| **Suppliers** | `suppliers.journey` ☐ — add/view a supplier | — | |
| **Product search** | `product-search.journey` ☐ — search returns results | — | provider-dependent |
| **Settings / integrations / reports** | `app-pages.journey` ☐ — each page loads for a signed-in user | — | light smoke across remaining pages |

---

## Test-data & accounts strategy

- **Primary account** (`WEKBENCH_EMAIL` / `WEKBENCH_PASSWORD`): the existing onboarded,
  Pro Western Premium owner. Drives all signed-in journeys.
- **Second workspace** (new secret pair, e.g. `WEKBENCH_EMAIL_B`): required for
  `tenant-isolation.technical`. You provision it once (confirmed + onboarded).
- **Starter-plan account** (new secret pair): required for `gating.technical` so the
  paywalls actually trigger.
- **Provisioned inbox** for `onboarding.journey` (signup) and `inbox.technical` (inbound
  email) — Momentic's `email.create()` so we never hand-create accounts or read a real
  person's mail.
- **Idempotency:** every run uses a unique tag (`"... " + Date.now()`) and creates fresh
  records — never depends on a prior run's leftover state.
- **Shared sign-in:** factor the sign-in steps into a reusable Momentic module
  (`signin.module.yaml`) so all ~30 tests share one block.

## Known limits (can't be 100% browser-driven)

- **Inbound email ingestion** (`/api/public/inbound-email`) — drive via a provisioned
  inbox or a seeded fixture; assert the resulting RFQ/extraction in the UI.
- **Real payment capture** — AR tests record payments through the app UI; no real money
  moves. No live card/bank rails are exercised.
- **Third-party sourcing APIs** (SITC/OEMsecrets/FX provider) — live and rate-limited;
  sourcing tests assert "offers returned + price applied," not exact prices, to stay stable.
- **Pure DB-level guarantees** (RLS edge cases) — pair a quick SQL/DB check alongside the
  browser test where a browser can't observe the boundary.

## Build order (recommended)

1. **Wave 1 (P0)** — 7 files. Gate every release on these.
2. **Wave 2 (P1)** — ~11 areas. The everyday product.
3. **Wave 3 (P2)** — supporting pages + gating polish.

Each wave: author → run against `wekbench.com` → triage failures (real bug vs flaky vs
not-yet-published) → green before moving on. Total target: ~30 test files, all run by CI
on every push.

## Open prerequisites before Wave 1

1. **Publish** the latest build to `wekbench.com` (so clarification, activation, etc. are live).
2. Provision and set GitHub secrets for the **2nd workspace** and a **Starter** account.
3. Confirm Momentic `email.create()` is available on the plan for the signup/inbox tests.
