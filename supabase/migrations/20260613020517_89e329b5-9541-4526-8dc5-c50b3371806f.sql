CREATE TYPE public.attachment_kind AS ENUM ('datasheet', 'warranty', 'compliance', 'other');

CREATE TABLE public.quote_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  kind public.attachment_kind NOT NULL DEFAULT 'other',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_attachments_quote ON public.quote_attachments(quote_id);
CREATE INDEX idx_quote_attachments_workspace ON public.quote_attachments(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_attachments TO authenticated;
GRANT ALL ON public.quote_attachments TO service_role;

ALTER TABLE public.quote_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage quote attachments"
ON public.quote_attachments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.workspace_id = quote_attachments.workspace_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.workspace_id = quote_attachments.workspace_id));

CREATE TRIGGER touch_quote_attachments_updated_at
BEFORE UPDATE ON public.quote_attachments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();