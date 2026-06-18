# Wekbench — The AI Business-Operating Agent Roster (Layer B)
### The full AI workforce that BUILDS, SELLS, and RUNS Wekbench as a company

This is **Layer B**: every agent that *owns Wekbench as a business* — the team that
builds the product, sells it to other companies, and runs the company. It is
organized as a real company org, in three divisions:

- **Division I — Build & Product** (they make the product)
- **Division II — Go-To-Market & Revenue** (they sell it and keep customers)
- **Division III — Run-the-Company** (they steer the business)

> **Layer A vs Layer B — the one distinction that matters.**
> *Layer A* = features that run **inside the shipped product, for your customers**
> (the customer's quoting engine, sourcing, FX, AR). They are capabilities you sell.
> *Layer B (this whole doc)* = **Wekbench-the-company's own AI staff** — including the
> engineers and designers who *build* those Layer-A features. Building the product is
> a Layer-B job; the built feature is Layer A. The engineer is your employee; the
> quote button is your product.

**Who Wekbench sells to:** procurement-heavy companies in Ghana / West Africa — IT &
electronics resellers, industrial-supply firms, distributors, and suppliers to banks,
NGOs, government, schools, and enterprises (companies like Western Premium). The buyer
is usually an MD, Operations/Procurement Director, or Finance lead.

**Operating rule for every agent:** it reads real data, produces a **reviewable
artifact**, explains its reasoning, and **never deploys, sends, publishes, signs, or
moves money** without a human. Agents prepare the move; a human commits it.

---

## The company at a glance

**Division I — Build & Product**

| # | Agent | One-line job |
|---|-------|--------------|
| 1 | Product Lead / PM Agent | Decide what to build next and why; write the specs |
| 2 | Product Engineer Agent | Scope → schema → implement → self-review the product spine |
| 3 | Integrations Engineer Agent | Turn external APIs (sourcing, FX, payments) into clean adapters |
| 4 | Platform / DevOps Agent | Reliability, deploys, scaling, cost, infrastructure |
| 5 | Product Designer / UX Agent | Make the workflow obvious and the buyer-facing pages trustworthy |
| 6 | QA / Test Agent | Guard the money-path; author + triage automated tests |
| 7 | Data / Analytics Agent | The weekly truth — usage, funnel, margin, DSO, what's working |
| 8 | Security / Trust Agent | RLS, secrets, data handling, compliance so buyers trust you |

**Division II — Go-To-Market & Revenue**

| # | Agent | One-line job |
|---|-------|--------------|
| 9 | Market Intelligence / ICP Agent | Define the ideal customer; build & rank the target list |
| 10 | Prospecting / SDR Agent | Research targets, find the decision-maker, draft outreach, book demos |
| 11 | Account Executive Agent | Discovery, pitch, objections, negotiate, close the subscription |
| 12 | Solutions / Sales-Engineer Agent | Map Wekbench to their workflow, scope migration, run demos |
| 13 | Onboarding / Implementation Agent | Set up the customer, import their data, train to first value |
| 14 | Customer Success / Account Mgmt Agent | Drive adoption, renew, upsell, catch churn |
| 15 | Marketing / Demand-Gen Agent | Positioning, content, campaigns, inbound leads |
| 16 | Partnerships / Channel Agent | Distributor, ERP, association deals to refer/resell Wekbench |

**Division III — Run-the-Company**

| # | Agent | One-line job |
|---|-------|--------------|
| 17 | Revenue-Ops / Strategy Agent | Pricing, pipeline analytics, forecasting, Wekbench's own finances |
| 18 | Founder / Orchestration layer | Strategy, segment choice, fundraising, tunes the whole loop (you + me) |

---

## Division I — Build & Product (the team that makes the product)

### 1. Product Lead / PM Agent — *the navigator*
Reads usage, sales notes, support, and order/AR data to decide what to build next and
why now; sequences the roadmap around the things that drive revenue and retention;
writes tight specs (goals, non-goals, success metrics); kills low-value work.
**Output:** prioritised Now/Next/Later + specs. **Why it matters:** keeps engineering
effort aimed at revenue, not motion.

### 2. Product Engineer Agent — *the builder*
Takes a spec, scopes it to the smallest valuable slice, designs the schema +
migration, implements across DB→API→UI, writes tests, and self-reviews — without
weakening tenant isolation or piling up debt. **Output:** a reviewable code change +
migration + tests, typechecked. **Why it matters:** converts decisions into shipped
product, weekly.

### 3. Integrations Engineer Agent — *the moat-builder*
Reads an external API spec (a new sourcing provider, a payment gateway, an SMTP/email
service, an Odoo export) and emits a conformant adapter with caching, rate limits,
idempotent ingestion, and graceful degradation. **Output:** a tested adapter +
reconciliation notes. **Why it matters:** every clean integration is data/price
plumbing competitors can't easily copy.

### 4. Platform / DevOps Agent — *the reliability layer*
Owns deploys, uptime, scaling, cloud cost, backups, secrets, scheduled jobs, and the
"what broke and why" tooling. Designs for failure (idempotency, retries, queues).
**Output:** infra changes, reliability + cost reports, incident runbooks. **Why it
matters:** buyers wire real money — nothing flaky can ever happen to them.

### 5. Product Designer / UX Agent — *the clarity layer*
Critiques flows against usability heuristics, optimises the core workflow (quote →
accept → pay), writes UX copy and empty/error/loading states, and makes buyer-facing
surfaces (public quote, tracking, statements) look credible enough that a CFO trusts
them. **Output:** flow critiques, copy, design specs. **Why it matters:** turns a
powerful-but-confusing tool into one customers actually adopt.

### 6. QA / Test Agent — *the trust guard*
Maps the product to its critical journeys, covers the money-path first (pricing, FX,
AR rounding, tenant isolation, buyer-facing pages), authors and maintains the
automated E2E suite (the Momentic setup), and triages failures — real bug vs flaky
test vs design gap. **Output:** a risk-ranked test plan, new tests, triaged failure
reports. **Why it matters:** lets the team ship fast without the bug that loses a
paying customer.

### 7. Data / Analytics Agent — *the truth-teller*
Turns raw product + sales + finance data into the weekly scorecard — activation,
feature usage, funnel conversion, win rate by segment, margin, DSO, retention — and
surfaces the non-obvious pattern. **Output:** a weekly truth report + ad-hoc analysis.
**Why it matters:** every other agent and human makes better calls because this one
says what's actually working.

### 8. Security / Trust Agent — *the floor*
Continuously reviews RLS / multi-tenant isolation, secret + dependency hygiene, auth,
and payment-data handling; maintains the compliance + credibility checklist.
**Output:** security findings + a trust-posture report. **Why it matters:** customers
share financial data — one leak ends the company.

---

## Division II — Go-To-Market & Revenue (the team that sells it)

### 9. Market Intelligence / ICP Agent — *who do we sell to*
Defines the Ideal Customer Profile and keeps a live, ranked target-account list; sizes
the market; profiles segments; finds "why now" signals (a company winning a tender,
importing at volume, hiring procurement staff). **Output:** a ranked target list with
the reason to act on each. **Sells by:** pointing every downstream agent at the right
companies.

### 10. Prospecting / SDR Agent — *get the first meeting*
Researches each account, finds the real decision-maker (MD, Ops/Procurement Director,
Finance lead), drafts personalized outreach across email, LinkedIn, and **WhatsApp**
(which matters here), runs the follow-up cadence, and qualifies interest. **Output:**
researched contacts + outreach drafts + a follow-up sequence (you send). **Sells by:**
filling the calendar with qualified demos.

### 11. Account Executive Agent — *run and close the deal*
Runs structured discovery (economic buyer, the pain — slow quotes? lost margin? bad
debt? — the metric), qualifies in/out fast, builds the ROI case in *their* numbers,
handles objections, prepares the proposal, and negotiates without giving the product
away. **Output:** account plan, business case, proposal draft, negotiation brief.
**Sells by:** converting interest into committed subscription revenue.

### 12. Solutions / Sales-Engineer Agent — *prove it fits*
Maps Wekbench onto the prospect's actual workflow, scopes their data migration (the
Odoo/Excel import path), prepares and runs the demo with the prospect's *own* sample
data, and answers integration/security/data-ownership questions. **Output:** a
tailored demo script + migration scope + a "how it maps to you" one-pager. **Sells
by:** removing the "but will it work for us?" doubt.

### 13. Onboarding / Implementation Agent — *get them to first value fast*
Provisions the workspace, imports their historical data, configures sourcing
providers, and trains the team to run a real quote/order/invoice in week one.
**Output:** onboarding plan + import checklist + training materials + a
time-to-first-value tracker. **Sells by:** turning a signature into an activated,
sticky customer.

### 14. Customer Success / Account Management Agent — *keep and grow them*
Monitors account health, flags churn risk early, runs reviews, prompts renewals,
spots upsell/expansion, and turns happy customers into reference case studies.
**Output:** health scores, renewal briefs, expansion plays, churn alerts. **Sells
by:** driving net-revenue-retention > 100%.

### 15. Marketing / Demand-Gen Agent — *make companies come to you*
Sharpens positioning ("the trustworthy way for African businesses to run
procurement"), produces content and **case studies** from real wins, plans campaigns,
and routes inbound leads to the SDR Agent. **Output:** positioning, campaign plans,
content drafts, a lead pipeline. **Sells by:** filling the top of the funnel.

### 16. Partnerships / Channel Agent — *sell through others*
Structures referral/reseller deals with distributors, ERP/accounting vendors, banks,
and trade associations who already reach your buyers. **Output:** a partner target map
+ deal structures + outreach. **Sells by:** opening one relationship that delivers
many customers.

---

## Division III — Run-the-Company

### 17. Revenue-Ops / Strategy Agent — *steer the revenue engine*
Designs pricing & packaging, analyses the pipeline (conversion, win rate, cycle
length), forecasts revenue, tracks GTM unit economics (CAC, LTV, payback), and watches
Wekbench's *own* finances and runway. **Output:** pricing recommendations, pipeline +
forecast dashboards, unit-economics reports.

### 18. Founder / Orchestration layer — *the conductor*
The strategy and judgement no single agent should own: which segment to attack first,
which market to expand to, the fundraising narrative, and tuning the loop each quarter.
This is **you + me**, with the seventeen agents as the company.

---

## How it all connects (build feeds sell feeds build)

The **Build division** ships a product that's fast, reliable, and trustworthy → the
**GTM division** sells it to the right companies and keeps them → the **Data Agent**
reports what's converting and what's churning → the **Product Lead Agent** turns that
into the next thing to build → the Build division ships it. **Revenue-Ops** keeps the
economics honest throughout, and the **Founder layer** tunes the whole loop. Each turn
should win customers more cheaply than the last.

---

## Recommended build order (which agents to encode first)

You need *both* a product worth selling and a motion that sells it, so build in
parallel pairs:

1. **Product Engineer Agent** + **QA Agent** — keep shipping the product reliably
   (you're mid-build; this is your current bottleneck).
2. **Market Intelligence / ICP Agent** + **Prospecting / SDR Agent** — start the sales
   motion: know who to sell to and book the first demos.
3. **Account Executive** + **Solutions/Sales-Engineer Agents** — close the first
   paying companies.
4. **Onboarding** + **Customer Success Agents** — keep the customers you win.
5. **Product Lead**, **Data**, **Design**, **Security**, **Platform** — deepen the
   build org as volume grows.
6. **Marketing**, **Partnerships**, **Revenue-Ops** — scale the motion once it converts.

The honest first move: **Product Engineer + QA** (so the product keeps getting better
and doesn't break) running alongside **ICP + SDR** (so you start booking demos with
the right companies). Build and sell at the same time.
