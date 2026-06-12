
CREATE TYPE public.inbound_email_status AS ENUM ('received', 'processing', 'processed', 'failed', 'ignored');

CREATE TABLE public.inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  to_address TEXT NOT NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  envelope JSONB,
  headers JSONB,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  spam_score NUMERIC,
  status public.inbound_email_status NOT NULL DEFAULT 'received',
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbound_emails_workspace ON public.inbound_emails(workspace_id, received_at DESC);
CREATE INDEX idx_inbound_emails_to ON public.inbound_emails(to_address);
CREATE INDEX idx_inbound_emails_status ON public.inbound_emails(status);

GRANT SELECT ON public.inbound_emails TO authenticated;
GRANT ALL ON public.inbound_emails TO service_role;

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view their inbound emails"
ON public.inbound_emails FOR SELECT
TO authenticated
USING (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = inbound_emails.workspace_id AND w.owner_id = auth.uid()
  )
);

CREATE TRIGGER trg_inbound_emails_updated_at
BEFORE UPDATE ON public.inbound_emails
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
