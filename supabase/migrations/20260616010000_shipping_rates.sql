-- Shipping rate comparison (Phase 1: courier).
-- Mirrors the sourcing tables: providers + per-workspace enablement, a rate
-- cache, and the chosen rate attached to a quote as a freight line.

-- Carriers/aggregators we can quote against.
CREATE TABLE IF NOT EXISTS public.shipping_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'courier' CHECK (mode IN ('courier','freight')),
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;
-- Readable by any authenticated user (it's a shared catalog, no workspace data).
DROP POLICY IF EXISTS "Authenticated read shipping providers" ON public.shipping_providers;
CREATE POLICY "Authenticated read shipping providers" ON public.shipping_providers
  FOR SELECT TO authenticated USING (true);

-- Per-workspace enablement of a provider (defaults to "all active" when empty).
CREATE TABLE IF NOT EXISTS public.workspace_shipping_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.shipping_providers(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider_id)
);
ALTER TABLE public.workspace_shipping_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage ws shipping providers" ON public.workspace_shipping_providers;
CREATE POLICY "Members manage ws shipping providers" ON public.workspace_shipping_providers
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Cache of fetched rates, keyed by a request hash, to protect API quotas.
CREATE TABLE IF NOT EXISTS public.shipping_rate_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_slug text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider_slug, request_hash)
);
ALTER TABLE public.shipping_rate_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage shipping cache" ON public.shipping_rate_cache;
CREATE POLICY "Members manage shipping cache" ON public.shipping_rate_cache
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- The chosen shipping rate, attached to a quote.
CREATE TABLE IF NOT EXISTS public.quote_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  provider_slug text,
  mode text NOT NULL DEFAULT 'courier',
  carrier_name text NOT NULL,
  carrier_logo text,
  service text,
  amount numeric NOT NULL DEFAULT 0,            -- in quote currency
  currency text NOT NULL DEFAULT 'GHS',
  source_amount numeric,                        -- carrier's original amount
  source_currency text,
  fx_rate numeric,
  eta_text text,
  eta_minutes int,
  includes_insurance boolean,
  bookable boolean NOT NULL DEFAULT true,
  rate_ref text,                                -- provider rate_id, for later booking
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage quote shipments" ON public.quote_shipments;
CREATE POLICY "Members manage quote shipments" ON public.quote_shipments
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER touch_quote_shipments_updated_at BEFORE UPDATE ON public.quote_shipments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS quote_shipments_quote_idx ON public.quote_shipments (quote_id);
CREATE INDEX IF NOT EXISTS shipping_rate_cache_lookup_idx
  ON public.shipping_rate_cache (workspace_id, provider_slug, request_hash);

-- A chosen shipping rate is written as a quote line item of this type, so it
-- flows into quote totals and the PDF naturally.
ALTER TYPE public.quote_line_type ADD VALUE IF NOT EXISTS 'shipping';

-- Seed the Phase 1 courier provider.
INSERT INTO public.shipping_providers (slug, name, mode, priority)
VALUES ('terminal-africa', 'Terminal Africa', 'courier', 10)
ON CONFLICT (slug) DO NOTHING;
