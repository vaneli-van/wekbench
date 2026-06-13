import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const kindEnum = z.enum(["datasheet", "warranty", "compliance", "other"]);

async function assertQuoteAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  quoteId: string,
): Promise<{ workspace_id: string }> {
  const { data, error } = await supabase
    .from("quotes")
    .select("workspace_id")
    .eq("id", quoteId)
    .single();
  if (error || !data) throw new Error("Quote not found");
  return data as { workspace_id: string };
}

export const listQuoteAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ quoteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("quote_attachments")
      .select("id, file_name, file_path, mime_type, size_bytes, kind, created_at, uploaded_by")
      .eq("quote_id", data.quoteId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { attachments: rows ?? [] };
  });

export const recordQuoteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quoteId: z.string().uuid(),
        filePath: z.string().min(1).max(1024),
        fileName: z.string().min(1).max(512),
        mimeType: z.string().max(255).optional(),
        sizeBytes: z.number().int().nonnegative().optional(),
        kind: kindEnum.default("other"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const q = await assertQuoteAccess(context.supabase, data.quoteId);
    const { data: row, error } = await context.supabase
      .from("quote_attachments")
      .insert({
        quote_id: data.quoteId,
        workspace_id: q.workspace_id,
        file_path: data.filePath,
        file_name: data.fileName,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        kind: data.kind,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getQuoteAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ attachmentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: att, error } = await context.supabase
      .from("quote_attachments")
      .select("file_path")
      .eq("id", data.attachmentId)
      .single();
    if (error || !att) throw new Error("Attachment not found");
    const { data: signed, error: sErr } = await context.supabase.storage
      .from("quote-attachments")
      .createSignedUrl(att.file_path, 60 * 10);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Could not sign URL");
    return { url: signed.signedUrl };
  });

export const deleteQuoteAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ attachmentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: att, error } = await context.supabase
      .from("quote_attachments")
      .select("id, file_path")
      .eq("id", data.attachmentId)
      .single();
    if (error || !att) throw new Error("Attachment not found");
    await context.supabase.storage.from("quote-attachments").remove([att.file_path]);
    const { error: dErr } = await context.supabase
      .from("quote_attachments")
      .delete()
      .eq("id", data.attachmentId);
    if (dErr) throw new Error(dErr.message);
    return { ok: true };
  });

export const getQuoteWorkspaceId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ quoteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const q = await assertQuoteAccess(context.supabase, data.quoteId);
    return { workspaceId: q.workspace_id };
  });
