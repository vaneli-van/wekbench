-- Follow-up conversation thread + AI feedback extraction + agent memory foundation
-- for the clarification round-trip. A shared thread lets vendor and buyer keep asking
-- follow-ups; the buyer's responses are distilled by AI and seeded into a per-workspace
-- memory the Bid Engineer can draw on for similar future RFQs.

-- Shared conversation thread (both directions).
CREATE TABLE IF NOT EXISTS public.clarification_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clarification_id uuid NOT NULL REFERENCES public.quote_clarifications(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('buyer','vendor')),
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clarification_messages_clar_idx ON public.clarification_messages (clarification_id, created_at);
ALTER TABLE public.clarification_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage clarification messages" ON public.clarification_messages;
CREATE POLICY "Members manage clarification messages" ON public.clarification_messages FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- AI-extracted buyer feedback, cached on the clarification.
ALTER TABLE public.quote_clarifications
  ADD COLUMN IF NOT EXISTS ai_feedback jsonb,
  ADD COLUMN IF NOT EXISTS ai_feedback_at timestamptz;

-- Per-workspace agent memory (RAG foundation). Embeddings can be layered on later;
-- for now keyword + recency retrieval over structured facts.
CREATE TABLE IF NOT EXISTS public.workspace_agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  rfq_id uuid REFERENCES public.rfqs(id) ON DELETE SET NULL,
  title text,
  summary text,
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_agent_memory_ws_idx ON public.workspace_agent_memory (workspace_id, created_at DESC);
ALTER TABLE public.workspace_agent_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read agent memory" ON public.workspace_agent_memory;
CREATE POLICY "Members read agent memory" ON public.workspace_agent_memory FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Buyer (anon) posts a follow-up message on an open clarification.
CREATE OR REPLACE FUNCTION public.post_clarification_message_public(p_token text, p_name text, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.quote_clarifications%ROWTYPE; q public.quotes%ROWTYPE; v_seller_email text;
BEGIN
  SELECT * INTO c FROM public.quote_clarifications WHERE share_token = p_token;
  IF NOT FOUND OR c.status NOT IN ('sent','answered') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This clarification is not open');
  END IF;
  IF length(btrim(coalesce(p_body,''))) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empty message');
  END IF;
  INSERT INTO public.clarification_messages (clarification_id, workspace_id, author, author_name, body)
  VALUES (c.id, c.workspace_id, 'buyer', NULLIF(btrim(p_name),''), btrim(p_body));
  INSERT INTO public.clarification_events (clarification_id, workspace_id, actor, action, detail)
  VALUES (c.id, c.workspace_id, 'buyer', 'updated', jsonb_build_object('message', true, 'by', p_name));
  SELECT * INTO q FROM public.quotes WHERE id = c.quote_id;
  SELECT u.email INTO v_seller_email
    FROM public.workspaces w JOIN auth.users u ON u.id = w.owner_id WHERE w.id = c.workspace_id;
  RETURN jsonb_build_object('ok', true, 'quote_number', q.quote_number, 'seller_email', v_seller_email);
END $$;
REVOKE ALL ON FUNCTION public.post_clarification_message_public(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.post_clarification_message_public(text, text, text) TO anon, authenticated;

-- Add the conversation thread to the buyer page payload.
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
    'messages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'author', m.author, 'author_name', m.author_name, 'body', m.body, 'created_at', m.created_at
      ) ORDER BY m.created_at)
      FROM public.clarification_messages m WHERE m.clarification_id = c.id
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
