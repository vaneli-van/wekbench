# Wekbench — project state & continuation guide

Read this first when continuing work in a new session. It captures how the
project is wired, what's built, and what's open.

## What it is
Wekbench is a B2B procurement web app (RFQ → quote → sourcing → order → tracking
→ invoice/AR), GH₵-denominated, for electronics/IT/industrial buyers in Ghana.

## Stack & workflow
- **Frontend/server:** TanStack Start (file-based routes in `src/routes/`,
  server fns via `createServerFn`), React Query, runs on Cloudflare Workers.
- **Backend:** Supabase (Postgres + RLS + Auth + Storage) via Lovable Cloud.
- **Working model (important):**
  - Claude edits files in `/Users/van/wekbench`; **the user runs git** in their
    terminal (Claude does not push — committing from the sandbox leaves stale
    `.git` locks). Standard handoff: `git pull --no-rebase --no-edit origin main`
    → `git add … && git commit && git push`.
  - **Lovable also commits to the same GitHub branch** (auto-fixes), so always
    pull before pushing.
  - **DB changes:** applied via Lovable `query_database` AND written as files in
    `supabase/migrations/`. The DB is applied before code is pushed.
  - **Typecheck:** parse-only via `tsc`/`ts.createSourceFile` (no full build).
- **Lovable project id:** `81e2ae0e-1da3-498b-a6b3-3d34c25d2c92`
- **Western Premium workspace id:** `9f2953d5-c4bb-44b7-b44a-36ec052e4e6e`
  (holds the imported real data; owner `samuel@westernpremium.com.gh`).

## What's built
- **Quotes**: real DB-backed quotes, 7-stage pipeline, line items, FX conversion,
  margin; multi-provider **sourcing** (Nexar + OEMsecrets adapters, router,
  cache) with an offer drawer.
- **SITC cloud catalogue (IT hardware)**: instead of SITC's live OAuth API (keys we
  couldn't get), SITC's catalogue feed is hosted in our own DB. Table
  `sitc_catalogue` (global **shared reference data** — authenticated-read RLS, service
  role writes; NOT workspace-scoped by design). A scheduled GitHub Action
  (`.github/workflows/sitc-sync.yml`) pulls `Products.csv` (~117MB) over FTP and
  `scripts/sync-sitc.mjs` stream-parses + batch-upserts it. The `stockinthechannel`
  adapter now **queries this table** (sku/name search; 1st–5th distributor columns →
  offers) and plugs into the sourcing router like any provider. Migration
  `20260618160000_sitc_catalogue.sql`.
- **Shipping**: courier rate comparison in the quote builder (Terminal Africa
  adapter; freight/Freightos is phase 2). See `docs/shipping-rates-integration-plan.md`.
- **Orders**: real orders + line items, status stepper, public tracking page
  (`/track/$token`), buyer **PO reference + acknowledgement** ("sign & revert"),
  grouped by year on the list.
- **Invoices / Accounts Receivable**: payments ledger, aging view, payment-terms
  presets, invoice PDF, dashboard receivables tile, **reminders to billing/AP
  contact**, **scheduled jobs** (`/api/cron/ar` — auto-overdue + reminder cadence),
  **customer statements** per buyer. See `docs/accounts-receivable-followups.md`.
- **Buyers**: real buyers + contacts + billing email + agreed-price contracts.
- **Documents**: per-order document pack (storage-backed).
- **Public quote acceptance**: `/quote/$token` — buyer reviews, accepts & e-signs;
  acceptance auto-creates the order and **emails the seller** (Resend).
- **Membership/Team**: member-based RLS, invites.
- **Onboarding / activation (freemium funnel)**: signup trigger (`handle_new_user`)
  creates profile + workspace + owner role; `_app` guard routes new users to
  `/onboarding`. Onboarding wizard now ends honestly (the fake "sample data" step was
  removed — it never seeded anything) and **guides straight to the first quote**.
  `/quotes?new=1` deep-links the New Quote dialog open (used by onboarding + the
  dashboard empty-state banner shown when `kpis.totalQuotes === 0`). Activation marker
  `workspaces.first_quote_at` is stamped on first `createQuote` (backfilled for existing
  workspaces) — the supporting metric for the north star **active paid companies**.
- **Dashboard**: real KPIs, pipeline, top buyers, revenue-by-year, receivables;
  first-quote activation banner until the workspace has a quote.
- **Plans / freemium (Phase 1)**: `workspaces.plan` (`starter`|`pro`) +
  `plan_trial_ends_at`. Effective entitlement = pro OR in-trial; one helper
  `getEntitlement()` + `getMyEntitlement` fn drive every gate. New workspaces get a
  14-day Pro trial (column DEFAULT, no trigger change); existing workspaces grandfathered
  to pro. Boundary: Starter = 10 active quotes/mo, 1 seat, 1 basic source, no AR; Pro =
  unlimited + seats + deep sourcing + AR. **Live gates: quote cap** (`createQuote` →
  `UPGRADE_REQUIRED:quotes`), **seats** (`inviteMember` → `:seats`, Starter = 1 user),
  and **sourcing depth** (the sourcing `router` caps Starter to one provider — preferred,
  else highest-priority). Shared protocol in `src/lib/plans.ts`
  (`upgradeError`/`parseUpgrade`/`FEATURE_COPY`); reusable `<UpgradeDialog>` wired into the
  New Quote dialog + Team page; topbar `PlanBadge` (trial countdown / Starter usage).
  and **AR collections** (`sendInvoiceReminder` + `sendBuyerStatement` throw `:ar` on
  Starter via `requireProAr`; the AR cron skips Starter workspaces for reminder emails but
  still auto-overdues for everyone so aging/viewing stays correct and free). Paywall wired
  into New Quote, Team, invoice reminder, and buyer-statement dialogs. `requestUpgrade` fn
  emails the team (best-effort) — **no in-app payment** (founder-led; **Phase 5 =
  billing**, the only remaining piece). All four gates verified zero-impact on current
  workspaces (all grandfathered to pro). See `docs/wekbench-packaging.md`.
- **Data**: 103 real Western Premium sales orders (2024–2026, GH₵9.33M) imported
  with line items + 14 buyers.
- **Testing**: Momentic wired (`momentic.config.yaml`, `.github/workflows/momentic.yml`).
  Passing: `wekbench-smoke.test.yaml`. Needs creds (`WEKBENCH_EMAIL`/`WEKBENCH_PASSWORD`):
  `homepage-to-signin.test.yaml` and `first-quote-activation.test.yaml` (NEW — guards the
  `?new=1` deep-link auto-open + quote creation, i.e. the activation slice).
  Parked: `signup.test.yaml` (end-to-end runs; final landing assertion to tune — note the
  onboarding flow now ends on a "Create your first quote" CTA, so when re-enabled it can be
  extended through to the first quote).

## Secrets the app expects (set in Lovable Cloud → Secrets)
`NEXAR_*`, `OEMSECRETS_API_KEY`, `TERMINAL_AFRICA_API_KEY`, `RESEND_API_KEY`,
`EMAIL_FROM`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and optional `SALES_EMAIL`
(upgrade requests; falls back to `EMAIL_FROM`). The SITC live-OAuth path is retired in
favour of the FTP sync, so `SITC_CLIENT_ID`/`SECRET` are no longer needed.
**GitHub Actions secrets:** `MOMENTIC_API_KEY`, `WEKBENCH_EMAIL`/`WEKBENCH_PASSWORD`
(E2E tests), and for the SITC sync: `SITC_FTP_HOST`, `SITC_FTP_USER`, `SITC_FTP_PASS`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Open follow-ups
- Verify/enable the parked Momentic signup test (check the post-confirm screen).
- Add `WEKBENCH_EMAIL`/`WEKBENCH_PASSWORD` GitHub secrets + wire into the workflow
  so the sign-in test runs in CI.
- Shipping phase 2 (Freightos freight rates).
- AR: customer-statement scheduling, credit notes (see AR followups doc).
- Replace the lowercase wordmark logo asset.
- Wire buyer agreed-contract prices into the quote builder (auto-apply).

## Docs in this repo
- `docs/PROJECT-STATE.md` (this file)
- `docs/accounts-receivable-followups.md`
- `docs/shipping-rates-integration-plan.md`
- `docs/dishrack-workflow-feature-review.md`
- `docs/wekbench-pm-audit.md`
