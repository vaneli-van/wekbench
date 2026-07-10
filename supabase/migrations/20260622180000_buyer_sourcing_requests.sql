-- Buyer side (self-serve concierge) — sourcing requests.
-- A buyer creates a request ("I need X, get it to my country"); Wekbench prices each
-- line via the sourcing router and converts to the buyer's local currency to show
-- landed cost. Tenant-scoped, RLS via is_workspace_member.

CREATE TABLE IF NOT EXISTS public.sourcing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  destination_country text,
  destination_city text,
  currency text NOT NULL DEFAULT 'GHS',       -- buyer's local currency (landed cost shown in this)
  status text NOT NULL DEFAULT 'draft',        -- draft | priced | ordered
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sourcing_requests_ws_idx ON public.sourcing_requests (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sourcing_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.sourcing_requests(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 1,
  description text,
  brand text,
  model text,
  mpn text,
  qty numeric NOT NULL DEFAULT 1,
  unit text,
  -- resolved by the sourcing router
  category text,
  best_distributor text,
  best_price numeric,                          -- in source currency
  best_currency text,
  converted_unit_price numeric,                -- in the request's local currency
  fx_rate numeric,
  offer_count int NOT NULL DEFAULT 0,
  datasheet_url text,
  item_status text NOT NULL DEFAULT 'pending', -- pending | priced | no_offer
  priced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sourcing_request_items_req_idx ON public.sourcing_request_items (request_id, line_no);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sourcing_requests','sourcing_request_items']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_member_all', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
                      USING (public.is_workspace_member(workspace_id))
                      WITH CHECK (public.is_workspace_member(workspace_id))$f$, t||'_member_all', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;
