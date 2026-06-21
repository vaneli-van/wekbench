/**
 * Server-only AI extraction + catalog matching for inbound emails.
 * Loaded inside server-fn handlers and the inbound webhook with dynamic import.
 */
import { generateText, Output } from "ai";
import { z } from "zod";

import { getExtractionModel, activeAiProvider } from "./ai-model.server";

const LineItemSchema = z.object({
  description: z.string(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  target_price: z.number().nullable().optional(),
});

const ExtractionSchema = z.object({
  doc_type: z.enum(["rfq", "purchase_order", "rfq_amendment", "po_amendment", "unknown"]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  buyer_ref: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  incoterm: z.string().nullable().optional(),
  delivery_location: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  line_items: z.array(LineItemSchema),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You are a procurement assistant for a B2B vendor. Read an incoming buyer email and classify it as one of:
- "rfq": a new request for quotation (buyer asks for pricing/availability)
- "purchase_order": a confirmed order to buy specific items
- "rfq_amendment": a change/clarification to an existing RFQ (quantities, specs, deadline)
- "po_amendment": a change to an existing purchase order (qty, delivery, cancel)
- "unknown": anything else (general correspondence, follow-up only, spam)

Then extract:
- summary: one-sentence plain-English summary of intent
- buyer_ref: any RFQ/PO/quote reference number mentioned (e.g. "RFQ-2024-001", "PO #12345")
- due_date: ISO date if the buyer specifies one (YYYY-MM-DD), otherwise null
- currency: 3-letter ISO code if specified (USD, EUR, GBP, etc.), otherwise null
- incoterm: delivery/shipping term if stated (e.g. DAP, EXW, CIF, DDP, FOB), otherwise null
- delivery_location: where the buyer wants the goods delivered (city, port, site, or address), otherwise null
- payment_terms: payment terms if stated (e.g. "net 30", "50% advance"), otherwise null
- line_items: every distinct product/SKU the buyer is asking about, with description, brand, model, quantity, unit (each/box/pack), and target_price if stated

Be precise. If a field is missing, return null — do not invent values. Always return at least an empty line_items array.`;

export async function extractEmailContent(input: {
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
  fromAddress: string;
  fromName: string | null;
  attachments?: Array<{ filename: string; contentType: string; data: Uint8Array }>;
}): Promise<Extraction> {
  const model = getExtractionModel();

  const body = (input.textBody ?? stripHtml(input.htmlBody ?? "")).slice(0, 16000);
  const text = [
    `From: ${input.fromName ? `${input.fromName} <${input.fromAddress}>` : input.fromAddress}`,
    `Subject: ${input.subject ?? "(no subject)"}`,
    "",
    "Email body:",
    body || "(empty body — content may be in the attached file(s) below)",
  ].join("\n");

  const supportedAttachments = (input.attachments ?? []).filter((a) =>
    a.contentType === "application/pdf" || a.contentType.startsWith("image/"),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [{ type: "text", text }];
  for (const att of supportedAttachments) {
    content.push({
      type: "file",
      data: att.data,
      mediaType: att.contentType,
      filename: att.filename,
    });
  }

  try {
    const { experimental_output } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      experimental_output: Output.object({ schema: ExtractionSchema }),
    });
    return experimental_output;
  } catch (err) {
    // Fallback: constrained decoding intermittently fails on PDF-only emails
    // with "No object generated: response did not match schema". Re-ask in
    // plain JSON mode and parse manually.
    console.warn(
      "[extraction] structured output failed, falling back to JSON prompt:",
      err instanceof Error ? err.message : err,
    );
    try {
      const { text } = await generateText({
        model,
        system:
          SYSTEM_PROMPT +
          "\n\nRespond ONLY with a single JSON object matching this TypeScript type — no prose, no markdown fences:\n" +
          "{ doc_type: 'rfq'|'purchase_order'|'rfq_amendment'|'po_amendment'|'unknown', confidence: number, summary: string, buyer_ref: string|null, due_date: string|null, currency: string|null, incoterm: string|null, delivery_location: string|null, payment_terms: string|null, line_items: Array<{ description: string, brand: string|null, model: string|null, quantity: number|null, unit: string|null, target_price: number|null }> }",
        messages: [{ role: "user", content }],
      });
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("Model returned no JSON object");
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return ExtractionSchema.parse(parsed);
    } catch (err2) {
      const msg = err2 instanceof Error ? err2.message : String(err2);
      throw new Error(`AI extraction failed via "${activeAiProvider()}" provider: ${msg}`);
    }
  }
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* --------------- catalog matching --------------- */

type MatchResult = {
  catalog_item_id: string | null;
  confidence: number;
  status: "matched" | "not_found" | "sourcing";
  note: string | null;
};

export async function matchLineItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  workspaceId: string,
  item: { description: string; brand?: string | null; model?: string | null },
): Promise<MatchResult> {
  // 1. exact brand+model
  if (item.brand && item.model) {
    const { data } = await admin
      .from("catalog_items")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("brand", item.brand)
      .ilike("model", item.model)
      .limit(1)
      .maybeSingle();
    if (data) {
      return { catalog_item_id: data.id, confidence: 0.95, status: "matched", note: "Exact brand+model match" };
    }
  }

  // 2. partial description match
  const term = (item.model ?? item.description ?? "").trim().slice(0, 60);
  if (term.length >= 3) {
    const { data } = await admin
      .from("catalog_items")
      .select("id, description")
      .eq("workspace_id", workspaceId)
      .ilike("description", `%${term}%`)
      .limit(1)
      .maybeSingle();
    if (data) {
      return { catalog_item_id: data.id, confidence: 0.7, status: "matched", note: "Description match" };
    }
  }

  // 3. external lookup stub
  const external = await externalCatalogLookup(item);
  if (external.available && external.catalog_item_id) {
    return {
      catalog_item_id: external.catalog_item_id,
      confidence: external.confidence ?? 0.6,
      status: "matched",
      note: external.note ?? "External catalog match",
    };
  }
  return {
    catalog_item_id: null,
    confidence: 0,
    status: "sourcing",
    note: external.note ?? "Not in catalog — sourcing available within ~1 hour",
  };
}

/**
 * Stub for distributor/OEM API integrations.
 * Today this always reports "not available, sourcing required" — the interface
 * is set up so a real distributor API client can be dropped in later without
 * changing call sites.
 */
async function externalCatalogLookup(_item: {
  description: string;
  brand?: string | null;
  model?: string | null;
}): Promise<{
  available: boolean;
  catalog_item_id?: string;
  confidence?: number;
  note?: string;
}> {
  return {
    available: false,
    note: "Not in catalog — sourcing available within ~1 hour",
  };
}

/* --------------- end-to-end: run extraction for an email --------------- */

export async function runExtractionForEmail(emailId: string): Promise<{ documentId: string } | { skipped: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: email, error: emailErr } = await supabaseAdmin
    .from("inbound_emails")
    .select("id, workspace_id, subject, text_body, html_body, from_address, from_name, attachments")
    .eq("id", emailId)
    .single();
  if (emailErr || !email) throw new Error(`Email not found: ${emailErr?.message ?? emailId}`);
  if (!email.workspace_id) throw new Error("Email has no workspace");
  const workspaceId: string = email.workspace_id;

  await supabaseAdmin
    .from("inbound_emails")
    .update({ extraction_status: "running" })
    .eq("id", emailId);

  // Download supported attachments (PDFs, images) for multimodal extraction.
  const attMeta = Array.isArray(email.attachments) ? (email.attachments as Array<{
    filename: string; contentType: string; path: string; size?: number;
  }>) : [];
  const downloadable = attMeta.filter(
    (a) => a && a.path && (a.contentType === "application/pdf" || a.contentType?.startsWith("image/")),
  );
  const attachments: Array<{ filename: string; contentType: string; data: Uint8Array }> = [];
  for (const a of downloadable.slice(0, 5)) {
    try {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from("inbound-email-attachments")
        .download(a.path);
      if (dlErr || !blob) {
        console.error("[extraction] attachment download failed", a.path, dlErr);
        continue;
      }
      const buf = new Uint8Array(await blob.arrayBuffer());
      attachments.push({ filename: a.filename, contentType: a.contentType, data: buf });
    } catch (e) {
      console.error("[extraction] attachment read error", a.path, e);
    }
  }

  let extraction: Extraction;
  try {
    extraction = await extractEmailContent({
      subject: email.subject,
      textBody: email.text_body,
      htmlBody: email.html_body,
      fromAddress: email.from_address,
      fromName: email.from_name,
      attachments,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[extraction] failed", emailId, msg);
    await supabaseAdmin
      .from("inbound_emails")
      .update({ extraction_status: "failed" })
      .eq("id", emailId);
    throw new Error(`Extraction failed: ${msg}`);
  }

  // Look up workspace auto-approve threshold (1.0 = disabled)
  const { data: ws } = await supabaseAdmin
    .from("workspaces")
    .select("auto_approve_threshold, review_notify_email")
    .eq("id", workspaceId)
    .maybeSingle();
  const threshold = Number(ws?.auto_approve_threshold ?? 1);
  const autoApprove =
    extraction.doc_type !== "unknown" &&
    threshold < 1 &&
    extraction.confidence >= threshold;

  const { data: doc, error: docErr } = await supabaseAdmin
    .from("extracted_documents")
    .insert({
      workspace_id: workspaceId,
      inbound_email_id: email.id,
      doc_type: extraction.doc_type,
      confidence: extraction.confidence,
      summary: extraction.summary,
      buyer_ref: extraction.buyer_ref ?? null,
      due_date: extraction.due_date ?? null,
      currency: extraction.currency ?? null,
      raw_extraction: extraction as never,
      status: autoApprove ? "approved" : "pending_review",
      ...(autoApprove
        ? { reviewed_at: new Date().toISOString(), review_notes: "Auto-approved (high confidence)" }
        : {}),
    })
    .select("id")
    .single();
  if (docErr || !doc) throw new Error(`Could not insert extraction: ${docErr?.message}`);

  // line items
  if (extraction.line_items.length > 0 && workspaceId) {
    const rows = await Promise.all(
      extraction.line_items.map(async (li, idx) => {
        const match = await matchLineItem(supabaseAdmin, workspaceId, {
          description: li.description,
          brand: li.brand ?? null,
          model: li.model ?? null,
        });
        return {
          document_id: doc.id,
          workspace_id: workspaceId,
          line_no: idx + 1,
          requested_description: li.description,
          requested_brand: li.brand ?? null,
          requested_model: li.model ?? null,
          requested_qty: li.quantity ?? null,
          requested_unit: li.unit ?? null,
          target_price: li.target_price ?? null,
          matched_catalog_item_id: match.catalog_item_id,
          match_confidence: match.confidence,
          match_status: match.status,
          lookup_note: match.note,
        };
      }),
    );
    const { error: liErr } = await supabaseAdmin.from("extracted_line_items").insert(rows);
    if (liErr) console.error("[extraction] line items insert failed", liErr);
  }

  // Notification for items that need review
  if (!autoApprove) {
    const subject = email.subject ?? "(no subject)";
    const msg = `${extraction.doc_type === "unknown" ? "Unclassified" : extraction.doc_type.replace("_", " ")} from ${email.from_name ?? email.from_address}: "${subject}" — ${Math.round(extraction.confidence * 100)}% confidence`;
    await supabaseAdmin.from("review_notifications").insert({
      workspace_id: workspaceId,
      document_id: doc.id,
      kind: extraction.doc_type === "unknown" ? "unclassified" : "low_confidence",
      message: msg,
    });

    // Email notification stub — surfaces the intent; real send wires up when
    // the workspace has an email domain configured.
    if (ws?.review_notify_email) {
      console.log(
        `[review-notify] would email ${ws.review_notify_email}: ${msg} (doc ${doc.id})`,
      );
    }
  }

  await supabaseAdmin
    .from("inbound_emails")
    .update({ extraction_status: "done" })
    .eq("id", emailId);

  return { documentId: doc.id };
}

/* --------------- direct file upload → extraction (no inbound email) --------------- */

export async function ingestUploadedDocument(opts: {
  workspaceId: string;
  filePath: string;
  fileName: string;
  contentType: string;
}): Promise<{ documentId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: blob, error: dlErr } = await supabaseAdmin.storage.from("rfq-uploads").download(opts.filePath);
  if (dlErr || !blob) throw new Error(`Could not read upload: ${dlErr?.message ?? opts.filePath}`);
  const buf = new Uint8Array(await blob.arrayBuffer());

  const ct = opts.contentType || "";
  const isPdfOrImage = ct === "application/pdf" || ct.startsWith("image/") || /\.(pdf|png|jpe?g|webp|gif)$/i.test(opts.fileName);
  const isText = ct.startsWith("text/") || /\.(csv|txt|tsv)$/i.test(opts.fileName);

  let textBody: string | null = null;
  const attachments: Array<{ filename: string; contentType: string; data: Uint8Array }> = [];
  if (isPdfOrImage) {
    attachments.push({ filename: opts.fileName, contentType: ct || "application/pdf", data: buf });
  } else if (isText) {
    try {
      textBody = new TextDecoder("utf-8").decode(buf).slice(0, 16000);
    } catch {
      textBody = null;
    }
  } else {
    attachments.push({ filename: opts.fileName, contentType: ct || "application/octet-stream", data: buf });
  }

  const extraction = await extractEmailContent({
    subject: opts.fileName,
    textBody,
    htmlBody: null,
    fromAddress: "upload@wekbench.local",
    fromName: "Manual upload",
    attachments,
  });

  const { data: doc, error: docErr } = await supabaseAdmin
    .from("extracted_documents")
    .insert({
      workspace_id: opts.workspaceId,
      inbound_email_id: null,
      doc_type: extraction.doc_type,
      confidence: extraction.confidence,
      summary: extraction.summary,
      buyer_ref: extraction.buyer_ref ?? null,
      due_date: extraction.due_date ?? null,
      currency: extraction.currency ?? null,
      raw_extraction: extraction as never,
      status: "pending_review",
    })
    .select("id")
    .single();
  if (docErr || !doc) throw new Error(`Could not save extraction: ${docErr?.message}`);

  if (extraction.line_items.length > 0) {
    const rows = await Promise.all(
      extraction.line_items.map(async (li, idx) => {
        const match = await matchLineItem(supabaseAdmin, opts.workspaceId, {
          description: li.description,
          brand: li.brand ?? null,
          model: li.model ?? null,
        });
        return {
          document_id: doc.id,
          workspace_id: opts.workspaceId,
          line_no: idx + 1,
          requested_description: li.description,
          requested_brand: li.brand ?? null,
          requested_model: li.model ?? null,
          requested_qty: li.quantity ?? null,
          requested_unit: li.unit ?? null,
          target_price: li.target_price ?? null,
          matched_catalog_item_id: match.catalog_item_id,
          match_confidence: match.confidence,
          match_status: match.status,
          lookup_note: match.note,
        };
      }),
    );
    const { error: liErr } = await supabaseAdmin.from("extracted_line_items").insert(rows);
    if (liErr) console.error("[upload-ingest] line items insert failed", liErr);
  }

  return { documentId: doc.id as string };
}

