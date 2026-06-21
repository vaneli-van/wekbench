# Wekbench — RFQ Clarification Round-Trip (feature spec)
### The optional buyer-clarification step between RFQ decomposition and quoting

After the RFQ Intelligence ("Bid Engineer") agent decomposes an RFQ and flags the
clarification questions per line, the vendor can curate those questions and send the buyer a
**no-login link** to answer them (and propose quantity/item changes). Answers come back,
the vendor reviews and applies them, then quotes against the confirmed spec. The step is
**optional and non-blocking** — send clarification, skip straight to sourcing, or do both in
parallel. Reuses the exact tokenized public-page pattern from quote-accept
(`get/accept/decline_quote_public`).

## Locked decisions
- **Buyer link:** open tokenized link, no login (fastest response; buyers won't have accounts; long random token + scoped RPC; audited by timestamps). Optional email-OTP can be added later.
- **On response:** answers are **recorded for the vendor to review & apply** — never auto-applied (a technical spec change needs a human).
- **Buyer page scope:** answer each question + free-text comments **and** a light amendment — adjust quantities / add items. Proposed changes are recorded for vendor review, not applied automatically.
- **Optional/non-blocking:** clarification never gates sourcing.

## Data model (member-RLS tables + tokenized public access)
- `quote_clarifications` — id, workspace_id, quote_id, rfq_id, **share_token** (default `c_…`, unique), status (`draft`/`sent`/`answered`/`closed`), buyer_comment, sent_at, answered_at, answered_by, created_at. Member RLS via `is_workspace_member`.
- `clarification_questions` — id, clarification_id, workspace_id, line_no, line_item_id (nullable), question, source (`agent`/`manual`), included (curate toggle), buyer_answer. Member RLS.
- `clarification_changes` — id, clarification_id, workspace_id, kind (`qty`/`add`), line_no, payload jsonb (proposed qty or new-item details), vendor_applied bool. Member RLS. (Powers the light amendment.)

## Public access (SECURITY DEFINER RPCs, granted to anon — mirrors quote-accept)
- `get_clarification_public(token)` → the clarification + included questions + the current line items (read-only) for the buyer page.
- `submit_clarification_public(token, answers jsonb, comment text, changes jsonb)` → records answers, comment, and proposed qty/add changes; sets status `answered`, `answered_at`, `answered_by`. Vendor is emailed on submit (reuse `sendEmail`).

## Server functions (auth-gated, vendor side) — `clarifications.functions.ts`
- `createClarification(quoteId)` — build a draft from the agent's flagged questions (or empty for manual).
- `updateClarificationQuestions(...)` — curate: include/exclude, edit wording, add manual questions.
- `sendClarification(id)` — status → `sent`; returns the shareable `/clarify/<token>` link.
- `getClarification(id)` — vendor view incl. buyer answers + proposed changes.
- `applyClarificationChange(changeId)` / `applyAnswerToLine(...)` — vendor applies a confirmed spec/qty/add to the quote (human-in-the-loop).

## Public route — `src/routes/clarify.$token.tsx`
Mirrors `quote.$token.tsx`: anon page, loads via `get_clarification_public`, shows each
question with an answer box, a comment field, and (light amendment) per-line qty edit + "add
item"; submit via `submit_clarification_public`. Friendly, branded, no login.

## Vendor UI — clarification panel on the quote/RFQ
- Lists the agent-flagged questions per line; toggle include, edit, add manual questions.
- Two clear actions: **"Send clarification to buyer"** (→ copyable link) and **"Skip — go to sourcing"**. Both available; non-blocking.
- After the buyer responds: shows answers + proposed changes with one-click **Apply** controls; status badge (sent / answered).

## Build phases
1. **Core round-trip:** the three tables + the two public RPCs + the public `/clarify/$token` page + the vendor curation panel (questions only) + send-link + submit + email notify + vendor view of answers. *(Delivers the full ask for questions/answers.)*
2. **Light amendment:** buyer qty-change / add-item on the public page (`clarification_changes`) + vendor **Apply** actions onto the quote.
3. **Agent wiring:** auto-populate questions from the RFQ Intelligence agent's decomposition (depends on the agent build); until then questions are agent-fed-or-manual.

## Audit trail & timestamps
Every state change is timestamped and attributed — important because the operator (MODEC)
scores vendor responsiveness/correctness:
- Record-level: `created_at`, `sent_at`, `opened_at` (stamped when the buyer first loads the
  link), `answered_at`, `answered_by`, `closed_at`.
- Per-question: `buyer_answer` + `answered_at`; per-change: `vendor_applied` + `applied_at` +
  `applied_by`.
- A dedicated **`clarification_events`** log (id, clarification_id, workspace_id, actor
  [vendor user id or `'buyer'`], action [`created`/`sent`/`opened`/`answered`/`applied`/
  `closed`], detail jsonb, `at` timestamptz) gives a full, immutable who-did-what-when trail
  — surfaced on the clarification panel and exportable for the vendor-performance record.

## Guardrails / notes
- Tokenized public RPCs only expose the clarification + line items for that token (never drafts of other quotes), exactly like quote-accept.
- Buyer changes are proposals; the vendor applies them — no auto-mutation of priced specs.
- Reuses: token pattern, `sendEmail` notify, member RLS helper, the quote/RFQ tables.
