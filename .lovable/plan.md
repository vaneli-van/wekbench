# Close the extraction → quote workflow

## What's actually broken (root causes)

After walking the flow end-to-end with your latest email (the office-supplies RFQ, MP25-26/18453), here's what's actually wrong — not just symptoms:

1. **Review Queue is empty even when docs are pending.** The queue filters out anything with `confidence ≥ threshold` (default 80%). Your two newest RFQs scored 92% and 100%, so they're hidden. The threshold should affect *highlighting/sorting*, not visibility.
2. **Inbox detail says "Approved" after extraction finishes.** It's reading `extraction_status === "done"` and rendering the green "approved" badge. Extraction done ≠ document approved — those are two different states.
3. **Extracted document is a dead end.** From the inbox / extractions list you can see the line items, but there's no link to an RFQ record and no "build quote" action. `/rfq/$id` and `/quote/$id` still use **mock seed data** (`src/lib/data.ts`, `pipelineQuotes`) — they are not connected to `extracted_documents` at all.
4. **"Only shows products" — there are no `quotes` / `rfqs` tables in the DB.** Every list you see on `/quotes`, `/rfq/$id`, `/orders` is hard-coded sample data. That's why your real extraction "only shows up" on AI Extractions — it's the only page actually reading from `extracted_documents`.
5. **No bridge to a quote.** Even if Review Queue worked, "Approve" today only flips `status='approved'` — it doesn't create a quote you can price.

## What I'll build

### 1. Fix the small UX bugs (1 file each)
- **Inbox badge:** replace `"approved"`/`"new"` with `"Extracted"` / `"Awaiting extraction"` so it stops claiming user approval.
- **Review Queue:** show every `pending_review` document; keep the threshold slider but use it to *highlight* low-confidence rows and to filter to "needs attention" via a toggle, not to hide everything.
- **AI Extractions detail:** add a "Convert to Quote" CTA and a link back to the source email.

### 2. Real RFQ & Quote records (DB migration)
Add two tables that mirror the workflow:

- `rfqs` — one row per approved extraction. Columns: `workspace_id`, `extracted_document_id`, `buyer_ref`, `summary`, `currency`, `due_date`, `status` (`open` / `quoted` / `lost` / `won`), buyer contact (from the inbound email).
- `quotes` — one row per quote built from an RFQ. Columns: `workspace_id`, `rfq_id`, `quote_number`, `status` (`draft` / `sent` / `accepted` / `declined`), `currency`, `subtotal`, `margin_pct`, `total`, `valid_until`, `notes`.
- `quote_line_items` — `quote_id`, `line_no`, `description`, `brand`, `model`, `qty`, `unit`, `unit_cost`, `unit_price`, `margin_pct`, `catalog_item_id` (nullable), `source` (`catalog` / `sourcing` / `manual`).

Each with GRANTs, RLS scoped to workspace membership, and `updated_at` triggers.

### 3. Approve → RFQ → Quote pipeline (server fns)
- **`approveExtraction`** (extend the existing review fn): when an extraction is approved, insert a row into `rfqs`, copy line items into a draft `quotes` + `quote_line_items` (pulling `unit_cost` from matched `catalog_items` where available, leaving sourcing items blank).
- **`getRfq(id)`** / **`getQuote(id)`** / **`updateQuoteLineItem`** / **`sendQuote`** — real reads/writes for the detail pages.

### 4. Wire the detail pages to real data
- Rewrite `/rfq/$id` to fetch the real `rfqs` row + its `extracted_line_items`, with a "Build Quote" button if no quote exists yet, or "Open Quote" if one does.
- Rewrite `/quote/$id` to load the real `quotes` row, render the existing `QuoteBuilder` against live line items (edit qty / unit cost / margin → live total), and add "Send Quote" (status `draft` → `sent`).
- Rewrite `/quotes` list to read from `quotes` table (keep the existing UI; just swap the data source).

### 5. Navigation
- Inbox → Review Queue → Approve → lands on `/rfq/<id>`.
- `/rfq/<id>` → "Build Quote" → creates draft if missing, navigates to `/quote/<id>`.
- AI Extractions list adds a "View RFQ" link once approved.

## What I'm intentionally not doing yet
- Touching `/orders` — same gap exists (mock data) but is the next step; I'll tackle it after Quote works end-to-end so we don't merge too much at once.
- Email-out of the quote PDF — the "Send Quote" action will mark status only; actual outbound email goes in the next round once you have your sending domain wired.
- Catalog enrichment for sourcing items — they'll land in the draft quote blank, with a `sourcing` badge, for you to price manually.

## Order of work
1. DB migration for `rfqs` / `quotes` / `quote_line_items` (needs your approval).
2. Server functions (`approveExtraction`, `getRfq`, `getQuote`, `updateQuoteLineItem`).
3. Rewrite `/rfq/$id`, `/quote/$id`, `/quotes` to use real data.
4. Fix Review Queue filter + inbox badge + add CTAs.
5. Verify end-to-end with the MP25-26/18453 RFQ already in your DB.

OK to proceed? If yes I'll start with the migration (you'll get an approval prompt for the SQL), then ship the rest in one pass.
