-- OEM Price Books — P0 schema (tenant-scoped, RLS via is_workspace_member).
-- Vendor-owned OEM pricing: each vendor onboards their OEMs, attaches contracted
-- price files and/or discount schedules; Wekbench prices RFQ lines from this first.
-- All oem_* tenant tables are private to the workspace; price files are NDA'd.

-- 1. OEM suppliers (a vendor's relationship with an OEM) ----------------------
CREATE TABLE IF NOT EXISTS public.oem_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,                                  -- normalized brand key for matching ("apc")
  region text,
  partner_id text,                             -- vendor's partner/account number with the OEM
  relationship text NOT NULL DEFAULT 'authorized_distributor',
  currency text NOT NULL DEFAULT 'USD',
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  portal_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oem_suppliers_ws_idx ON public.oem_suppliers (workspace_id);
CREATE INDEX IF NOT EXISTS oem_suppliers_brand_idx ON public.oem_suppliers (workspace_id, brand);

-- 2. Price books (one uploaded file / release) -------------------------------
CREATE TABLE IF NOT EXISTS public.oem_price_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  oem_supplier_id uuid NOT NULL REFERENCES public.oem_suppliers(id) ON DELETE CASCADE,
  label text NOT NULL,
  scope_note text,                             -- e.g. "service/spare parts only — subset"
  source_file_path text,                       -- private storage bucket path
  currency text NOT NULL DEFAULT 'USD',
  effective_from date,
  effective_to date,
  status text NOT NULL DEFAULT 'draft',        -- draft | active | expired
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count int NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oem_price_books_oem_idx ON public.oem_price_books (oem_supplier_id);
CREATE INDEX IF NOT EXISTS oem_price_books_ws_idx ON public.oem_price_books (workspace_id);

-- 3. Price items (normalized rows) -------------------------------------------
CREATE TABLE IF NOT EXISTS public.oem_price_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  price_book_id uuid NOT NULL REFERENCES public.oem_price_books(id) ON DELETE CASCADE,
  oem_supplier_id uuid NOT NULL REFERENCES public.oem_suppliers(id) ON DELETE CASCADE,
  part_number text,
  normalized_part text,                        -- upper/stripped for matching
  model text,
  description text,
  category text,                               -- for discount-schedule lookups
  unit_price numeric,
  list_price numeric,                          -- when the file carries list too
  currency text,
  uom text,
  weight_kg numeric,
  dims text,
  upc text,
  supersedes text,
  superseded_by text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oem_price_items_book_idx ON public.oem_price_items (price_book_id);
CREATE INDEX IF NOT EXISTS oem_price_items_match_idx ON public.oem_price_items (workspace_id, oem_supplier_id, normalized_part);
CREATE INDEX IF NOT EXISTS oem_price_items_cat_idx ON public.oem_price_items (oem_supplier_id, category);

-- 4. Discount schedules (the generalization) ---------------------------------
CREATE TABLE IF NOT EXISTS public.oem_discount_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  oem_supplier_id uuid NOT NULL REFERENCES public.oem_suppliers(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'ALL',        -- OEM product family/category, or ALL
  discount_pct numeric NOT NULL,               -- 32.5 = 32.5% off list
  basis text NOT NULL DEFAULT 'off_list',
  effective_from date,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oem_discount_oem_idx ON public.oem_discount_schedules (oem_supplier_id, category);

-- 5. Price requests (quote-requests to the OEM/distributor) -------------------
CREATE TABLE IF NOT EXISTS public.oem_price_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote_line_item_id uuid,
  oem_supplier_id uuid REFERENCES public.oem_suppliers(id) ON DELETE SET NULL,
  part_number text,
  description text,
  status text NOT NULL DEFAULT 'requested',    -- requested | quoted | declined
  quoted_price numeric,
  contact_used text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS oem_price_requests_quote_idx ON public.oem_price_requests (quote_id);

-- 6. Shared regional sources (NO secret pricing) -----------------------------
CREATE TABLE IF NOT EXISTS public.regional_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  region text NOT NULL,
  source_name text NOT NULL,
  type text NOT NULL DEFAULT 'authorized_distributor',  -- authorized_distributor | retailer
  contact text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS regional_sources_lookup_idx ON public.regional_sources (brand, region);

-- 7. Provenance columns on quote_line_items ----------------------------------
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS price_source text;            -- contract_list | contract_superseded | vendor_entered | derived_discount | historical | retail_public | quote_pending | unpriced
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS price_provisional boolean NOT NULL DEFAULT false;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS price_book_id uuid;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS list_price numeric;
ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS discount_pct_applied numeric;

-- 8. RLS — member-scoped on all tenant tables --------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['oem_suppliers','oem_price_books','oem_price_items','oem_discount_schedules','oem_price_requests']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_member_all', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
                      USING (public.is_workspace_member(workspace_id))
                      WITH CHECK (public.is_workspace_member(workspace_id))$f$, t||'_member_all', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- regional_sources: shared read for any authenticated user; writes are admin-only (seeded).
ALTER TABLE public.regional_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS regional_sources_read ON public.regional_sources;
CREATE POLICY regional_sources_read ON public.regional_sources FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.regional_sources TO authenticated;

-- 9. Private storage bucket for uploaded price files -------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('oem-price-books', 'oem-price-books', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "oem price member insert" ON storage.objects;
CREATE POLICY "oem price member insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'oem-price-books'
             AND public.is_workspace_member(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "oem price member read" ON storage.objects;
CREATE POLICY "oem price member read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'oem-price-books'
         AND public.is_workspace_member(((storage.foldername(name))[1])::uuid));
