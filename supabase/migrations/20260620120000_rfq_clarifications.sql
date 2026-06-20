-- RFQ Clarification round-trip.
-- After the Bid Engineer decomposes an RFQ, the vendor curates clarification
-- questions and sends the buyer a no-login tokenized link to answer them (and
-- propose qty/add changes). Answers come back, the vendor reviews + applies.
-- Mirrors the quote-accept public-token pattern (get/submit *_public RPCs).

-- ---------- Tables (member RLS) ----------

CREATE TABLE IF NOT EXISTS public.quote_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  rfq_id uuid REFERENCES public.rfqs(id) ON DELETE SET NULL,
  share_token text NOT NULL DEFAULT ('c_' || replace(gen_random_uuid()::text, '-', '')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','answered','closed')),
  buyer_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  answered_at timestamptz,
  answered_by text,
  closed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS quote_clarifications_share_token_idx ON public.quote_clarifications (share_token);
CREATE INDEX IF NOT EXISTS quote_clarifications_quote_idx ON public.quote_clarifications (quote_id);
ALTER TABLE public.quote_clarifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage clarifications" ON public.quote_clarifications FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE TRIGGER touch_quote_clarifications_updated_at BEFORE UPDATE ON public.quote_clarifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.clarification_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clarification_id uuid NOT NULL REFERENCES public.quote_clarifications(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  line_no int,
  line_item_id uuid REFERENCES public.quote_line_items(id) ON DELETE SET NULL,
  question text NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('agent','manual')),
  included boolean NOT NULL DEFAULT true,
  buyer_answer text,
  answered_at timestamptz,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clarification_questions_clar_idx ON public.clarification_questions (clarification_id);
ALTER TABLE public.clarification_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage clarification questions" ON public.clarification_questions FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TABLE IF NOT EXISTS public.clarification_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clarification_id uuid NOT NULL REFERENCES public.quote_clarifications(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('qty','add')),
  line_no int,
  line_item_id uuid REFERENCES public.quote_line_items(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  vendor_applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  applied_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clarification_changes_clar_idx ON public.clarification_changes (clarification_id);
ALTER TABLE public.clarification_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage clarification changes" ON public.clarification_changes FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Immutable who-did-what-when trail (surfaced on the vendor panel; exportable
-- for the operator's vendor-performance record).
CREATE TABLE IF NOT EXISTS public.clarification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clarification_id uuid NOT NULL REFERENCES public.quote_clarifications(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor text NOT NULL,
  action text NOT NULL CHECK (action IN ('created','sent','opened','answered','applied','closed','updated')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clarification_events_clar_idx ON public.clarification_events (clarification_id, at);
ALTER TABLE public.clarification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read clarification events" ON public.clarification_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- ---------- Public, tokenized access (SECURITY DEFINER; granted to anon) ----------

-- Buyer opens /c/<token>. Returns the clarification, its included questions, and
-- the quote's current line items (read-only) for the light amendment UI.
-- Stamps opened_at + logs an 'opened' event on first view.
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
      FROM public.quote_line_items li WHERE li.quote_id = c.quote_id AND COALESCE(li.line_type,'item') = 'item'
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

-- Buyer submits: answers (array of {id, answer}), a free-text comment, a name,
-- and proposed changes (array of {kind, line_no, line_item_id, payload}).
-- Records everything for the vendor to review + apply (never auto-applied).
CREATE OR REPLACE FUNCTION public.submit_clarification_public(
  p_token text, p_name text, p_comment text, p_answers jsonb, p_changes jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.quote_clarifications%ROWTYPE;
  q public.quotes%ROWTYPE;
  v_ans jsonb; v_chg jsonb; v_seller_email text;
BEGIN
  SELECT * INTO c FROM public.quote_clarifications WHERE share_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Clarification not found'); END IF;
  IF c.status NOT IN ('sent','answered') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This clarification is not open for responses');
  END IF;

  -- Record answers against the matching questions (scoped to this clarification).
  IF p_answers IS NOT NULL THEN
    FOR v_ans IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
      UPDATE public.clarification_questions
        SET buyer_answer = NULLIF(btrim(v_ans->>'answer'), ''), answered_at = now()
        WHERE clarification_id = c.id AND id = (v_ans->>'id')::uuid;
    END LOOP;
  END IF;

  -- Replace previously-proposed (un-applied) buyer changes with the fresh set.
  DELETE FROM public.clarification_changes WHERE clarification_id = c.id AND vendor_applied = false;
  IF p_changes IS NOT NULL THEN
    FOR v_chg IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
      INSERT INTO public.clarification_changes (clarification_id, workspace_id, kind, line_no, line_item_id, payload)
      VALUES (c.id, c.workspace_id, COALESCE(v_chg->>'kind','add'),
              NULLIF(v_chg->>'line_no','')::int,
              NULLIF(v_chg->>'line_item_id','')::uuid,
              COALESCE(v_chg->'payload', '{}'::jsonb));
    END LOOP;
  END IF;

  UPDATE public.quote_clarifications
    SET status = 'answered', answered_at = now(), answered_by = NULLIF(btrim(p_name), ''),
        buyer_comment = NULLIF(btrim(p_comment), '')
    WHERE id = c.id;
  INSERT INTO public.clarification_events (clarification_id, workspace_id, actor, action, detail)
  VALUES (c.id, c.workspace_id, 'buyer', 'answered', jsonb_build_object('by', p_name));

  SELECT * INTO q FROM public.quotes WHERE id = c.quote_id;
  SELECT u.email INTO v_seller_email
    FROM public.workspaces w JOIN auth.users u ON u.id = w.owner_id WHERE w.id = c.workspace_id;

  RETURN jsonb_build_object('ok', true, 'quote_number', q.quote_number,
    'seller_email', v_seller_email, 'token', p_token);
END $$;
REVOKE ALL ON FUNCTION public.submit_clarification_public(text, text, text, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_clarification_public(text, text, text, jsonb, jsonb) TO anon, authenticated;
