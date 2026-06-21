-- Cache the AI clarification-suggestion run on the clarification, keyed by a hash of the
-- quote's line items, so re-running on an unchanged RFQ costs no AI credit.
ALTER TABLE public.quote_clarifications
  ADD COLUMN IF NOT EXISTS suggest_hash text,
  ADD COLUMN IF NOT EXISTS suggested_at timestamptz;
