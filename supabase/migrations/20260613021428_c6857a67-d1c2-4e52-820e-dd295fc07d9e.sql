-- Vendor types
CREATE TYPE public.vendor_type AS ENUM ('distributor', 'system_integrator', 'vendor');

ALTER TABLE public.workspaces
  ADD COLUMN vendor_types public.vendor_type[] NOT NULL DEFAULT '{}';

-- Phase 2 SI: line types + sections + line discounts
CREATE TYPE public.quote_line_type AS ENUM (
  'hardware', 'software', 'service', 'labour', 'travel', 'training', 'subscription'
);

ALTER TABLE public.quote_line_items
  ADD COLUMN line_type public.quote_line_type NOT NULL DEFAULT 'hardware',
  ADD COLUMN section TEXT,
  ADD COLUMN section_order INT NOT NULL DEFAULT 0,
  ADD COLUMN discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (discount_pct >= 0 AND discount_pct <= 100);

-- Phase 2 SI: site / install info on the quote
ALTER TABLE public.quotes
  ADD COLUMN site_address TEXT,
  ADD COLUMN site_contact_name TEXT,
  ADD COLUMN site_contact_phone TEXT,
  ADD COLUMN install_window TEXT;