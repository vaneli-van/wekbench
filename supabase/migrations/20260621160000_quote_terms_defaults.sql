-- Quote terms: auto-fill from the RFQ + a system default tax rate, and switch the quote's
-- buyer reference from a (premature) PO number to the buyer's RFQ number.

-- Configurable per-workspace default tax (Ghana standard combined rate = 21.9%).
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS default_tax_pct numeric NOT NULL DEFAULT 21.9;

-- The buyer's own RFQ reference, surfaced on the quote (PO comes later, at order stage).
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS buyer_rfq_ref text;

-- Delivery terms captured on the RFQ (so they flow onto the quote).
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS incoterm text,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS payment_terms text;

-- Backfill the buyer RFQ number on existing quotes from their linked RFQ.
UPDATE public.quotes q
SET buyer_rfq_ref = r.buyer_ref
FROM public.rfqs r
WHERE q.rfq_id = r.id AND q.buyer_rfq_ref IS NULL AND NULLIF(btrim(r.buyer_ref), '') IS NOT NULL;
