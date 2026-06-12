
-- Enums
CREATE TYPE public.supplier_status AS ENUM ('active','inactive');
CREATE TYPE public.contract_type AS ENUM ('master','sla','pricing','other');
CREATE TYPE public.catalog_source AS ENUM ('manual','supplier_upload','external_api');
CREATE TYPE public.extracted_doc_type AS ENUM ('rfq','purchase_order','rfq_amendment','po_amendment','unknown');
CREATE TYPE public.extracted_doc_status AS ENUM ('pending_review','approved','rejected');
CREATE TYPE public.line_match_status AS ENUM ('matched','not_found','sourcing','manual');

-- suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  contact_email text,
  notes text,
  status supplier_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = suppliers.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = suppliers.workspace_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_suppliers_workspace ON public.suppliers(workspace_id);

-- supplier_contracts
CREATE TABLE public.supplier_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contract_type contract_type NOT NULL DEFAULT 'master',
  title text NOT NULL,
  file_path text,
  starts_at date,
  ends_at date,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_contracts TO authenticated;
GRANT ALL ON public.supplier_contracts TO service_role;
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages contracts" ON public.supplier_contracts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = supplier_contracts.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = supplier_contracts.workspace_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_supplier_contracts_updated_at BEFORE UPDATE ON public.supplier_contracts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_supplier_contracts_supplier ON public.supplier_contracts(supplier_id);

-- catalog_items
CREATE TABLE public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  sku text,
  brand text,
  model text,
  description text NOT NULL,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  unit_price numeric(14,2),
  currency text DEFAULT 'USD',
  lead_time_days integer,
  stock_qty integer,
  source catalog_source NOT NULL DEFAULT 'manual',
  external_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner manages catalog" ON public.catalog_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = catalog_items.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = catalog_items.workspace_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_catalog_items_workspace ON public.catalog_items(workspace_id);
CREATE INDEX idx_catalog_items_brand_model ON public.catalog_items(workspace_id, lower(brand), lower(model));
CREATE INDEX idx_catalog_items_description ON public.catalog_items USING gin (to_tsvector('simple', coalesce(description,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(model,'')));

-- extracted_documents
CREATE TABLE public.extracted_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  inbound_email_id uuid NOT NULL REFERENCES public.inbound_emails(id) ON DELETE CASCADE,
  doc_type extracted_doc_type NOT NULL DEFAULT 'unknown',
  confidence numeric(4,3),
  summary text,
  buyer_ref text,
  due_date date,
  currency text,
  raw_extraction jsonb NOT NULL DEFAULT '{}'::jsonb,
  status extracted_doc_status NOT NULL DEFAULT 'pending_review',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extracted_documents TO authenticated;
GRANT ALL ON public.extracted_documents TO service_role;
ALTER TABLE public.extracted_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner views extractions" ON public.extracted_documents FOR ALL TO authenticated
  USING (workspace_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = extracted_documents.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (workspace_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = extracted_documents.workspace_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_extracted_documents_updated_at BEFORE UPDATE ON public.extracted_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_extracted_documents_email ON public.extracted_documents(inbound_email_id);
CREATE INDEX idx_extracted_documents_workspace ON public.extracted_documents(workspace_id, created_at DESC);

-- extracted_line_items
CREATE TABLE public.extracted_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.extracted_documents(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  requested_description text NOT NULL,
  requested_brand text,
  requested_model text,
  requested_qty numeric(14,3),
  requested_unit text,
  target_price numeric(14,2),
  matched_catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  match_confidence numeric(4,3),
  match_status line_match_status NOT NULL DEFAULT 'not_found',
  lookup_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extracted_line_items TO authenticated;
GRANT ALL ON public.extracted_line_items TO service_role;
ALTER TABLE public.extracted_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace owner views line items" ON public.extracted_line_items FOR ALL TO authenticated
  USING (workspace_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = extracted_line_items.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (workspace_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = extracted_line_items.workspace_id AND w.owner_id = auth.uid()));
CREATE TRIGGER trg_extracted_line_items_updated_at BEFORE UPDATE ON public.extracted_line_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_extracted_line_items_document ON public.extracted_line_items(document_id);

-- Add extraction_status to inbound_emails for quick filtering
ALTER TABLE public.inbound_emails ADD COLUMN extraction_status text NOT NULL DEFAULT 'pending';
