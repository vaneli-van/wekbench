-- Buyer purchase order reference + acknowledgement ("sign and revert") on orders.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_po_ref text,
  ADD COLUMN IF NOT EXISTS buyer_po_date date,
  ADD COLUMN IF NOT EXISTS po_doc_path text,
  ADD COLUMN IF NOT EXISTS po_status text NOT NULL DEFAULT 'none'
    CHECK (po_status IN ('none','received','acknowledged')),
  ADD COLUMN IF NOT EXISTS po_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS po_acknowledged_by text,
  ADD COLUMN IF NOT EXISTS po_signature text;
