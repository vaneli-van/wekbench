-- Audit fields for FX-converted sourced costs on quote lines.
ALTER TABLE public.quote_line_items
  ADD COLUMN IF NOT EXISTS source_currency TEXT,
  ADD COLUMN IF NOT EXISTS source_unit_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC;
