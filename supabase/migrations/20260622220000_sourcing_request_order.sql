-- Buyer request -> order: link a placed order back to the sourcing request that spawned it.
ALTER TABLE public.sourcing_requests ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
