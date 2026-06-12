
CREATE POLICY "Workspace owner reads supplier contracts" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'supplier-contracts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Workspace owner uploads supplier contracts" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'supplier-contracts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Workspace owner updates supplier contracts" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'supplier-contracts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Workspace owner deletes supplier contracts" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'supplier-contracts'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(name))[1]
      AND w.owner_id = auth.uid()
  )
);
