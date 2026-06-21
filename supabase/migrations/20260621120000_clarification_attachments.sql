-- Clarification attachments: pictures / datasheets shared on the clarification
-- round-trip, in BOTH directions (buyer → vendor and vendor → buyer reference files).
-- Buyer is anonymous, so uploads are scoped to a valid SENT token via a security-definer
-- check. Files live in a public bucket namespaced by the random token (only reachable by
-- someone who already holds the link).

CREATE TABLE IF NOT EXISTS public.clarification_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clarification_id uuid NOT NULL REFERENCES public.quote_clarifications(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  uploader text NOT NULL CHECK (uploader IN ('buyer','vendor')),
  uploaded_by uuid,
  file_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clarification_attachments_clar_idx ON public.clarification_attachments (clarification_id, created_at);
ALTER TABLE public.clarification_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage clarification attachments" ON public.clarification_attachments;
CREATE POLICY "Members manage clarification attachments" ON public.clarification_attachments FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Token guards used by the storage policies (security definer so they can read the
-- clarification row regardless of the caller's role).
CREATE OR REPLACE FUNCTION public.is_open_clarification_token(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.quote_clarifications
                 WHERE share_token = p_token AND status IN ('sent','answered'));
$$;
REVOKE ALL ON FUNCTION public.is_open_clarification_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_open_clarification_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_member_clarification_token(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.quote_clarifications c
                 WHERE c.share_token = p_token AND public.is_workspace_member(c.workspace_id));
$$;
REVOKE ALL ON FUNCTION public.is_member_clarification_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_member_clarification_token(text) TO authenticated;

-- Buyer (anon) records an uploaded file. Validates token is open + the path is under it.
CREATE OR REPLACE FUNCTION public.add_clarification_attachment_public(
  p_token text, p_path text, p_name text, p_type text, p_size bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.quote_clarifications%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.quote_clarifications WHERE share_token = p_token;
  IF NOT FOUND OR c.status NOT IN ('sent','answered') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This clarification is not open');
  END IF;
  IF (storage.foldername(p_path))[1] IS DISTINCT FROM p_token THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid file path');
  END IF;
  INSERT INTO public.clarification_attachments (clarification_id, workspace_id, uploader, file_path, file_name, content_type, size_bytes)
  VALUES (c.id, c.workspace_id, 'buyer', p_path, p_name, p_type, p_size);
  INSERT INTO public.clarification_events (clarification_id, workspace_id, actor, action, detail)
  VALUES (c.id, c.workspace_id, 'buyer', 'updated', jsonb_build_object('attachment', p_name));
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.add_clarification_attachment_public(text, text, text, text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.add_clarification_attachment_public(text, text, text, text, bigint) TO anon, authenticated;

-- Surface attachments (both sides) on the public buyer page payload.
CREATE OR REPLACE FUNCTION public.get_clarification_public(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.quote_clarifications%ROWTYPE; q public.quotes%ROWTYPE; result jsonb;
BEGIN
  SELECT * INTO c FROM public.quote_clarifications WHERE share_token = p_token;
  IF NOT FOUND OR c.status = 'draft' THEN RETURN NULL; END IF;
  SELECT * INTO q FROM public.quotes WHERE id = c.quote_id;

  IF c.opened_at IS NULL AND c.status = 'sent' THEN
    UPDATE public.quote_clarifications SET opened_at = now() WHERE id = c.id;
    INSERT INTO public.clarification_events (clarification_id, workspace_id, actor, action)
    VALUES (c.id, c.workspace_id, 'buyer', 'opened');
  END IF;

  result := jsonb_build_object(
    'clarification', jsonb_build_object(
      'status', c.status, 'buyer_comment', c.buyer_comment,
      'answered_at', c.answered_at, 'answered_by', c.answered_by,
      'quote_number', q.quote_number, 'title', q.title,
      'seller', (SELECT name FROM public.workspaces w WHERE w.id = c.workspace_id)
    ),
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', cq.id, 'line_no', cq.line_no, 'question', cq.question, 'buyer_answer', cq.buyer_answer
      ) ORDER BY cq.sort, cq.line_no NULLS FIRST, cq.created_at)
      FROM public.clarification_questions cq WHERE cq.clarification_id = c.id AND cq.included
    ), '[]'::jsonb),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'line_item_id', li.id, 'line_no', li.line_no, 'description', li.description,
        'brand', li.brand, 'model', li.model, 'qty', li.qty, 'unit', li.unit
      ) ORDER BY li.line_no)
      FROM public.quote_line_items li WHERE li.quote_id = c.quote_id
    ), '[]'::jsonb),
    'attachments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'file_path', a.file_path, 'file_name', a.file_name, 'content_type', a.content_type, 'uploader', a.uploader
      ) ORDER BY a.created_at)
      FROM public.clarification_attachments a WHERE a.clarification_id = c.id
    ), '[]'::jsonb),
    'changes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kind', ch.kind, 'line_no', ch.line_no, 'payload', ch.payload))
      FROM public.clarification_changes ch WHERE ch.clarification_id = c.id
    ), '[]'::jsonb)
  );
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_clarification_public(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_clarification_public(text) TO anon, authenticated;

-- Public bucket for the shared files (read by path = token + uuid; not enumerable).
INSERT INTO storage.buckets (id, name, public)
VALUES ('clarification-uploads', 'clarification-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Token-scoped uploads: anon for an OPEN clarification, authenticated for a MEMBER's.
DROP POLICY IF EXISTS "clar buyer upload" ON storage.objects;
CREATE POLICY "clar buyer upload" ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'clarification-uploads'
             AND public.is_open_clarification_token((storage.foldername(name))[1]));
DROP POLICY IF EXISTS "clar member upload" ON storage.objects;
CREATE POLICY "clar member upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clarification-uploads'
             AND public.is_member_clarification_token((storage.foldername(name))[1]));
DROP POLICY IF EXISTS "clar member delete" ON storage.objects;
CREATE POLICY "clar member delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clarification-uploads'
         AND public.is_member_clarification_token((storage.foldername(name))[1]));
