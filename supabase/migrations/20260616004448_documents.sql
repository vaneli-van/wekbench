-- Per-order document pack.
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('missing','uploaded','sent','accepted')),
  file_path text,
  url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage documents" ON public.documents FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER touch_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS documents_order_idx ON public.documents (order_id);
CREATE INDEX IF NOT EXISTS documents_ws_idx ON public.documents (workspace_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('documents','documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Members read document files" ON storage.objects;
CREATE POLICY "Members read document files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.workspace_id::text = (storage.foldername(objects.name))[1]));
DROP POLICY IF EXISTS "Members upload document files" ON storage.objects;
CREATE POLICY "Members upload document files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.workspace_id::text = (storage.foldername(objects.name))[1]));
DROP POLICY IF EXISTS "Members delete document files" ON storage.objects;
CREATE POLICY "Members delete document files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.workspace_id::text = (storage.foldername(objects.name))[1]));
