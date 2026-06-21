-- One-shot clarification: the buyer may answer / message / upload only while status='sent'.
-- Once submitted (status='answered') the clarification is locked; further input requires the
-- vendor to start a NEW clarification round. Keeps a clean, immutable audit trail.

CREATE OR REPLACE FUNCTION public.submit_clarification_public(
  p_token text, p_name text, p_comment text, p_answers jsonb, p_changes jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.quote_clarifications%ROWTYPE; q public.quotes%ROWTYPE;
  v_ans jsonb; v_chg jsonb; v_seller_email text;
BEGIN
  SELECT * INTO c FROM public.quote_clarifications WHERE share_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Clarification not found'); END IF;
  IF c.status <> 'sent' THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'This clarification has already been answered and is locked. Please ask the supplier to send a new clarification if you have more to add.');
  END IF;
  IF p_answers IS NOT NULL THEN
    FOR v_ans IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
      UPDATE public.clarification_questions
        SET buyer_answer = NULLIF(btrim(v_ans->>'answer'), ''), answered_at = now()
        WHERE clarification_id = c.id AND id = (v_ans->>'id')::uuid;
    END LOOP;
  END IF;
  DELETE FROM public.clarification_changes WHERE clarification_id = c.id AND vendor_applied = false;
  IF p_changes IS NOT NULL THEN
    FOR v_chg IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
      INSERT INTO public.clarification_changes (clarification_id, workspace_id, kind, line_no, line_item_id, payload)
      VALUES (c.id, c.workspace_id, COALESCE(v_chg->>'kind','add'),
              NULLIF(v_chg->>'line_no','')::int, NULLIF(v_chg->>'line_item_id','')::uuid,
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
  SELECT u.email INTO v_seller_email FROM public.workspaces w JOIN auth.users u ON u.id = w.owner_id WHERE w.id = c.workspace_id;
  RETURN jsonb_build_object('ok', true, 'quote_number', q.quote_number, 'seller_email', v_seller_email, 'token', p_token);
END $$;

CREATE OR REPLACE FUNCTION public.post_clarification_message_public(p_token text, p_name text, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.quote_clarifications%ROWTYPE; q public.quotes%ROWTYPE; v_seller_email text;
BEGIN
  SELECT * INTO c FROM public.quote_clarifications WHERE share_token = p_token;
  IF NOT FOUND OR c.status <> 'sent' THEN RETURN jsonb_build_object('ok', false, 'error', 'This clarification is locked'); END IF;
  IF length(btrim(coalesce(p_body,''))) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Empty message'); END IF;
  INSERT INTO public.clarification_messages (clarification_id, workspace_id, author, author_name, body)
  VALUES (c.id, c.workspace_id, 'buyer', NULLIF(btrim(p_name),''), btrim(p_body));
  INSERT INTO public.clarification_events (clarification_id, workspace_id, actor, action, detail)
  VALUES (c.id, c.workspace_id, 'buyer', 'updated', jsonb_build_object('message', true, 'by', p_name));
  SELECT * INTO q FROM public.quotes WHERE id = c.quote_id;
  SELECT u.email INTO v_seller_email FROM public.workspaces w JOIN auth.users u ON u.id = w.owner_id WHERE w.id = c.workspace_id;
  RETURN jsonb_build_object('ok', true, 'quote_number', q.quote_number, 'seller_email', v_seller_email);
END $$;

CREATE OR REPLACE FUNCTION public.add_clarification_attachment_public(
  p_token text, p_path text, p_name text, p_type text, p_size bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.quote_clarifications%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.quote_clarifications WHERE share_token = p_token;
  IF NOT FOUND OR c.status <> 'sent' THEN RETURN jsonb_build_object('ok', false, 'error', 'This clarification is locked'); END IF;
  IF (storage.foldername(p_path))[1] IS DISTINCT FROM p_token THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid file path'); END IF;
  INSERT INTO public.clarification_attachments (clarification_id, workspace_id, uploader, file_path, file_name, content_type, size_bytes)
  VALUES (c.id, c.workspace_id, 'buyer', p_path, p_name, p_type, p_size);
  INSERT INTO public.clarification_events (clarification_id, workspace_id, actor, action, detail)
  VALUES (c.id, c.workspace_id, 'buyer', 'updated', jsonb_build_object('attachment', p_name));
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.is_open_clarification_token(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.quote_clarifications WHERE share_token = p_token AND status = 'sent');
$$;
