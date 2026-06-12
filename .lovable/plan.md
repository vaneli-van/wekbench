
# AI email pipeline + catalog + supplier onboarding

Build the full pipeline in three coordinated layers. All AI runs server-side through Lovable AI Gateway (no user API key needed).

## 1. Schema (one migration)

New tables, all workspace-scoped with RLS:

- **`suppliers`** — `name`, `contact_email`, `contact_name`, `notes`, `status` (active/inactive)
- **`supplier_contracts`** — `supplier_id`, `buyer_workspace_id`, `contract_type` (master/SLA/pricing), `title`, `file_path` (storage), `starts_at`, `ends_at`, `terms` (jsonb: payment terms, lead time, currency)
- **`catalog_items`** — `workspace_id`, `supplier_id` (nullable), `sku`, `brand`, `model`, `description`, `spec` (jsonb), `unit_price` (numeric), `currency`, `lead_time_days`, `stock_qty`, `source` (manual/supplier_upload/external_api), `external_ref`
- **`extracted_documents`** — links to an `inbound_email_id`; `doc_type` (rfq/po/rfq_amendment/po_amendment/unknown), `confidence`, `summary`, `buyer_ref`, `due_date`, `currency`, `raw_extraction` (jsonb), `status` (pending_review/approved/rejected)
- **`extracted_line_items`** — `document_id`, `line_no`, `requested_description`, `requested_brand`, `requested_model`, `requested_qty`, `target_price`, `matched_catalog_item_id` (nullable), `match_confidence`, `match_status` (matched/not_found/sourcing), `lookup_note`

New storage bucket: `supplier-contracts` (private).

## 2. AI extraction (server)

New server function `extractInboundEmail(emailId)`:

1. Loads the `inbound_emails` row (text body, subject, attachments metadata).
2. Calls Lovable AI (`google/gemini-3-flash-preview`) with a strict Zod `Output.object` schema:
   - `doc_type` enum
   - `confidence` 0–1
   - `summary`, `buyer_ref`, `due_date`, `currency`
   - `line_items[]`: `{description, brand?, model?, quantity, unit?, target_price?}`
3. Inserts an `extracted_documents` row + N `extracted_line_items`.
4. For each line item, calls `matchLineItem(workspaceId, item)`:
   - Tries internal `catalog_items` (case-insensitive brand+model, then fuzzy description via `ilike`/trigram if available, otherwise simple normalized match).
   - If no match → calls `externalCatalogLookup()` stub which today returns `{available: false, note: "Not in catalog — sourcing available within ~1 hour"}`. Interface is set up so a real distributor/OEM API can be dropped in later.
   - Writes `matched_catalog_item_id`, `match_confidence`, `match_status`, `lookup_note`.

Triggered two ways:
- Automatically from the inbound-email webhook right after the row is inserted (fire-and-forget; webhook still returns 200 fast).
- Manually via a "Re-run extraction" button on the inbox detail.

## 3. UI

**Inbox detail** (`/_app/inbox`):
- New "AI extraction" panel showing: doc type badge, confidence, summary, key fields, and an editable line-items table with match status per row (✓ matched / ⚠ not in catalog / 🔍 sourcing). Inline "Add to catalog" and "Approve → create RFQ/PO" actions.

**Catalog** (extend existing `/_app/catalog`):
- Hook the existing add-product UI to the new `catalog_items` table.
- Show `supplier`, `lead_time`, `unit_price`, `stock_qty` columns.

**Suppliers** (extend existing `/_app/suppliers`):
- New supplier form asks: *Existing contract with buyer? SLA? Inventory list?*
- Contract upload (PDF) → storage + `supplier_contracts` row with terms fields.
- Inventory upload (CSV: sku, brand, model, description, unit_price, currency, lead_time_days, stock_qty) → bulk insert into `catalog_items` with `source='supplier_upload'`.

## 4. Out of scope (intentional)
- Real distributor/OEM API integrations — interface stub only.
- Auto-creating RFQ/PO records from extractions (one-click action surfaced, but the actual create flow stays manual until you approve).
- AI parsing of PDF/Excel attachments — v1 reads the email body. Attachment OCR can land next.

## Approval gates
- DB migration (one approval).
- Storage bucket (created in same migration).
- No new third-party secrets — Lovable AI Gateway uses the existing `LOVABLE_API_KEY`.

Reply "go" to start with the migration, or tell me what to trim/add.
