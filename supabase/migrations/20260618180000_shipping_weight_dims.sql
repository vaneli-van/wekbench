-- Shipping auto-calc: carry product weight + dimensions through the catalogue and onto
-- quote lines, so the shipping card can derive chargeable weight without manual entry.
-- Weight is clean from the SITC feed; dimensions are best-effort parsed from specs.
ALTER TABLE public.sitc_catalogue
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS width_cm  numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS specs     text;

ALTER TABLE public.quote_line_items
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS width_cm  numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric;
