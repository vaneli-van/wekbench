import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

export const DOCUMENT_STATUSES = ["missing", "uploaded", "sent", "accepted"] as const;

/** Documents attached to an order, newest first. */
export const listDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: docs, error } = await context.supabase
      .from("documents")
      .select("id, name, doc_type, status, file_path, url, created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { documents: docs ?? [] };
  });

export const addDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        name: z.string().min(1),
        docType: z.string().optional(),
        filePath: z.string().optional(),
        url: z.string().optional(),
        status: z.enum(DOCUMENT_STATUSES).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const { data: created, error } = await context.supabase
      .from("documents")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: wsId,
        order_id: data.orderId,
        name: data.name,
        doc_type: data.docType || "other",
        file_path: data.filePath || null,
        url: data.url || null,
        status: data.status ?? "uploaded",
      } as any)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not add document");
    return { id: created.id as string };
  });

export const updateDocumentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(DOCUMENT_STATUSES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("documents")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: data.status } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
