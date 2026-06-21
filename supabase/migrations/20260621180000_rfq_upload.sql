-- Direct RFQ upload (vendor uploads a PDF/CSV/image instead of forwarding email).
-- Extraction can now produce a document without an inbound email, and uploaded files
-- live in a private, workspace-scoped bucket.

ALTER TABLE public.extracted_documents ALTER COLUMN inbound_email_id DROP NOT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('rfq-uploads', 'rfq-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Members of a workspace may upload to / read their workspace's folder (path = <workspace_id>/...).
DROP POLICY IF EXISTS "rfq upload member insert" ON storage.objects;
CREATE POLICY "rfq upload member insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rfq-uploads'
             AND public.is_workspace_member(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS "rfq upload member read" ON storage.objects;
CREATE POLICY "rfq upload member read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rfq-uploads'
         AND public.is_workspace_member(((storage.foldername(name))[1])::uuid));
