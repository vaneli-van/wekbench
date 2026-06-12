
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS auto_approve_threshold NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS review_notify_email TEXT;

CREATE TABLE IF NOT EXISTS public.review_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.extracted_documents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'low_confidence',
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_notifications_ws_idx
  ON public.review_notifications(workspace_id, read_at, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_notifications TO authenticated;
GRANT ALL ON public.review_notifications TO service_role;

ALTER TABLE public.review_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read notifications"
  ON public.review_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.workspace_id = review_notifications.workspace_id
        AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members update notifications"
  ON public.review_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.workspace_id = review_notifications.workspace_id
        AND ur.user_id = auth.uid()
    )
  );
