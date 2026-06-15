-- Orders + order tracking events, with a tokenized public tracking function.

CREATE TYPE public.order_status AS ENUM
  ('received','confirmed','processing','shipped','in_transit','delivered','cancelled');

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  rfq_id uuid REFERENCES public.rfqs(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  buyer_name text,
  buyer_email text,
  buyer_company text,
  description text,
  currency text,
  value numeric(14,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'received',
  carrier text,
  tracking_number text,
  tracking_url text,
  expected_delivery date,
  share_token text NOT NULL UNIQUE DEFAULT ('trk_' || replace(gen_random_uuid()::text, '-', '')),
  notes text,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, order_number)
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages orders" ON public.orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = orders.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = orders.workspace_id AND w.owner_id = auth.uid()));
CREATE TRIGGER touch_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS orders_ws_idx ON public.orders (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'status',
  status public.order_status,
  label text NOT NULL,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages order events" ON public.order_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = order_events.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = order_events.workspace_id AND w.owner_id = auth.uid()));
CREATE INDEX IF NOT EXISTS order_events_order_idx ON public.order_events (order_id, occurred_at);

-- Public tokenized tracking (SECURITY DEFINER, returns one order + its events).
CREATE OR REPLACE FUNCTION public.get_tracking(p_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
    'order', jsonb_build_object(
      'order_number', o.order_number,
      'buyer_name', o.buyer_name,
      'buyer_company', o.buyer_company,
      'description', o.description,
      'status', o.status,
      'carrier', o.carrier,
      'tracking_number', o.tracking_number,
      'tracking_url', o.tracking_url,
      'expected_delivery', o.expected_delivery,
      'ordered_at', o.ordered_at
    ),
    'events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', e.label, 'status', e.status, 'note', e.note, 'occurred_at', e.occurred_at
      ) ORDER BY e.occurred_at)
      FROM public.order_events e WHERE e.order_id = o.id
    ), '[]'::jsonb)
  ) END
  FROM public.orders o WHERE o.share_token = p_token;
$$;
REVOKE ALL ON FUNCTION public.get_tracking(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tracking(text) TO anon, authenticated;
