CREATE TABLE public.inbound_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  local_part TEXT NOT NULL,
  full_address TEXT NOT NULL UNIQUE,
  label TEXT,
  buyer_label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inbound_addresses_local_part_format CHECK (local_part ~ '^[a-z0-9]([a-z0-9._-]{0,62}[a-z0-9])?$')
);

CREATE INDEX inbound_addresses_workspace_id_idx ON public.inbound_addresses(workspace_id);
CREATE INDEX inbound_addresses_full_address_idx ON public.inbound_addresses(full_address);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbound_addresses TO authenticated;
GRANT ALL ON public.inbound_addresses TO service_role;

ALTER TABLE public.inbound_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners view inbound addresses"
  ON public.inbound_addresses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = inbound_addresses.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Workspace owners insert inbound addresses"
  ON public.inbound_addresses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = inbound_addresses.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Workspace owners update inbound addresses"
  ON public.inbound_addresses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = inbound_addresses.workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = inbound_addresses.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Workspace owners delete inbound addresses"
  ON public.inbound_addresses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = inbound_addresses.workspace_id AND w.owner_id = auth.uid()));

CREATE TRIGGER trg_inbound_addresses_updated_at
  BEFORE UPDATE ON public.inbound_addresses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();