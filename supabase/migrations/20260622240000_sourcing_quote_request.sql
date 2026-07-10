-- Buyer "request a quote" fallback: link a price request to the sourcing line that
-- had no automatic offer, so a no-offer line becomes an actionable request instead of a dead end.
ALTER TABLE public.oem_price_requests
  ADD COLUMN IF NOT EXISTS sourcing_request_item_id uuid REFERENCES public.sourcing_request_items(id) ON DELETE CASCADE;
