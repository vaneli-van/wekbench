
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS reserved_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_point integer,
  ADD COLUMN IF NOT EXISTS warehouse_location text,
  ADD COLUMN IF NOT EXISTS oem text,
  ADD COLUMN IF NOT EXISTS authorisation_ref text,
  ADD COLUMN IF NOT EXISTS is_authorised boolean NOT NULL DEFAULT false;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS incoterm text,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS lead_time_days integer,
  ADD COLUMN IF NOT EXISTS tax_pct numeric(6,3) NOT NULL DEFAULT 21.9,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2) NOT NULL DEFAULT 0;
