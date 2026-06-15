-- Phase 0: multi-provider sourcing schema
-- One pipeline, many adapters. Provider registry + per-workspace config +
-- normalized offer cache, plus line-item classification and sourcing-decision fields.

-- 1) Global provider registry
CREATE TABLE IF NOT EXISTS public.sourcing_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'api' CHECK (kind IN ('api','catalog','manual')),
  categories text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sourcing_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read providers" ON public.sourcing_providers;
CREATE POLICY "Authenticated can read providers" ON public.sourcing_providers
  FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS touch_sourcing_providers_updated_at ON public.sourcing_providers;
CREATE TRIGGER touch_sourcing_providers_updated_at BEFORE UPDATE ON public.sourcing_providers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Per-workspace provider config
CREATE TABLE IF NOT EXISTS public.workspace_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.sourcing_providers(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  preferred boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider_id)
);
ALTER TABLE public.workspace_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace owner manages workspace providers" ON public.workspace_providers;
CREATE POLICY "Workspace owner manages workspace providers" ON public.workspace_providers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_providers.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_providers.workspace_id AND w.owner_id = auth.uid()));
DROP TRIGGER IF EXISTS touch_workspace_providers_updated_at ON public.workspace_providers;
CREATE TRIGGER touch_workspace_providers_updated_at BEFORE UPDATE ON public.workspace_providers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS workspace_providers_ws_idx ON public.workspace_providers (workspace_id);

-- 3) Normalized offer cache
CREATE TABLE IF NOT EXISTS public.provider_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.sourcing_providers(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  external_part_id text,
  distributor_name text,
  distributor_external_id text,
  distributor_sku text,
  stock_qty integer,
  moq integer,
  order_multiple integer,
  packaging text,
  lead_time_days integer,
  price_breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency text,
  buy_url text,
  is_authorised boolean,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace owner manages provider offers" ON public.provider_offers;
CREATE POLICY "Workspace owner manages provider offers" ON public.provider_offers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = provider_offers.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = provider_offers.workspace_id AND w.owner_id = auth.uid()));
DROP TRIGGER IF EXISTS touch_provider_offers_updated_at ON public.provider_offers;
CREATE TRIGGER touch_provider_offers_updated_at BEFORE UPDATE ON public.provider_offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS provider_offers_lookup_idx ON public.provider_offers (workspace_id, identifier);
CREATE INDEX IF NOT EXISTS provider_offers_fresh_idx ON public.provider_offers (workspace_id, provider_id, fetched_at DESC);

-- 4) Line-item classification on extracted_line_items
ALTER TABLE public.extracted_line_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS mpn text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS routing_status text NOT NULL DEFAULT 'pending';

-- 5) Sourcing decision on quote_line_items
ALTER TABLE public.quote_line_items
  ADD COLUMN IF NOT EXISTS mpn text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS external_part_id text,
  ADD COLUMN IF NOT EXISTS selected_offer_id uuid REFERENCES public.provider_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_distributor text,
  ADD COLUMN IF NOT EXISTS price_fetched_at timestamptz;

-- 6) Map suppliers to provider sellers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.sourcing_providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_seller_id text,
  ADD COLUMN IF NOT EXISTS is_authorised_distributor boolean NOT NULL DEFAULT false;

-- 7) Seed providers
INSERT INTO public.sourcing_providers (key, name, kind, categories, priority) VALUES
  ('nexar', 'Nexar / Octopart', 'api', ARRAY['electronic_component'], 10),
  ('oemsecrets', 'OEMsecrets', 'api', ARRAY['electronic_component'], 20),
  ('it_source', 'IT distributor', 'api', ARRAY['it_hardware'], 30),
  ('industrial_manual', 'Industrial (manual RFQ)', 'manual', ARRAY['industrial_mechanical','electrical','other'], 90)
ON CONFLICT (key) DO NOTHING;
