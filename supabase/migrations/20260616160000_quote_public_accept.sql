-- Public, tokenized quote acceptance + e-signature (mirrors the order-tracking
-- token pattern). A buyer opens /quote/<token>, reviews the quote, and accepts
-- (e-signs) or declines — no login. Accepting idempotently spins up the order.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by text,
  ADD COLUMN IF NOT EXISTS accept_signature text,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_note text;

ALTER TABLE public.quotes ALTER COLUMN share_token SET DEFAULT ('q_' || replace(gen_random_uuid()::text, '-', ''));
UPDATE public.quotes SET share_token = ('q_' || replace(gen_random_uuid()::text, '-', '')) WHERE share_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quotes_share_token_idx ON public.quotes (share_token);

-- Public read of a sent/decided quote (never a draft).
CREATE OR REPLACE FUNCTION public.get_quote_public(p_token text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN q.id IS NULL THEN NULL ELSE jsonb_build_object(
    'quote', jsonb_build_object(
      'quote_number', q.quote_number, 'title', q.title, 'status', q.status, 'currency', q.currency,
      'subtotal', q.subtotal, 'tax_pct', q.tax_pct, 'tax_amount', q.tax_amount, 'total', q.total,
      'valid_until', q.valid_until, 'incoterm', q.incoterm, 'delivery_location', q.delivery_location,
      'lead_time_days', q.lead_time_days, 'notes', q.notes, 'buyer_name', q.buyer_name,
      'buyer_po_ref', q.buyer_po_ref, 'accepted_at', q.accepted_at, 'accepted_by', q.accepted_by,
      'declined_at', q.declined_at,
      'seller', (SELECT name FROM public.workspaces w WHERE w.id = q.workspace_id)
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'line_no', li.line_no, 'description', li.description, 'brand', li.brand, 'model', li.model,
        'qty', li.qty, 'unit', li.unit, 'unit_price', li.unit_price, 'discount_pct', li.discount_pct,
        'line_type', li.line_type, 'section', li.section
      ) ORDER BY li.line_no)
      FROM public.quote_line_items li WHERE li.quote_id = q.id
    ), '[]'::jsonb)
  ) END
  FROM public.quotes q WHERE q.share_token = p_token AND q.status <> 'draft';
$$;
REVOKE ALL ON FUNCTION public.get_quote_public(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_quote_public(text) TO anon, authenticated;

-- Public accept: mark accepted + record signature + idempotently create the order.
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
BEGIN
  SELECT * INTO q FROM public.quotes WHERE share_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Quote not found'); END IF;
  IF q.status = 'accepted' THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'quote_number', q.quote_number);
  END IF;
  IF q.status <> 'sent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This quote is not open for acceptance');
  END IF;

  UPDATE public.quotes
    SET status = 'accepted', accepted_at = now(), accepted_by = p_name, accept_signature = p_signature
    WHERE id = q.id;

  SELECT id INTO v_order_id FROM public.orders WHERE quote_id = q.id LIMIT 1;
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

  RETURN jsonb_build_object('ok', true, 'quote_number', q.quote_number);
END $$;
REVOKE ALL ON FUNCTION public.accept_quote_public(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_quote_public(text, text, text) TO anon, authenticated;

-- Public decline.
CREATE OR REPLACE FUNCTION public.decline_quote_public(p_token text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes%ROWTYPE;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE share_token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Quote not found'); END IF;
  IF q.status <> 'sent' THEN RETURN jsonb_build_object('ok', false, 'error', 'This quote is not open'); END IF;
  UPDATE public.quotes SET status = 'declined', declined_at = now(), decline_note = p_note WHERE id = q.id;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.decline_quote_public(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.decline_quote_public(text, text) TO anon, authenticated;
