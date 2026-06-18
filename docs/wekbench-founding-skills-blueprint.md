# Wekbench — Founding-Team Skills Blueprint
### The "best-of-the-best" experience profile for each role, written as the spec for building them as AI agents

This is the operator's-eye view of what it actually takes to turn Wekbench from a
working prototype into a multi-million-dollar business. For each role: what they
own, the deep skills that separate a $10M-grade operator from an average one, how
the best ones *think*, how it applies specifically to Wekbench, and how to encode
the role as an AI agent (inputs → outputs → decisions → guardrails).

Wekbench's reality shapes every role: a **B2B procurement platform** (RFQ → quote
→ source → order → deliver → invoice → collect) for **Ghana/Africa**, denominated
in **GH₵**, dealing in **electronics / IT / industrial** goods that are largely
**imported** (FX risk, lead times, duties), sold to **institutions** where the
buyer ≠ the payer, and where **cash collection (AR)** is as hard as the sale. A
million-dollar business here is won or lost on **margin discipline, fulfilment
reliability, and collecting the cash** — not on features.

---

## 0. How the roles compound (read this first)

A business this kind only reaches eight figures when the roles form a loop, not a
list:

> **BD** opens distributor + institutional channels → **Sales** converts them with
> trustworthy quotes → the **Product/Eng** machine makes quoting fast and accurate
> → the **Domain/Ops** brain sources at the right cost and lands the goods →
> **Finance** protects margin and collects the cash → **Data** tells everyone what's
> actually working → **QA/Security** keeps trust intact so buyers wire money → and
> that trust + data lets **BD/Sales** open bigger accounts. Repeat.

The leverage points unique to Wekbench: **(a) quote speed × accuracy**, **(b)
landed-cost truth** (FX + duty + freight), **(c) AR collection**, **(d) buyer
trust**. Every role below is graded on how much it moves those four.

---

## 1. Software Engineers

Don't think of this as one role. A real venture needs four engineering archetypes,
and the founding hire must be able to *flex across all of them* before you can
afford to specialise.

**a) The Staff / Founding Product Engineer (most important early)**
- **Mandate:** ship the smallest thing that moves a business metric, weekly, without
  creating debt that compounds.
- **Elite skills:** ruthless scoping; reads the whole stack (DB → API → UI) and
  fixes at the right layer; designs data models that won't need rewriting in 18
  months; instruments before optimising; writes code a teammate (or an AI agent)
  can extend safely. Knows when *not* to build (buy/integrate/manual-first).
- **How the best think:** "What's the cheapest experiment that produces a real
  signal?" They treat the schema as the product's spine and guard it. They ship
  behind the grain of the framework, not against it.
- **In Wekbench:** owns the RFQ→quote→order→invoice spine, the sourcing-adapter
  pattern, FX correctness, RLS/multi-tenancy. The reason a 5-second accurate quote
  is possible.
- **Best-of-best signal:** their migrations and module boundaries are still serving
  the business two years later; incidents are rare and shallow.

**b) The Platform / Infrastructure Engineer**
- **Mandate:** reliability, cost, security posture, CI/CD, observability, scaling.
- **Elite skills:** designs for failure (idempotency, retries, queues); keeps
  multi-tenant isolation airtight; controls cloud + per-tenant cost; sets up the
  scheduled jobs, secrets, backups, and the "what broke and why" tooling.
- **In Wekbench:** RLS that never leaks one workspace's data to another, the cron
  AR jobs, email/webhook integrations, FX/source-API resilience, zero-downtime
  deploys. The buyer wires money because nothing flaky ever happened to them.

**c) The Integrations / Data Engineer**
- **Mandate:** make external worlds (Nexar, OEMsecrets, Stock in the Channel,
  Terminal Africa, Odoo, email, payments) behave like one clean internal model.
- **Elite skills:** adapter/anti-corruption-layer thinking, schema mapping, rate
  limits, caching, reconciliation, idempotent ingestion, graceful degradation.
- **In Wekbench:** the sourcing router + provider adapters, the Odoo import, FX
  feeds, future payment/SMTP. This is *the* moat skill for a procurement platform —
  data plumbing that competitors can't easily replicate.

**d) The QA-minded engineer / SET** — covered in §4.

**As AI agents:** a *Staff Engineer agent* (scopes, designs schema/migrations,
implements, self-reviews, writes tests), a *Platform agent* (audits RLS, reliability,
cost, secrets, scheduled jobs), an *Integrations agent* (reads an API spec → emits a
conformant adapter + cache + tests). Guardrails: never weaken tenant isolation,
never store secrets in code, always produce a migration + a test, always typecheck.

---

## 2. High-Level Product Developers (Head of Product / Principal PM)

- **Mandate:** decide *what* to build and *why now*, so engineering effort converts
  to revenue and retention — not motion.
- **Elite skills:** problem framing (separating the symptom from the job-to-be-done);
  opportunity sizing; sequencing (the order that compounds); writing crisp specs
  with explicit non-goals and success metrics; killing features; saying "no" to
  the loudest customer in favour of the most valuable pattern; pricing/packaging
  instinct; reading qualitative + quantitative signal together.
- **How the best think:** in **bets and leverage**, not features. "If this works,
  what does it unlock? If it fails, what did we learn for cheap?" They obsess over
  the *activation* and *retention* moments, not the demo. They treat the roadmap as
  a thesis about where the money is.
- **In Wekbench:** the call that quote-speed-and-accuracy is the wedge; that AR
  collection is a first-class product not an afterthought; that buyer trust (public
  acceptance, tracking, signed POs) is worth more than another sourcing provider.
  Decides Now/Next/Later and defends margin-protecting features over vanity ones.
- **Best-of-best signal:** a roadmap where each shipped thing visibly moved one of
  the four leverage points; almost nothing shipped that nobody used.
- **As an AI agent:** ingests usage data, support/sales notes, the order/AR data,
  competitor moves → produces problem briefs, prioritised Now/Next/Later with
  rationale and success metrics, and tight specs (goals, non-goals, acceptance
  criteria). Guardrail: every proposal names the metric it moves and the cheapest
  way to validate it before a full build.

---

## 3. Product Design / UX (one of "all those people" — under-rated, decisive here)

- **Mandate:** make a complex domain (procurement, FX, AR) feel obvious and
  trustworthy to a busy, non-technical institutional buyer and a stressed reseller.
- **Elite skills:** information architecture for dense workflows; reducing clicks on
  the money-path (quote build, accept, pay); error/empty/loading states that build
  confidence; accessibility; designing the *buyer-facing* surfaces (public quote,
  tracking, statements) to look credible enough that a CFO will wire money.
- **In Wekbench:** the difference between a quote builder a salesperson loves and
  one they abandon for Excel; a public acceptance page a buyer trusts; a dashboard
  an owner reads in 10 seconds.
- **As an AI agent:** critiques flows against heuristics, proposes copy/IA fixes,
  generates UX copy and empty/error states, runs accessibility checks. Guardrail:
  optimise the revenue path (quote→accept→pay) above all else.

---

## 4. Product Testers & QA / Test Engineering

- **Mandate:** protect trust and velocity simultaneously — ship fast *without*
  shipping the bug that loses a buyer or mis-prices a quote.
- **Elite skills:** thinks in **risk**, not test count; maps the product to its
  critical user journeys and covers the money-path first; exploratory testing that
  finds the gaps specs miss; test automation (E2E/agentic, like the Momentic setup)
  that's maintainable; release management, regression strategy, and the discipline
  to reproduce + isolate before "fixing". Distinguishes a *broken flow* from a
  *badly designed* one and routes each correctly.
- **How the best think:** "What would have to be true for this to fail in front of a
  paying customer?" They test the seams: FX edge cases, partial deliveries, AR
  rounding, multi-tenant leakage, the buyer-facing pages on a bad network.
- **In Wekbench:** the agent that catches a quote total that's off by a rounding
  cedi, a GBP→GHS conversion that silently used a stale rate, an RLS hole, a blank
  deploy. The smoke test guarding every release is the floor, not the ceiling.
- **Best-of-best signal:** regressions on the money-path approach zero; the team
  ships *faster* because the safety net is trusted.
- **As an AI agent:** two agents really — a *QA Strategy agent* (maps journeys →
  risk → a prioritised test plan; reviews diffs for what could break) and a *Test
  Automation agent* (authors/maintains E2E tests, triages failures, distinguishes
  product bug vs flaky test vs design gap). Guardrail: the money-path (pricing, FX,
  AR, tenant isolation, buyer-facing pages) is always covered first.

---

## 5. Business Development Managers

- **Mandate:** build the **supply and demand channels** that make the marketplace
  work — distributor/vendor relationships on one side, institutional and reseller
  demand on the other — and structure deals that are durable, not one-off.
- **Elite skills:** relationship capital with distributors and vendors (better cost,
  credit terms, stock visibility); channel strategy; partnership structuring;
  understanding institutional procurement cycles (tenders, frameworks, fiscal
  years); negotiation; reading where the margin and the volume actually sit; opening
  doors Sales then walks through. In Africa specifically: navigating import/forex
  realities, payment terms, and trust networks.
- **How the best think:** in **ecosystems and leverage** — "which one relationship
  unlocks 50 downstream deals?" They trade in credibility and reciprocity, and they
  design partnerships where Wekbench becomes infrastructure others depend on.
- **In Wekbench:** signs the distributor feed that makes IT sourcing cheaper than
  competitors; lands the framework agreement with a bank/NGO/government body that's
  worth dozens of orders; negotiates supplier credit that eases the cash-flow crunch
  of imports. Turns "we have a tool" into "we have a channel."
- **Best-of-best signal:** a pipeline of partnerships where each materially lowers
  cost, raises trust, or opens a buyer segment — and they compound.
- **As an AI agent:** researches and profiles target distributors/institutions,
  drafts partnership outreach and deal structures, maps the procurement cycle of a
  target, prepares negotiation briefs (BATNA, terms, leverage), maintains a channel
  map. Guardrail: every proposed partnership is scored on cost/trust/segment impact;
  no commitments — it preps the human to close.

---

## 6. Sales (AE / Sales Engineer / Account Management)

- **Mandate:** convert opportunities into won, *collectible*, repeatable revenue —
  and expand accounts over time.
- **Elite skills (the trio):**
  - **Account Executive:** qualification (MEDDIC-style — who's the economic buyer,
    what's the pain, what's the metric), discovery, multi-threading an institution,
    handling procurement/legal, closing without discounting away the margin.
  - **Sales Engineer:** translates the buyer's messy requirement into an accurate,
    trustworthy quote fast; defends the technical/sourcing choices; makes the
    product the obvious answer in a live demo.
  - **Account Manager / Success-adjacent:** renewals, repeat orders, expansion;
    knows the buyer's calendar and budget; turns one order into a standing supplier
    relationship.
- **How the best think:** in **the buyer's outcome and the buyer's risk**, not the
  feature. They sell certainty (right goods, on time, fair price, clean paperwork) —
  which in this market is the actual product. They protect margin and qualify *out*
  fast.
- **In Wekbench:** the rep who uses the catalogue + sourcing to turn an RFQ into a
  same-day, margin-correct quote a buyer can accept and e-sign; who knows the AP
  contact differs from the buyer and gets the PO and the payment terms right up
  front; who expands a one-off toner order into the account's standing supplier.
- **Best-of-best signal:** high win-rate at protected margin, short cycle, low DSO
  on their accounts, and net-revenue-retention > 100%.
- **As AI agents:** an *AE agent* (qualifies leads, drafts discovery questions,
  builds account plans, preps objection handling), a *Sales-Engineer agent* (turns a
  raw RFQ into a sourced, priced, margin-checked draft quote), an *Account-Manager
  agent* (flags reorder timing, expansion, at-risk accounts). Guardrails: never
  below the margin floor; always capture economic buyer + AP contact + terms; hand
  the human a ready-to-send artifact, don't auto-send.

---

## 7. The roles people forget — but a multi-million business cannot

**a) Procurement & Supply-Chain Domain Expert (Wekbench's true differentiator).**
The person who actually knows how sourcing, importing, duties, freight, lead times,
landed cost, and distributor behaviour work in this market. This domain brain is
what makes the software *right* instead of merely functional. As an agent: validates
that quotes reflect real landed cost (FX + duty + freight + clearing), flags
unrealistic lead times, suggests alternates, encodes the rules of the trade.

**b) Finance / Pricing / Revenue Operations.** Margin policy, FX hedging instinct,
unit economics, cash-flow under import lead times, the AR collection engine, pricing
& discounting guardrails. In a business that pays for goods before it gets paid,
**this role decides whether you survive.** As an agent: monitors margin and DSO,
models FX exposure, enforces pricing guardrails, runs the AR aging + reminder cadence
(we've started this), flags accounts heading to bad debt.

**c) Customer Success / Implementation.** Onboarding a reseller or institution so
they actually adopt; turning a signup into a habit; reducing churn. As an agent:
onboarding checklists, health scoring, proactive nudges.

**d) Data & Analytics.** The single source of truth on what's working — win rates by
segment, margin by category, sourcing-provider accuracy, DSO trends, cohort
retention. As an agent: turns raw order/AR/quote data into the weekly truth and
surfaces the non-obvious pattern.

**e) Security, Trust & Compliance.** Buyers wire real money and share financial
data; one breach or leak ends the business. Multi-tenant isolation, data handling,
auth, payment-data hygiene, and the credibility signals (terms, privacy, reliability)
that let a CFO trust you. As an agent: continuous RLS/security review, dependency &
secret hygiene, compliance checklists.

**f) Growth / Marketing.** Demand generation, positioning ("the trustworthy way for
African institutions to buy IT/industrial goods"), content, channel marketing to
resellers. As an agent: positioning, campaign plans, content drafting, SEO.

**g) The Operator / CEO layer.** The orchestration: which bet, which hire, which
market, what story to investors, how the loop in §0 is tuned each quarter. The agents
above are the team; this layer is the conductor — and, increasingly, *you + me*.

---

## 8. The honest hierarchy of leverage (where to invest first)

For Wekbench specifically, ranked by impact-per-unit-effort toward the first
several million in revenue:

1. **Procurement Domain Expert + Sales Engineer** — accurate, fast, margin-correct
   quotes are the wedge. Get this right and everything downstream gets easier.
2. **Finance / RevOps (margin + AR)** — protect and collect the money, or growth
   kills you.
3. **Staff/Platform Engineering + QA** — make it fast, reliable, trusted; ship
   without breaking the money-path.
4. **BD (channel/supply)** — cheaper cost + bigger demand doors compound margin and
   volume.
5. **Product leadership** — keep the bets pointed at the four leverage points.
6. **Success, Data, Security, Growth, Design** — the connective tissue that turns a
   product into a durable company.

---

## 9. From this blueprint to AI agents (the next step)

Each role above maps to an agent defined by four things:
- **Inputs** (the context/data it reads),
- **Outputs** (the concrete artifacts it produces),
- **Decisions it's trusted to make** vs. **escalates to a human**,
- **Guardrails** (the lines it never crosses).

Suggested build order for the agents (mirrors §8): start where the money is
decided — **Sales-Engineer/Quote agent** and **Procurement-Domain agent**, then
**Finance/RevOps agent**, then **Staff-Engineer** and **QA** agents to keep the
machine shipping right, then **BD**, **Product**, and the connective-tissue agents.

Each agent should be built to: read real Wekbench data, produce a reviewable
artifact (never an irreversible action), explain its reasoning, and stay inside its
guardrails — so that what ships has, in effect, been pressure-tested by an
experienced operator before it reaches a customer.
