-- Product catalogue: categories + unit, and team-wide (member) access.
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS unit text;

-- Move from owner-only RLS to member-based so the whole workspace can use the catalogue.
DROP POLICY IF EXISTS "Workspace owner manages catalog" ON public.catalog_items;
DROP POLICY IF EXISTS "Members manage catalog" ON public.catalog_items;
CREATE POLICY "Members manage catalog" ON public.catalog_items FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS catalog_items_category_idx ON public.catalog_items (workspace_id, category);
