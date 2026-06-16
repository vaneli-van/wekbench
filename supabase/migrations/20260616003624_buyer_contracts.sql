-- Buyer contracts with agreed (set) item prices.
CREATE TABLE IF NOT EXISTS public.buyer_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  title text NOT NULL,
  reference text,
  currency text,
  starts_at date,
  ends_at date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','draft')),
  file_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buyer_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage buyer contracts" ON public.buyer_contracts FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER touch_buyer_contracts_updated_at BEFORE UPDATE ON public.buyer_contracts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS buyer_contracts_buyer_idx ON public.buyer_contracts (buyer_id);

CREATE TABLE IF NOT EXISTS public.buyer_contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.buyer_contracts(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  description text NOT NULL,
  brand text,
  model text,
  mpn text,
  unit text,
  agreed_price numeric(14,4),
  currency text,
  min_qty numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buyer_contract_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage buyer contract items" ON public.buyer_contract_items FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER touch_buyer_contract_items_updated_at BEFORE UPDATE ON public.buyer_contract_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS buyer_contract_items_contract_idx ON public.buyer_contract_items (contract_id);
