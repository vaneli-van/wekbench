-- Buyer PO reference on quotes, so it carries through to the order on acceptance.
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS buyer_po_ref text;
