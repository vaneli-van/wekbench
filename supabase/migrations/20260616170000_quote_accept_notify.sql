-- Notification address per workspace (backfilled from the owner's login email),
-- and accept_quote_public extended to return seller notify info so the public
-- accept server function can email the seller when a buyer accepts online.
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS notify_email text;
UPDATE public.workspaces w SET notify_email = u.email
  FROM auth.users u WHERE u.id = w.owner_id AND w.notify_email IS NULL;

CREATE OR REPLACE FUNCTION public.accept_quote_public(p_token text, p_name text, p_signature text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quotes%ROWTYPE;
  v_rfq RECORD;
  v_order_id uuid;
  v_order_number text;
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
    SELECT order_number INTO v_order_number FROM public.orders WHERE quote_id = q.id LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'already', true, 'quote_number', q.quote_number,
      'seller', v_seller, 'seller_email', v_seller_email, 'buyer', q.accepted_by,
      'total', q.total, 'currency', q.currency, 'order_number', v_order_number);
  END IF;
  IF q.status <> 'sent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This quote is not open for acceptance');
  END IF;

  UPDATE public.quotes
    SET status = 'accepted', accepted_at = now(), accepted_by = p_name, accept_signature = p_signature
    WHERE id = q.id;

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
    INSERT INTO public.order_events (order_id, workspace_id, event_type, status, label)
    VALUES (v_order_id, q.workspace_id, 'status', 'received', 'Order received — quote accepted online');
  END IF;

  RETURN jsonb_build_object('ok', true, 'quote_number', q.quote_number,
    'seller', v_seller, 'seller_email', v_seller_email, 'buyer', p_name,
    'total', q.total, 'currency', q.currency, 'order_number', v_order_number);
END $$;
REVOKE ALL ON FUNCTION public.accept_quote_public(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_quote_public(text, text, text) TO anon, authenticated;
