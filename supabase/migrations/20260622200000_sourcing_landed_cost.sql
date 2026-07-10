-- Buyer landed cost: freight + duty + VAT/levies on top of goods, so a sourcing
-- request shows true landed cost to the buyer's country, not goods-only.
-- Defaults are Ghana-oriented estimates (editable per request later).
ALTER TABLE public.sourcing_requests
  ADD COLUMN IF NOT EXISTS goods_subtotal numeric,
  ADD COLUMN IF NOT EXISTS freight_pct numeric NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS freight_est numeric,
  ADD COLUMN IF NOT EXISTS duty_pct numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS duty_est numeric,
  ADD COLUMN IF NOT EXISTS vat_pct numeric NOT NULL DEFAULT 21.9,
  ADD COLUMN IF NOT EXISTS vat_est numeric,
  ADD COLUMN IF NOT EXISTS landed_total numeric;
