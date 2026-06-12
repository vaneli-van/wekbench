import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ emailId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // ensure the caller owns the email's workspace
    const { data: email, error } = await context.supabase
      .from("inbound_emails")
      .select("id, workspace_id")
      .eq("id", data.emailId)
      .maybeSingle();
    if (error || !email) throw new Error("Email not found or access denied");

    const { runExtractionForEmail } = await import("@/lib/extraction.server");
    return await runExtractionForEmail(data.emailId);
  });

const DocTypeEnum = z.enum(["rfq", "purchase_order", "rfq_amendment", "po_amendment", "unknown"]);

export const reviewExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        docType: DocTypeEnum.optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: doc, error: docErr } = await context.supabase
      .from("extracted_documents")
      .select("id, workspace_id, doc_type")
      .eq("id", data.documentId)
      .maybeSingle();
    if (docErr || !doc) throw new Error("Document not found or access denied");

    const patch = {
      status: data.action === "approve" ? "approved" : "rejected",
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      ...(data.docType ? { doc_type: data.docType } : {}),
      ...(data.notes !== undefined ? { review_notes: data.notes } : {}),
    };

    const { error: updErr } = await context.supabase
      .from("extracted_documents")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.documentId);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

export const updateExtractedLineItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lineItemId: z.string().uuid(),
        patch: z
          .object({
            requested_description: z.string().min(1).max(2000).optional(),
            requested_brand: z.string().max(255).nullable().optional(),
            requested_model: z.string().max(255).nullable().optional(),
            requested_qty: z.number().nullable().optional(),
            requested_unit: z.string().max(64).nullable().optional(),
            target_price: z.number().nullable().optional(),
            match_status: z.enum(["matched", "not_found", "sourcing", "manual"]).optional(),
          })
          .strict(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("extracted_line_items")
      .update(data.patch)
      .eq("id", data.lineItemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
