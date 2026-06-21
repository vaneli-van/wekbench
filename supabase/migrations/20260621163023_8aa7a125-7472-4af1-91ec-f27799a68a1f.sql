
-- 1) Fix supplier-contracts storage policies (workspace owner via workspace_id folder)
DROP POLICY IF EXISTS "Workspace owner reads supplier contracts" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owner uploads supplier contracts" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owner updates supplier contracts" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owner deletes supplier contracts" ON storage.objects;

CREATE POLICY "Workspace members read supplier contracts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'supplier-contracts'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Workspace members upload supplier contracts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-contracts'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Workspace members update supplier contracts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'supplier-contracts'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Workspace members delete supplier contracts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'supplier-contracts'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

-- 2) Fix inbound-email-attachments storage policies (members of the workspace folder)
DROP POLICY IF EXISTS "Workspace owners can read their inbound attachments" ON storage.objects;

CREATE POLICY "Workspace members read inbound attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'inbound-email-attachments'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Workspace members delete inbound attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'inbound-email-attachments'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );
-- Uploads happen via the inbound webhook using the service role, no INSERT policy for authenticated.

-- 3) Realtime channel authorization: deny-by-default on realtime.messages
-- We only use postgres_changes (RLS-filtered via underlying tables). Broadcast/presence is unused.
DO $$
BEGIN
  -- These policies may already exist or the realtime schema may forbid policies in some
  -- environments — guard so the migration is idempotent.
  EXECUTE 'DROP POLICY IF EXISTS "Deny anon realtime messages" ON realtime.messages';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated workspace topic only" ON realtime.messages';

  EXECUTE $p$
    CREATE POLICY "Deny anon realtime messages" ON realtime.messages
      FOR SELECT TO anon USING (false)
  $p$;
  EXECUTE $p$
    CREATE POLICY "Authenticated workspace topic only" ON realtime.messages
      FOR SELECT TO authenticated
      USING (
        -- Allow only topics shaped as "workspace:{uuid}:..." where the user is a member
        split_part(topic, ':', 1) = 'workspace'
        AND public.is_workspace_member((split_part(topic, ':', 2))::uuid)
      )
  $p$;
EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
  RAISE NOTICE 'realtime.messages policies skipped (insufficient privileges or table missing)';
END $$;
