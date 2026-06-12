
CREATE POLICY "Workspace owners can read their inbound attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inbound-email-attachments'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = w.id::text
  )
);
