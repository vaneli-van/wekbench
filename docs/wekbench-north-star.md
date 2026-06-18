# Wekbench — North Star & Holistic Map
### The one shared picture every agent and decision operates against

This is the "brain map" of the whole business — what we're building, for whom, why,
and what success looks like. It sits above the six agents in the `wekbench-team`
plugin: each of them executes *against* this map. Revisit and update it whenever the
strategy moves. (Companion to the on-screen mind map; grounded in `PROJECT-STATE.md`.)

---

## In one sentence
**Wekbench is the operating system for African B2B procurement** — it turns the messy,
WhatsApp-and-Excel way that companies quote, source, fulfil, and get paid for goods into
one fast, accurate, trustworthy system, starting in Ghana.

---

## 1. The Problem (why this exists)
Procurement-heavy companies in Ghana/West Africa run a high-value workflow on tools that
can't carry it: WhatsApp threads, Excel sheets, scattered email, and memory. The result:
- **Slow, error-prone quoting** — days to turn an RFQ into a price; lost deals to speed.
- **Opaque sourcing & landed cost** — true cost (FX + duty + freight + clearing) is
  guessed, so margin leaks silently.
- **Weak fulfilment visibility** — buyers chase status; trust erodes.
- **Painful cash collection** — the payer isn't the buyer; invoices age; DSO balloons.
- **A trust gap** — institutional buyers want credible paper (quotes, POs, tracking,
  statements) that these tools don't produce.

## 2. Who It Serves
**Primary customer:** procurement-heavy companies — IT & electronics resellers,
industrial-supply firms, and distributors — who sell to **institutions** (banks, NGOs,
government, schools, enterprises). Flagship/reference: **Western Premium** (the imported
real book: 103 orders, ~GH₵9.33M, 2024–2026).
**Beachhead — LOCKED:** sell first to **IT & electronics resellers** — the exact profile
of Western Premium, our dogfooded case, and the segment our sourcing (Nexar / OEMsecrets /
Stock in the Channel) already serves best. Win this segment before broadening.
**Key truth that shapes the product:** inside the buying institution, **the person who
buys ≠ the person who pays** — so quoting, approvals, and collections must address both.

## 3. What It Does (the value chain it digitizes)
The end-to-end procurement loop, in one system:
**RFQ → Quote (sourcing + FX + margin) → Order → Track / Deliver → Invoice → Collect (AR).**
Each step replaces a manual, lossy hand-off with something fast, accurate, and auditable.

## 4. The Wedge (why we win)
Four leverage points are where the business is won or lost — every roadmap call is judged
against them:
1. **Quote speed × accuracy** — minutes, not days, and correct.
2. **Landed-cost truth** — honest FX + import cost so margin is real.
3. **AR collection** — getting paid is a first-class product, not an afterthought.
4. **Buyer trust** — credible buyer-facing surfaces (public quote + e-sign, tracking,
   statements) that make a CFO comfortable wiring money.

## 5. Built Today (real, DB-backed — from PROJECT-STATE)
Quotes with a 7-stage pipeline, line items, FX conversion, margin, and multi-provider
**sourcing** (Nexar, OEMsecrets, Stock in the Channel); **shipping** rate comparison;
**orders** with tracking, PO reference + "sign & revert" acknowledgement; **invoices /
AR** with payments ledger, aging, terms, PDF, reminders to the **billing/AP contact**,
scheduled cron jobs, and customer statements; **buyers** with contacts + agreed-price
contracts; per-order **documents**; **public quote acceptance** (e-sign → auto-creates
order → emails seller); **membership/team** with member-based RLS; a real **dashboard**;
**Western Premium's real data** imported; and a **Momentic** test harness. *The core
procurement OS exists and runs on real data.*

## 6. Business Model — **LOCKED: Freemium → paid**
Customers land for **free on quoting** (the wedge: fast, accurate quotes) and convert to
**paid** for the features that compound value — sourcing depth, Accounts Receivable, team
seats, and scale. Implications that now drive everything:
- We must define a clear **free/paid boundary** (what's free, what's the paywall, what
  triggers the upgrade). This is the next packaging decision.
- Adoption is cheap; **conversion and retention are the hard part** — the product must
  make the paid value obvious once a company is hooked on free quoting.
- Self-serve must work end to end: a new company can sign up, get its own workspace, and
  reach its first quote without us.

## 7. North Star — **LOCKED: Active paid companies**
The one number the whole team optimises: **the count of procurement companies actively
paying for and using Wekbench.** Everything ladders up to it, which means we win by:
- **Activation** — a new company reaches first value (first real quote) fast.
- **Conversion** — free companies hit the paywall at a moment the paid value is obvious.
- **Retention** — paying companies keep using it (the money-path stays trustworthy).
*(GMV and won-quote value become supporting metrics, not the headline.)*

## 8. The Path (how we get there)
- **Phase 1 — Dogfood & prove.** Western Premium runs its real operation fully on
  Wekbench; we harden the money-path (margin, FX, AR) until it's trustworthy.
- **Phase 2 — Sell to look-alikes.** ICP → SDR → AE motion lands the first paying
  companies that look like Western Premium.
- **Phase 3 — Scale & deepen.** Channel/partnerships, more verticals/geographies, and
  deeper rails (payments, financing, analytics).

## 9. The Team (how we execute)
The 18-agent AI org (`wekbench-ai-agent-roster.md`); **6 built** and packaged in the
`wekbench-team` plugin: Product Engineer, QA, ICP, SDR, Account Executive,
Solutions/Sales-Engineer. The **orchestration layer (founder + Claude)** owns this map
and tunes the loop. Each agent prepares reviewable work; humans commit irreversible
actions.

## 10. Risks & Open Questions
- **Money correctness** — margin/FX/AR must be provably right (trust dies on one wrong total).
- **Trust & security** — multi-tenant isolation and data handling; buyers wire real money.
- **Cash-flow of imports** — paying suppliers before getting paid; AR collection is existential.
- **Model & price** — unproven willingness-to-pay; see §6.
- **Focus vs spread** — one market/segment deep, or broaden early?
- **Adoption vs dogfood** — does a second company adopt as readily as Western Premium did?

---

## The three decisions — LOCKED (2026-06)
1. **Business model:** Freemium → paid (land on free quoting; charge for sourcing depth,
   AR, seats, scale).
2. **North-star metric:** Active paid companies.
3. **Beachhead segment:** IT & electronics resellers (Western Premium look-alikes).

### What this combination demands next (the through-line)
Because the model is freemium and the metric is *paid* companies, the business now hinges
on a funnel the current product doesn't fully support yet:

> **A new IT-reseller signs up → gets its own workspace → reaches a first real quote
> (activation) → hits a paywall where the paid value is obvious (conversion) → keeps using
> it (retention).**

So the first things to tackle individually, in order:
1. **Self-serve multi-tenant onboarding** — a new company can sign up and get a clean,
   empty workspace and reach a first quote without us. (Today the app is centred on
   Western Premium's workspace; the signup→first-quote path needs to be solid. The parked
   Momentic signup test is a symptom to resolve.)
2. **Define the free/paid boundary** — what's free (quoting) vs paywalled (sourcing depth,
   AR, extra seats), and the upgrade trigger.
3. **Instrument activation/conversion/retention** — so "active paid companies" and the
   funnel that feeds it are actually measured.

Then the ICP/SDR/AE agents go to work on IT-reseller look-alikes, and the Product
Engineer/QA agents harden the funnel above.
