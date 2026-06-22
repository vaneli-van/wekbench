-- Order-flow integrity pass:
--  1) quote_events: append-only audit log for the front half of the money-path
--     (quotes had only bare status/stage columns, no trail).
--  2) accept_quote_public now returns order_id + order_created so the public
--     accept path can create the draft invoice too (parity with the internal
--     accept path), and logs an immutable 'accepted' quote_event.

-- 1) Quote event log -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quote_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'status',  -- status | stage | accepted | declined | sent | alert
  status text,                                 -- the status/stage value
  label text,
  note text,
  actor text,                                  -- signer / user name when known
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quote_events_member_read ON public.quote_events;
CREATE POLICY quote_events_member_read ON public.quote_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS quote_events_member_insert ON public.quote_events;
CREATE POLICY quote_events_member_insert ON public.quote_events FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
GRANT SELECT, INSERT ON public.quote_events TO authenticated;
CREATE INDEX IF NOT EXISTS quote_events_quote_idx ON public.quote_events (quote_id, occurred_at);

-- 2) accept_quote_public: return order_id + order_created, log accept event --
CREATE OR REPLACE FUNCTION public.accept_quote_public(p_token text, p_name text, p_signature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quotes%ROWTYPE;
  v_rfq RECORD;
  v_order_id uuid;
  v_order_number text;
  v_order_created boolean := false;
  v_prefix text;
  v_max text;
  v_n int;
  v_seller text;
  v_seller_email text;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE share_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Quote not found'); END IF;

  SELECT name, notify_email INTO v_seller, v_seller_email FROM public.workspaces WHERE id = q.workspace_id;

  IF q.status = 'accepted' THEN
    SELECT id, order_number INTO v_order_id, v_order_number FROM public.orders WHERE quote_id = q.id LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'already', true, 'quote_number', q.quote_number,
      'seller', v_seller, 'seller_email', v_seller_email, 'buyer', q.accepted_by,
      'total', q.total, 'currency', q.currency, 'order_number', v_order_number,
      'order_id', v_order_id, 'order_created', false);
  END IF;
  IF q.status <> 'sent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This quote is not open for acceptance');
  END IF;

  UPDATE public.quotes
    SET status = 'accepted', stage = 'won', accepted_at = now(), accepted_by = p_name, accept_signature = p_signature
    WHERE id = q.id;

  INSERT INTO public.quote_events (quote_id, workspace_id, event_type, status, label, actor)
  VALUES (q.id, q.workspace_id, 'accepted', 'accepted', 'Accepted & e-signed online', p_name);

  SELECT id, order_number INTO v_order_id, v_order_number FROM public.orders WHERE quote_id = q.id LIMIT 1;
  IF v_order_id IS NULL THEN
    SELECT * INTO v_rfq FROM public.rfqs WHERE id = q.rfq_id;
    v_prefix := 'ORD-' || EXTRACT(YEAR FROM now())::int || '-';
    SELECT order_number INTO v_max FROM public.orders
      WHERE workspace_id = q.workspace_id AND order_number LIKE v_prefix || '%'
      ORDER BY order_number DESC LIMIT 1;
    v_n := 1;
    IF v_max IS NOT NULL THEN
      v_n := COALESCE(NULLIF(split_part(v_max, '-', 3), '')::int, 0) + 1;
    END IF;
    v_order_number := v_prefix || lpad(v_n::text, 4, '0');
    INSERT INTO public.orders (workspace_id, quote_id, rfq_id, buyer_id, order_number, buyer_name,
        buyer_email, buyer_company, description, currency, value, status, buyer_po_ref, po_status)
    VALUES (q.workspace_id, q.id, q.rfq_id, q.buyer_id, v_order_number,
        COALESCE(q.buyer_name, v_rfq.buyer_company, v_rfq.buyer_name), v_rfq.buyer_email, v_rfq.buyer_company,
        COALESCE(q.title, v_rfq.summary, q.quote_number), q.currency, COALESCE(q.total, 0), 'received',
        q.buyer_po_ref, CASE WHEN q.buyer_po_ref IS NOT NULL THEN 'received' ELSE 'none' END)
    RETURNING id INTO v_order_id;
    v_order_created := true;
    INSERT INTO public.order_events (order_id, workspace_id, event_type, status, label)
    VALUES (v_order_id, q.workspace_id, 'status', 'received', 'Order received — quote accepted online');
  END IF;

  RETURN jsonb_build_object('ok', true, 'quote_number', q.quote_number,
    'seller', v_seller, 'seller_email', v_seller_email, 'buyer', p_name,
    'total', q.total, 'currency', q.currency, 'order_number', v_order_number,
    'order_id', v_order_id, 'order_created', v_order_created);
END $$;
REVOKE ALL ON FUNCTION public.accept_quote_public(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_quote_public(text, text, text) TO anon, authenticated;
