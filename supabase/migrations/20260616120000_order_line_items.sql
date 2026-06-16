-- Line items for orders (imported from Odoo sale.order.line, or future native orders).
CREATE TABLE IF NOT EXISTS public.order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 1,
  product text,
  description text,
  qty numeric NOT NULL DEFAULT 1,
  unit text,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage order line items" ON public.order_line_items;
CREATE POLICY "Members manage order line items" ON public.order_line_items
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE INDEX IF NOT EXISTS order_line_items_order_idx ON public.order_line_items (order_id, line_no);
