import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

/**
 * Ingest a directly-uploaded RFQ/PO file (already in the rfq-uploads bucket under
 * <workspace_id>/...): run AI extraction and create an extracted document for review.
 */
export const ingestRfqUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        filePath: z.string().min(1),
        fileName: z.string().min(1).max(400),
        contentType: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspaceId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found for this user");
    if (!data.filePath.startsWith(`${workspaceId}/`)) throw new Error("Invalid file path");
    const { ingestUploadedDocument } = await import("@/lib/extraction.server");
    return await ingestUploadedDocument({
      workspaceId,
      filePath: data.filePath,
      fileName: data.fileName,
      contentType: data.contentType ?? "application/octet-stream",
    });
  });
