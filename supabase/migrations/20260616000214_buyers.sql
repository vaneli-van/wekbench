-- Real buyers, referenced by rfqs / quotes / orders.
CREATE TABLE IF NOT EXISTS public.buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  sector text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage buyers" ON public.buyers FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER touch_buyers_updated_at BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.rfqs   ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL;

-- Backfill from existing quotes + rfqs, then link.
INSERT INTO public.buyers (workspace_id, name)
SELECT DISTINCT q.workspace_id, trim(q.buyer_name)
FROM public.quotes q WHERE q.buyer_name IS NOT NULL AND trim(q.buyer_name) <> ''
ON CONFLICT (workspace_id, name) DO NOTHING;
INSERT INTO public.buyers (workspace_id, name, email)
SELECT DISTINCT r.workspace_id,
       COALESCE(NULLIF(trim(r.buyer_company),''), NULLIF(trim(r.buyer_name),'')),
       max(NULLIF(trim(r.buyer_email),''))
FROM public.rfqs r
WHERE COALESCE(NULLIF(trim(r.buyer_company),''), NULLIF(trim(r.buyer_name),'')) IS NOT NULL
GROUP BY r.workspace_id, COALESCE(NULLIF(trim(r.buyer_company),''), NULLIF(trim(r.buyer_name),''))
ON CONFLICT (workspace_id, name) DO NOTHING;
UPDATE public.quotes q SET buyer_id = b.id
FROM public.buyers b WHERE b.workspace_id = q.workspace_id AND b.name = trim(q.buyer_name) AND q.buyer_id IS NULL;
UPDATE public.rfqs r SET buyer_id = b.id
FROM public.buyers b WHERE b.workspace_id = r.workspace_id
  AND b.name = COALESCE(NULLIF(trim(r.buyer_company),''), NULLIF(trim(r.buyer_name),'')) AND r.buyer_id IS NULL;
UPDATE public.orders o SET buyer_id = b.id
FROM public.buyers b WHERE b.workspace_id = o.workspace_id
  AND b.name = COALESCE(NULLIF(trim(o.buyer_company),''), NULLIF(trim(o.buyer_name),'')) AND o.buyer_id IS NULL;
