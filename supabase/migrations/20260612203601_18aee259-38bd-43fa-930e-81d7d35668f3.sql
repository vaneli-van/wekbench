
-- Enums
CREATE TYPE public.rfq_status AS ENUM ('open', 'quoted', 'won', 'lost');
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');
CREATE TYPE public.quote_line_source AS ENUM ('catalog', 'sourcing', 'manual');

-- rfqs
CREATE TABLE public.rfqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  extracted_document_id UUID NOT NULL UNIQUE REFERENCES public.extracted_documents(id) ON DELETE CASCADE,
  buyer_ref TEXT,
  summary TEXT,
  currency TEXT,
  due_date DATE,
  buyer_email TEXT,
  buyer_name TEXT,
  buyer_company TEXT,
  status public.rfq_status NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfqs_workspace ON public.rfqs(workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfqs TO authenticated;
GRANT ALL ON public.rfqs TO service_role;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages rfqs" ON public.rfqs FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = rfqs.workspace_id AND w.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = rfqs.workspace_id AND w.owner_id = auth.uid()));

-- quotes
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'draft',
  currency TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  margin_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, quote_number)
);
CREATE INDEX idx_quotes_workspace ON public.quotes(workspace_id, created_at DESC);
CREATE INDEX idx_quotes_rfq ON public.quotes(rfq_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages quotes" ON public.quotes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = quotes.workspace_id AND w.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = quotes.workspace_id AND w.owner_id = auth.uid()));

-- quote_line_items
CREATE TABLE public.quote_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  description TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit TEXT,
  unit_cost NUMERIC(14,4),
  unit_price NUMERIC(14,4),
  margin_pct NUMERIC(6,3),
  catalog_item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  extracted_line_item_id UUID REFERENCES public.extracted_line_items(id) ON DELETE SET NULL,
  source public.quote_line_source NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_line_items_quote ON public.quote_line_items(quote_id, line_no);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_line_items TO authenticated;
GRANT ALL ON public.quote_line_items TO service_role;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages quote line items" ON public.quote_line_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = quote_line_items.workspace_id AND w.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = quote_line_items.workspace_id AND w.owner_id = auth.uid()));

-- updated_at triggers (reuse existing touch_updated_at function)
CREATE TRIGGER touch_rfqs_updated_at BEFORE UPDATE ON public.rfqs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_quote_line_items_updated_at BEFORE UPDATE ON public.quote_line_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
