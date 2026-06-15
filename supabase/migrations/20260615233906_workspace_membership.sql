-- Workspace membership: members (via user_roles) can use the workspace, not just the owner.
-- Adds invites + helper functions, and converts owner-only RLS to member-based.

-- Backfill owners as members
INSERT INTO public.user_roles (user_id, workspace_id, role)
SELECT w.owner_id, w.id, 'owner'
FROM public.workspaces w
WHERE w.owner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = w.owner_id AND ur.workspace_id = w.id);

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.workspace_id = ws AND ur.user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.workspace_id = ws AND ur.user_id = auth.uid() AND ur.role IN ('owner','admin'));
$$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read roles" ON public.user_roles;
CREATE POLICY "Members read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id)) WITH CHECK (public.is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "Members read workspace" ON public.workspaces;
CREATE POLICY "Members read workspace" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id) OR owner_id = auth.uid());

-- Convert owner-only data policies to member-based
DROP POLICY IF EXISTS "Workspace owner manages catalog" ON public.catalog_items;
CREATE POLICY "Members manage catalog" ON public.catalog_items FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner views extractions" ON public.extracted_documents;
CREATE POLICY "Members manage extractions" ON public.extracted_documents FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner views line items" ON public.extracted_line_items;
CREATE POLICY "Members manage extracted line items" ON public.extracted_line_items FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owners view inbound addresses" ON public.inbound_addresses;
DROP POLICY IF EXISTS "Workspace owners update inbound addresses" ON public.inbound_addresses;
DROP POLICY IF EXISTS "Workspace owners delete inbound addresses" ON public.inbound_addresses;
CREATE POLICY "Members manage inbound addresses" ON public.inbound_addresses FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace members can view their inbound emails" ON public.inbound_emails;
CREATE POLICY "Members manage inbound emails" ON public.inbound_emails FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages order events" ON public.order_events;
CREATE POLICY "Members manage order events" ON public.order_events FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages orders" ON public.orders;
CREATE POLICY "Members manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages provider offers" ON public.provider_offers;
CREATE POLICY "Members manage provider offers" ON public.provider_offers FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages quote line items" ON public.quote_line_items;
CREATE POLICY "Members manage quote line items" ON public.quote_line_items FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages quotes" ON public.quotes;
CREATE POLICY "Members manage quotes" ON public.quotes FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages rfqs" ON public.rfqs;
CREATE POLICY "Members manage rfqs" ON public.rfqs FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages contracts" ON public.supplier_contracts;
CREATE POLICY "Members manage supplier contracts" ON public.supplier_contracts FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages suppliers" ON public.suppliers;
CREATE POLICY "Members manage suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Workspace owner manages workspace providers" ON public.workspace_providers;
CREATE POLICY "Members manage workspace providers" ON public.workspace_providers FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Invites
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  token text NOT NULL UNIQUE DEFAULT ('inv_' || replace(gen_random_uuid()::text,'-','')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (workspace_id, email)
);
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage invites" ON public.workspace_invites;
CREATE POLICY "Admins manage invites" ON public.workspace_invites FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id)) WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE OR REPLACE FUNCTION public.claim_workspace_invites()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; r record; mail text;
BEGIN
  mail := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF mail = '' THEN RETURN 0; END IF;
  FOR r IN SELECT * FROM public.workspace_invites WHERE status = 'pending' AND lower(email) = mail LOOP
    INSERT INTO public.user_roles (user_id, workspace_id, role)
    SELECT auth.uid(), r.workspace_id, r.role
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.workspace_id = r.workspace_id);
    UPDATE public.workspace_invites SET status = 'accepted', accepted_at = now() WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_workspace_invites() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_workspace_members()
RETURNS TABLE(user_id uuid, email text, role text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ur.user_id, u.email::text, ur.role, ur.created_at
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.workspace_id = (SELECT workspace_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
  ORDER BY ur.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.list_workspace_members() TO authenticated;
