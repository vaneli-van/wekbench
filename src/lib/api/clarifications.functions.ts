import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";
import { recomputeQuoteTotals } from "./quotes.functions";
import { sendEmail, escapeHtml } from "@/lib/email.server";

/* ---------- helpers ---------- */

function anonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function logEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  clarificationId: string,
  workspaceId: string,
  actor: string,
  action: string,
  detail: Record<string, unknown> = {},
) {
  await supabase
    .from("clarification_events")
    .insert({ clarification_id: clarificationId, workspace_id: workspaceId, actor, action, detail });
}

/* ---------- vendor side (auth-gated) ---------- */

/** Create (or reuse) a draft clarification for a quote, optionally seeding questions. */
export const createClarification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quoteId: z.string().uuid(),
        forceNew: z.boolean().optional(),
        questions: z
          .array(
            z.object({
              question: z.string().min(1),
              lineNo: z.number().int().optional(),
              lineItemId: z.string().uuid().optional(),
              source: z.enum(["agent", "manual"]).optional(),
            }),
          )
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const userId = context.userId;
    const workspaceId = await resolveWorkspaceId(supabase, userId);
    if (!workspaceId) throw new Error("No workspace found for this user");

    const { data: q } = await supabase
      .from("quotes")
      .select("id, rfq_id")
      .eq("id", data.quoteId)
      .single();
    if (!q) throw new Error("Quote not found");

    if (data.forceNew) {
      // Start a fresh round: close any existing open clarification for this quote first.
      await supabase
        .from("quote_clarifications")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("quote_id", data.quoteId)
        .neq("status", "closed");
    } else {
      // Reuse an existing open clarification for this quote if one exists.
      const { data: existing } = await supabase
        .from("quote_clarifications")
        .select("id, share_token, status")
        .eq("quote_id", data.quoteId)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        return { id: existing.id as string, token: existing.share_token as string, status: existing.status as string };
      }
    }

    const { data: created, error } = await supabase
      .from("quote_clarifications")
      .insert({ workspace_id: workspaceId, quote_id: data.quoteId, rfq_id: q.rfq_id ?? null, status: "draft" })
      .select("id, share_token")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create clarification");

    if (data.questions?.length) {
      const rows = data.questions.map((qq, idx) => ({
        clarification_id: created.id,
        workspace_id: workspaceId,
        question: qq.question,
        line_no: qq.lineNo ?? null,
        line_item_id: qq.lineItemId ?? null,
        source: qq.source ?? "manual",
        sort: idx,
      }));
      await supabase.from("clarification_questions").insert(rows);
    }
    await logEvent(supabase, created.id, workspaceId, userId, "created");
    return { id: created.id as string, token: created.share_token as string, status: "draft" };
  });

/** Vendor view: the latest open clarification for a quote + questions, changes, events. */
export const getQuoteClarification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quoteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("*")
      .eq("quote_id", data.quoteId)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!c) return { clarification: null, questions: [], changes: [], events: [], attachments: [], messages: [] };

    const [questionsRes, changesRes, eventsRes, attachmentsRes, messagesRes] = await Promise.all([
      supabase.from("clarification_questions").select("*").eq("clarification_id", c.id).order("sort").order("created_at"),
      supabase.from("clarification_changes").select("*").eq("clarification_id", c.id).order("created_at"),
      supabase.from("clarification_events").select("*").eq("clarification_id", c.id).order("at", { ascending: false }),
      supabase.from("clarification_attachments").select("*").eq("clarification_id", c.id).order("created_at"),
      supabase.from("clarification_messages").select("*").eq("clarification_id", c.id).order("created_at"),
    ]);
    return {
      clarification: c,
      questions: questionsRes.data ?? [],
      changes: changesRes.data ?? [],
      events: eventsRes.data ?? [],
      attachments: attachmentsRes.data ?? [],
      messages: messagesRes.data ?? [],
    };
  });

/** Vendor records a reference file they uploaded to the clarification bucket. */
export const recordClarificationAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        clarificationId: z.string().uuid(),
        filePath: z.string().min(1),
        fileName: z.string().min(1),
        contentType: z.string().optional(),
        sizeBytes: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("workspace_id")
      .eq("id", data.clarificationId)
      .single();
    if (!c) throw new Error("Clarification not found");
    const { error } = await supabase.from("clarification_attachments").insert({
      clarification_id: data.clarificationId,
      workspace_id: c.workspace_id,
      uploader: "vendor",
      uploaded_by: userId,
      file_path: data.filePath,
      file_name: data.fileName,
      content_type: data.contentType ?? null,
      size_bytes: data.sizeBytes ?? null,
    });
    if (error) throw new Error(error.message);
    await logEvent(supabase, data.clarificationId, c.workspace_id, userId, "updated", { attachment: data.fileName });
    return { ok: true };
  });

/** PUBLIC: buyer records a file they uploaded to the clarification bucket. */
export const addClarificationAttachmentPublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(6),
        filePath: z.string().min(1),
        fileName: z.string().min(1),
        contentType: z.string().optional(),
        sizeBytes: z.number().int().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = anonClient();
    const { data: result, error } = await supabase.rpc("add_clarification_attachment_public", {
      p_token: data.token,
      p_path: data.filePath,
      p_name: data.fileName,
      p_type: data.contentType ?? null,
      p_size: data.sizeBytes ?? null,
    });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (result ?? {}) as any;
    if (!r.ok) throw new Error(r.error ?? "Could not record the attachment");
    return r;
  });

/* ---------- follow-up conversation thread ---------- */

/** Vendor posts a follow-up message on the clarification thread. */
export const postClarificationMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ clarificationId: z.string().uuid(), body: z.string().min(1).max(5000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const userId = context.userId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authorName = ((context.claims as any)?.email as string | undefined) ?? null;
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("workspace_id")
      .eq("id", data.clarificationId)
      .single();
    if (!c) throw new Error("Clarification not found");
    const { error } = await supabase.from("clarification_messages").insert({
      clarification_id: data.clarificationId,
      workspace_id: c.workspace_id,
      author: "vendor",
      author_name: authorName,
      body: data.body.trim(),
    });
    if (error) throw new Error(error.message);
    await logEvent(supabase, data.clarificationId, c.workspace_id, userId, "updated", { message: true, by: authorName });
    return { ok: true };
  });

/** PUBLIC: buyer posts a follow-up message on the clarification thread. */
export const postClarificationMessagePublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ token: z.string().min(6), name: z.string().max(200).optional(), body: z.string().min(1).max(5000) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = anonClient();
    const { data: result, error } = await supabase.rpc("post_clarification_message_public", {
      p_token: data.token,
      p_name: data.name ?? null,
      p_body: data.body,
    });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (result ?? {}) as any;
    if (!r.ok) throw new Error(r.error ?? "Could not post your message");
    if (r.seller_email) {
      try {
        await sendEmail({
          to: r.seller_email,
          subject: `New clarification message — quote ${r.quote_number ?? ""}`.trim(),
          html:
            `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a">` +
            `<p>The buyer posted a follow-up message on the clarification for quote ` +
            `<strong>${escapeHtml(String(r.quote_number ?? ""))}</strong>. Open wekbench to view and reply.</p></div>`,
        });
      } catch {
        /* notify best-effort */
      }
    }
    return r;
  });

/** Run (or re-run) the AI feedback extraction for a clarification — vendor side. */
export const runClarificationFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ clarificationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    // Membership gate: RLS lets only members read the row.
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("id")
      .eq("id", data.clarificationId)
      .single();
    if (!c) throw new Error("Clarification not found");
    const { extractClarificationFeedback } = await import("@/lib/clarification-feedback.server");
    const feedback = await extractClarificationFeedback(data.clarificationId);
    return { feedback };
  });

/**
 * Buyer-loop fallback: record a buyer's EMAILED clarification reply (no link click).
 * AI maps the pasted text onto the open questions, locks the clarification, refreshes feedback.
 */
export const recordBuyerReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        clarificationId: z.string().uuid(),
        text: z.string().min(1).max(20000),
        signerName: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    // Membership gate: RLS lets only members read the row.
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("id, status")
      .eq("id", data.clarificationId)
      .single();
    if (!c) throw new Error("Clarification not found");
    if (c.status === "answered" || c.status === "closed") {
      throw new Error("This clarification is already answered. Start a new round to record more.");
    }
    const { mapBuyerReplyToAnswers } = await import("@/lib/clarification-feedback.server");
    const res = await mapBuyerReplyToAnswers(data.clarificationId, data.text, data.signerName ?? null);
    try {
      const wsId = await resolveWorkspaceId(context.supabase, context.userId);
      const { emitProductEvent } = await import("@/lib/telemetry.server");
      await emitProductEvent(context.supabase, {
        workspaceId: wsId,
        userId: context.userId,
        event: "buyer_reply_recorded",
        props: { matched: res.matched },
      });
    } catch {
      /* best-effort */
    }
    return res;
  });

/** Draft AI clarification questions for a quote's RFQ (cheap, cached, grounded). */
export const suggestClarificationQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quoteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const { data: q } = await supabase.from("quotes").select("id").eq("id", data.quoteId).single();
    if (!q) throw new Error("Quote not found");
    const { suggestQuestionsForQuote } = await import("@/lib/clarification-suggest.server");
    return await suggestQuestionsForQuote(data.quoteId);
  });

/** Add a manual question to a clarification. */
export const addClarificationQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        clarificationId: z.string().uuid(),
        question: z.string().min(1).max(2000),
        lineNo: z.number().int().optional(),
        lineItemId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("workspace_id")
      .eq("id", data.clarificationId)
      .single();
    if (!c) throw new Error("Clarification not found");
    const { data: maxRow } = await supabase
      .from("clarification_questions")
      .select("sort")
      .eq("clarification_id", data.clarificationId)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("clarification_questions").insert({
      clarification_id: data.clarificationId,
      workspace_id: c.workspace_id,
      question: data.question,
      line_no: data.lineNo ?? null,
      line_item_id: data.lineItemId ?? null,
      source: "manual",
      sort: (maxRow?.sort ?? 0) + 1,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Curate a question: edit wording and/or toggle whether it's included. */
export const updateClarificationQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        question: z.string().min(1).max(2000).optional(),
        included: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.question !== undefined) patch.question = data.question;
    if (data.included !== undefined) patch.included = data.included;
    if (Object.keys(patch).length === 0) return { ok: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).from("clarification_questions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove a question from a clarification. */
export const deleteClarificationQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).from("clarification_questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Send to buyer: status draft → sent. Returns the shareable /c/<token> link. */
export const sendClarification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ clarificationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("id, workspace_id, share_token, status")
      .eq("id", data.clarificationId)
      .single();
    if (!c) throw new Error("Clarification not found");

    const { count } = await supabase
      .from("clarification_questions")
      .select("id", { count: "exact", head: true })
      .eq("clarification_id", c.id)
      .eq("included", true);
    if ((count ?? 0) === 0) throw new Error("Include at least one question before sending");

    if (c.status === "draft") {
      await supabase
        .from("quote_clarifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", c.id);
      await logEvent(supabase, c.id, c.workspace_id, userId, "sent");
    }
    return { ok: true, token: c.share_token as string, path: `/c/${c.share_token}` };
  });

/** Apply a buyer-proposed qty/add change onto the quote (human-in-the-loop). */
export const applyClarificationChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ changeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { data: ch } = await supabase.from("clarification_changes").select("*").eq("id", data.changeId).single();
    if (!ch) throw new Error("Change not found");
    if (ch.vendor_applied) return { ok: true, already: true };
    const { data: c } = await supabase
      .from("quote_clarifications")
      .select("quote_id, workspace_id")
      .eq("id", ch.clarification_id)
      .single();
    if (!c) throw new Error("Clarification not found");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (ch.payload ?? {}) as any;

    if (ch.kind === "qty" && ch.line_item_id) {
      const qty = Number(payload.qty);
      if (!Number.isFinite(qty) || qty < 0) throw new Error("Invalid quantity");
      const { error } = await supabase.from("quote_line_items").update({ qty }).eq("id", ch.line_item_id);
      if (error) throw new Error(error.message);
    } else if (ch.kind === "add") {
      const { data: maxRow } = await supabase
        .from("quote_line_items")
        .select("line_no")
        .eq("quote_id", c.quote_id)
        .order("line_no", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNo = (maxRow?.line_no ?? 0) + 1;
      const { error } = await supabase.from("quote_line_items").insert({
        quote_id: c.quote_id,
        workspace_id: c.workspace_id,
        line_no: nextNo,
        description: String(payload.description ?? "New item"),
        qty: Number(payload.qty ?? 1) || 1,
        unit: payload.unit ?? null,
        brand: payload.brand ?? null,
        model: payload.model ?? null,
        source: "manual",
      });
      if (error) throw new Error(error.message);
    } else {
      throw new Error("Unsupported change");
    }

    await supabase
      .from("clarification_changes")
      .update({ vendor_applied: true, applied_at: new Date().toISOString(), applied_by: userId })
      .eq("id", ch.id);
    await recomputeQuoteTotals(supabase, c.quote_id);
    await logEvent(supabase, ch.clarification_id, c.workspace_id, userId, "applied", { kind: ch.kind, change_id: ch.id });
    return { ok: true };
  });

/* ---------- public, tokenized (no auth) ---------- */

/** PUBLIC: load a sent clarification + questions + line items by token. */
export const getClarificationPublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(6) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = anonClient();
    const { data: result, error } = await supabase.rpc("get_clarification_public", { p_token: data.token });
    if (error) throw new Error(error.message);
    return { data: result ?? null };
  });

/** PUBLIC: buyer submits answers, a comment, a name, and proposed qty/add changes. */
export const submitClarificationPublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(6),
        name: z.string().max(200).optional(),
        comment: z.string().max(5000).optional(),
        answers: z
          .array(z.object({ id: z.string().uuid(), answer: z.string().max(5000).optional() }))
          .optional(),
        changes: z
          .array(
            z.object({
              kind: z.enum(["qty", "add"]),
              lineNo: z.number().int().optional(),
              lineItemId: z.string().uuid().optional(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              payload: z.record(z.any()).optional(),
            }),
          )
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = anonClient();
    const changes = (data.changes ?? []).map((ch) => ({
      kind: ch.kind,
      line_no: ch.lineNo ?? null,
      line_item_id: ch.lineItemId ?? null,
      payload: ch.payload ?? {},
    }));
    const { data: result, error } = await supabase.rpc("submit_clarification_public", {
      p_token: data.token,
      p_name: data.name ?? null,
      p_comment: data.comment ?? null,
      p_answers: data.answers ?? [],
      p_changes: changes,
    });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = (result ?? {}) as any;
    if (!r.ok) throw new Error(r.error ?? "Could not submit your response");

    // Notify the vendor that the buyer responded (best-effort; never blocks submit).
    if (r.seller_email) {
      try {
        const who = data.name ? escapeHtml(data.name) : "The buyer";
        const html =
          `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6">` +
          `<h2 style="margin:0 0 8px">Clarification answered</h2>` +
          `<p style="margin:0 0 12px">${who} has answered your clarification questions for quote ` +
          `<strong>${escapeHtml(String(r.quote_number ?? ""))}</strong>.</p>` +
          `<p style="margin:0 0 12px;color:#666;font-size:13px">Open wekbench to review the answers and any proposed changes, then proceed to quoting.</p>` +
          `</div>`;
        const emailRes = await sendEmail({
          to: r.seller_email,
          subject: `Clarification answered — quote ${r.quote_number ?? ""}`.trim(),
          html,
        });
        r.notified = emailRes.sent;
        if (emailRes.skipped) r.notifySkipped = emailRes.skipped;
        if (emailRes.error) r.notifyError = emailRes.error;
      } catch (e) {
        r.notified = false;
        r.notifyError = e instanceof Error ? e.message : "notify failed";
      }
    }
    return r;
  });
