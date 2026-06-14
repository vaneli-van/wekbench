-- Allow standalone quotes (not tied to an RFQ) and carry buyer/title metadata
-- so quotes can be created directly from the "New quote" dialog.

ALTER TABLE public.quotes ALTER COLUMN rfq_id DROP NOT NULL;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS buyer_name TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS assignee TEXT;
