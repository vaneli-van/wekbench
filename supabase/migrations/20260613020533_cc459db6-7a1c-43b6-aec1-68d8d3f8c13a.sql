CREATE POLICY "Workspace members read quote attachment files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'quote-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.workspace_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Workspace members upload quote attachment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'quote-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.workspace_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Workspace members delete quote attachment files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'quote-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.workspace_id::text = (storage.foldername(name))[1]
  )
);