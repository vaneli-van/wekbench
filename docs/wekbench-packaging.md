# Wekbench — Packaging & Plan Enforcement (Freemium)
### The free/paid boundary and how we enforce it in code

Locked decisions (founder, 2026-06): model = **freemium → paid**; north star =
**active paid companies**; beachhead = **IT & electronics resellers**. This doc turns
that into a concrete plan boundary and an engineering scope to enforce it.

---

## The boundary

| Capability | Starter (free) | Pro (paid) |
|---|---|---|
| Quote builder (FX, margin), buyers, catalog | ✅ | ✅ |
| Orders + public tracking, public quote accept / e-sign | ✅ | ✅ |
| Branded buyer-facing docs | ✅ | ✅ |
| **Active quotes per month** | **10** | Unlimited |
| **Team seats** | **1 user** | Multiple |
| **Sourcing depth** | **1 basic provider** | Full multi-provider fan-out (Nexar / OEMsecrets / SITC) |
| **AR & collections** (reminders, statements, aging automation, cron) | ❌ | ✅ |

**Trial:** every new workspace starts with a **14-day Pro trial**, then settles to
Starter. During the trial, the workspace has full Pro entitlements.

**Why this shape:** the quoting wedge stays free to drive activation (the north-star
feeder); the paywall sits on what compounds once a company is hooked and what
correlates with willingness to pay — getting paid (AR), growing the team (seats), and
sourcing leverage.

---

## Data model (design-first)

Add to `public.workspaces`:
- `plan text NOT NULL DEFAULT 'starter'` — the *paid* plan: `'starter' | 'pro'`.
- `plan_trial_ends_at timestamptz` — when the Pro trial ends (null = no trial).

**Effective entitlement** (the single source of truth used by every gate):
> `isPro = (plan = 'pro') OR (plan_trial_ends_at IS NOT NULL AND now() < plan_trial_ends_at)`

**Backfill:** grandfather existing workspaces (Western Premium et al.) to `plan = 'pro'`
so nothing they rely on (AR, sourcing) breaks. New signups get `plan = 'starter'` +
`plan_trial_ends_at = now() + 14 days` (set in the `handle_new_user` trigger).

No new table → no new RLS; the columns inherit the workspace's existing policies.

---

## Server helper (one place, reused everywhere)

`getEntitlement(supabase, workspaceId) → { plan, isPro, trialEndsAt, inTrial, quotesThisMonth? }`
plus a thin auth-gated `getMyEntitlement` server fn for the UI (plan badge, trial
countdown, paywall state). Gated server functions throw a **structured
`UPGRADE_REQUIRED` error** (with the feature name) that the UI catches to show an
"Upgrade to Pro" prompt — never a raw error.

---

## The four gates (where each lever is enforced)

1. **Quote cap** — in `createQuote`: if `!isPro`, count quotes created in the current
   month for the workspace; at ≥10, throw `UPGRADE_REQUIRED('quotes')`.
2. **Seats** — in `inviteMember`: if `!isPro` and the workspace already has ≥1 member
   (or the invite would exceed 1), throw `UPGRADE_REQUIRED('seats')`.
3. **Sourcing depth** — in the sourcing `router`: if `!isPro`, restrict the providers
   fanned out to a single basic one (full fan-out is Pro).
4. **AR & collections** — gate `sendInvoiceReminder`, `sendBuyerStatement`, and the
   `/api/cron/ar` job to skip non-Pro workspaces; hide/disable the reminder + statement
   UI behind Pro. *(Money-path-adjacent → coordinate the change with the QA agent.)*

---

## Upgrade surface (UI)

- A reusable **paywall dialog** triggered by `UPGRADE_REQUIRED`, naming the feature and
  the benefit.
- A **plan badge + trial countdown** (topbar/settings) — "Pro trial · 9 days left".
- **Billing/checkout is out of scope for this build and founder-led.** Claude does not
  handle payments or financial credentials. The "Upgrade" action initially routes to a
  **request-to-upgrade** flow (flags the workspace / contact us), NOT a card checkout.
  A real payment provider (e.g. **Paystack**, common in Ghana) is a later integration
  the founder sets up; the plan model here is built to flip `plan = 'pro'` once payment
  is confirmed by that provider's webhook.

---

## Phased build (smallest valuable slices)

- **Phase 1 — Foundation + first gate (recommended next):** `plan` + `plan_trial_ends_at`
  columns + trigger update + backfill; `getEntitlement` helper + `getMyEntitlement` fn;
  the **quote-cap gate** in `createQuote`; the reusable `UPGRADE_REQUIRED` error + a
  paywall prompt in the New Quote flow; a plan/trial badge. Proves the whole pattern end
  to end with the clearest upgrade trigger.
- **Phase 2 — Seats gate** (`inviteMember` + Team page prompt).
- **Phase 3 — Sourcing-depth gate** (router caps providers for Starter + a "more sources
  on Pro" hint in the offer drawer).
- **Phase 4 — AR gating** (reminders / statements / cron skip Starter + AR prompts). Done
  with QA because it touches the money-path.
- **Phase 5 — Billing integration** (founder-led; payment provider webhook flips `plan`).

**Non-goals (this stream):** real payment processing, proration, annual billing, coupons.

---

## Test plan (hand to QA per phase)
- Entitlement helper: starter vs pro vs in-trial vs expired-trial returns the right `isPro`.
- Quote cap: 10 succeed on Starter, the 11th returns `UPGRADE_REQUIRED`; Pro/in-trial
  unlimited.
- Tenant isolation: the quote count is scoped to the caller's workspace only.
- Trial expiry: a workspace flips from Pro-entitled to Starter the moment the trial ends.
- (Later phases) seats, sourcing-depth, and AR gates each enforced and reversible on upgrade.
