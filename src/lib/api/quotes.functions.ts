import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { priceAtQty } from "@/lib/sourcing/pricing";
import { createOrderForQuote } from "./orders.functions";
import { resolveWorkspaceId } from "./workspace.functions";

/* ---------- helpers ---------- */

async function nextQuoteNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workspaceId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const { data } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("workspace_id", workspaceId)
    .like("quote_number", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let n = 1;
  if (data?.quote_number) {
    const parsed = parseInt(String(data.quote_number).split("-").pop() ?? "0", 10);
    if (!Number.isNaN(parsed)) n = parsed + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

function computeUnitPrice(cost: number | null, marginPct: number | null) {
  if (cost == null) return null;
  const m = marginPct ?? 0;
  return Number((cost * (1 + m / 100)).toFixed(4));
}

/* ---------- approveExtraction: extraction → RFQ → draft Quote ---------- */

export const approveExtractionToRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        docType: z
          .enum(["rfq", "purchase_order", "rfq_amendment", "po_amendment", "unknown"])
          .optional(),
        notes: z.string().max(2000).optional(),
        createQuote: z.boolean().default(true),
        defaultMarginPct: z.number().min(0).max(500).default(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: doc, error: docErr } = await supabase
      .from("extracted_documents")
      .select(
        "id, workspace_id, doc_type, buyer_ref, summary, currency, due_date, inbound_email_id, inbound_emails(from_address, from_name)",
      )
      .eq("id", data.documentId)
      .maybeSingle();
    if (docErr || !doc) throw new Error("Document not found");
    if (!doc.workspace_id) throw new Error("Extracted document has no workspace");
    const workspaceId: string = doc.workspace_id;

    // mark approved
    const { error: updErr } = await supabase
      .from("extracted_documents")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        status: "approved",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        ...(data.docType ? { doc_type: data.docType } : {}),
        ...(data.notes !== undefined ? { review_notes: data.notes } : {}),
      } as any)
      .eq("id", data.documentId);
    if (updErr) throw new Error(updErr.message);

    // Upsert RFQ (one per extracted doc)
    let rfqId: string;
    const { data: existingRfq } = await supabase
      .from("rfqs")
      .select("id")
      .eq("extracted_document_id", data.documentId)
      .maybeSingle();
    if (existingRfq) {
      rfqId = existingRfq.id;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const email = (doc as any).inbound_emails as { from_address?: string; from_name?: string } | null;
      const { data: rfq, error: rfqErr } = await supabase
        .from("rfqs")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({
          workspace_id: workspaceId,
          extracted_document_id: doc.id,
          buyer_ref: doc.buyer_ref,
          summary: doc.summary,
          currency: doc.currency,
          due_date: doc.due_date,
          buyer_email: email?.from_address ?? null,
          buyer_name: email?.from_name ?? null,
          status: "open",
        } as any)
        .select("id")
        .single();
      if (rfqErr || !rfq) throw new Error(rfqErr?.message ?? "Could not create RFQ");
      rfqId = rfq.id;
    }

    let quoteId: string | null = null;
    if (data.createQuote) {
      const { data: existingQuote } = await supabase
        .from("quotes")
        .select("id")
        .eq("rfq_id", rfqId)
        .maybeSingle();
      if (existingQuote) {
        quoteId = existingQuote.id;
      } else {
        // fetch extracted line items
        const { data: items } = await supabase
          .from("extracted_line_items")
          .select(
            "id, line_no, requested_description, requested_brand, requested_model, requested_qty, requested_unit, target_price, matched_catalog_item_id, match_status",
          )
          .eq("document_id", doc.id)
          .order("line_no");

        // pull catalog costs for matched items
        const catalogIds = (items ?? [])
          .map((i) => i.matched_catalog_item_id)
          .filter((v): v is string => !!v);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let catalogCosts: Record<string, any> = {};
        if (catalogIds.length > 0) {
          const { data: cats } = await supabase
            .from("catalog_items")
            .select("id, unit_price, currency")
            .in("id", catalogIds);
          for (const c of cats ?? []) catalogCosts[c.id] = c;
        }

        const number = await nextQuoteNumber(supabase, doc.workspace_id!);
        const { data: quote, error: qErr } = await supabase
          .from("quotes")
          .insert({
            workspace_id: doc.workspace_id,
            rfq_id: rfqId,
            quote_number: number,
            status: "draft",
            currency: doc.currency,
            margin_pct: data.defaultMarginPct,
            subtotal: 0,
            total: 0,
          })
          .select("id")
          .single();
        if (qErr || !quote) throw new Error(qErr?.message ?? "Could not create quote");
        quoteId = quote.id;

        if (items && items.length > 0) {
          const rows = items.map((li) => {
            const cat = li.matched_catalog_item_id ? catalogCosts[li.matched_catalog_item_id] : null;
            const unitCost = cat?.unit_price != null ? Number(cat.unit_price) : null;
            const unitPrice = computeUnitPrice(unitCost, data.defaultMarginPct);
            return {
              quote_id: quoteId!,
              workspace_id: doc.workspace_id,
              line_no: li.line_no,
              description: li.requested_description,
              brand: li.requested_brand,
              model: li.requested_model,
              qty: li.requested_qty ?? 1,
              unit: li.requested_unit,
              unit_cost: unitCost,
              unit_price: unitPrice,
              margin_pct: data.defaultMarginPct,
              catalog_item_id: li.matched_catalog_item_id,
              extracted_line_item_id: li.id,
              source: li.match_status === "matched" ? "catalog" : li.match_status === "sourcing" ? "sourcing" : "manual",
            };
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: liErr } = await supabase.from("quote_line_items").insert(rows as any);
          if (liErr) console.error("[approve] line items insert", liErr);
          await recomputeQuoteTotals(supabase, quoteId!);
        }
      }
    }

    return { rfqId, quoteId };
  });

/* ---------- recompute totals ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recomputeQuoteTotals(supabase: any, quoteId: string) {
  const { data: lines } = await supabase
    .from("quote_line_items")
    .select("qty, unit_price, unit_cost, discount_pct")
    .eq("quote_id", quoteId);
  const { data: q } = await supabase
    .from("quotes")
    .select("tax_pct")
    .eq("id", quoteId)
    .single();
  let subtotal = 0;
  let costTotal = 0;
  for (const l of lines ?? []) {
    const price = Number(l.unit_price ?? 0);
    const cost = Number(l.unit_cost ?? 0);
    const qty = Number(l.qty ?? 0);
    const disc = Number(l.discount_pct ?? 0);
    const gross = price * qty;
    const net = gross * (1 - disc / 100);
    subtotal += net;
    costTotal += cost * qty;
  }
  const taxPct = Number(q?.tax_pct ?? 0);
  const taxAmount = Number((subtotal * (taxPct / 100)).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));
  const margin = subtotal > 0 ? Number((((subtotal - costTotal) / subtotal) * 100).toFixed(3)) : 0;
  await supabase
    .from("quotes")
    .update({
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount: taxAmount,
      total,
      margin_pct: margin,
    })
    .eq("id", quoteId);
}

/* ---------- list / detail / mutations ---------- */

export const listQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quotes")
      .select(
        "id, quote_number, status, stage, currency, subtotal, total, margin_pct, valid_until, sent_at, created_at, updated_at, rfq_id, title, buyer_name, sector, assignee, rfqs(buyer_ref, buyer_name, buyer_email, summary)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { quotes: data ?? [] };
  });

export const listRfqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rfqs")
      .select(
        "id, buyer_ref, summary, currency, due_date, status, buyer_name, buyer_email, created_at, extracted_document_id, quotes(id, status, quote_number)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rfqs: data ?? [] };
  });

export const getRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rfq, error } = await context.supabase
      .from("rfqs")
      .select(
        "id, workspace_id, buyer_ref, summary, currency, due_date, status, buyer_email, buyer_name, buyer_company, notes, created_at, extracted_document_id, extracted_documents(inbound_email_id, confidence, inbound_emails(subject, from_address, from_name, received_at, text_body, html_body, attachments)), quotes(id, quote_number, status, total)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error || !rfq) throw new Error("RFQ not found");
    // line items live on the extraction
    const { data: items } = await context.supabase
      .from("extracted_line_items")
      .select(
        "id, line_no, requested_description, requested_brand, requested_model, requested_qty, requested_unit, target_price, match_status, match_confidence, lookup_note",
      )
      .eq("document_id", rfq.extracted_document_id)
      .order("line_no");
    return { rfq, items: items ?? [] };
  });

export const ensureQuoteForRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ rfqId: z.string().uuid(), defaultMarginPct: z.number().min(0).max(500).default(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("quotes")
      .select("id")
      .eq("rfq_id", data.rfqId)
      .maybeSingle();
    if (existing) return { quoteId: existing.id };

    const { data: rfq, error } = await supabase
      .from("rfqs")
      .select("id, workspace_id, currency, extracted_document_id")
      .eq("id", data.rfqId)
      .single();
    if (error || !rfq) throw new Error("RFQ not found");

    const { data: items } = await supabase
      .from("extracted_line_items")
      .select(
        "id, line_no, requested_description, requested_brand, requested_model, requested_qty, requested_unit, matched_catalog_item_id, match_status",
      )
      .eq("document_id", rfq.extracted_document_id)
      .order("line_no");

    const catalogIds = (items ?? [])
      .map((i) => i.matched_catalog_item_id)
      .filter((v): v is string => !!v);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catalogCosts: Record<string, any> = {};
    if (catalogIds.length > 0) {
      const { data: cats } = await supabase
        .from("catalog_items")
        .select("id, unit_price")
        .in("id", catalogIds);
      for (const c of cats ?? []) catalogCosts[c.id] = c;
    }

    const number = await nextQuoteNumber(supabase, rfq.workspace_id);
    const { data: q, error: qErr } = await supabase
      .from("quotes")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: rfq.workspace_id,
        rfq_id: rfq.id,
        quote_number: number,
        status: "draft",
        currency: rfq.currency,
        margin_pct: data.defaultMarginPct,
        subtotal: 0,
        total: 0,
      } as any)
      .select("id")
      .single();
    if (qErr || !q) throw new Error(qErr?.message ?? "Could not create quote");

    if (items && items.length > 0) {
      const rows = items.map((li) => {
        const cat = li.matched_catalog_item_id ? catalogCosts[li.matched_catalog_item_id] : null;
        const unitCost = cat?.unit_price != null ? Number(cat.unit_price) : null;
        const unitPrice = computeUnitPrice(unitCost, data.defaultMarginPct);
        return {
          quote_id: q.id,
          workspace_id: rfq.workspace_id,
          line_no: li.line_no,
          description: li.requested_description,
          brand: li.requested_brand,
          model: li.requested_model,
          qty: li.requested_qty ?? 1,
          unit: li.requested_unit,
          unit_cost: unitCost,
          unit_price: unitPrice,
          margin_pct: data.defaultMarginPct,
          catalog_item_id: li.matched_catalog_item_id,
          extracted_line_item_id: li.id,
          source: li.match_status === "matched" ? "catalog" : li.match_status === "sourcing" ? "sourcing" : "manual",
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("quote_line_items").insert(rows as any);
      await recomputeQuoteTotals(supabase, q.id);
    }
    return { quoteId: q.id };
  });

export const getQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: quote, error } = await context.supabase
      .from("quotes")
      .select(
        "id, workspace_id, quote_number, status, currency, subtotal, tax_pct, tax_amount, total, margin_pct, valid_until, notes, sent_at, created_at, incoterm, delivery_location, lead_time_days, site_address, site_contact_name, site_contact_phone, install_window, rfq_id, title, buyer_name, sector, assignee, rfqs(buyer_ref, buyer_name, buyer_email, buyer_company, summary, due_date)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error || !quote) throw new Error("Quote not found");
    const { data: items } = await context.supabase
      .from("quote_line_items")
      .select(
        "*, catalog_items(stock_qty, reserved_qty, warehouse_location, oem, is_authorised, lead_time_days)",
      )
      .eq("quote_id", data.id)
      .order("line_no");
    return { quote, items: items ?? [] };
  });

export const updateQuoteHeader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quoteId: z.string().uuid(),
        patch: z
          .object({
            incoterm: z.string().max(32).nullable().optional(),
            delivery_location: z.string().max(255).nullable().optional(),
            lead_time_days: z.number().int().min(0).max(3650).nullable().optional(),
            tax_pct: z.number().min(0).max(100).optional(),
            valid_until: z.string().nullable().optional(),
            notes: z.string().max(4000).nullable().optional(),
            site_address: z.string().max(1000).nullable().optional(),
            site_contact_name: z.string().max(255).nullable().optional(),
            site_contact_phone: z.string().max(64).nullable().optional(),
            install_window: z.string().max(255).nullable().optional(),
          })
          .strict(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("quotes").update(data.patch as any).eq("id", data.quoteId);
    if (error) throw new Error(error.message);
    if (data.patch.tax_pct !== undefined) {
      await recomputeQuoteTotals(context.supabase, data.quoteId);
    }
    return { ok: true };
  });

export const updateQuoteLineItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lineItemId: z.string().uuid(),
        patch: z
          .object({
            description: z.string().min(1).max(2000).optional(),
            brand: z.string().max(255).nullable().optional(),
            model: z.string().max(255).nullable().optional(),
            qty: z.number().min(0).optional(),
            unit: z.string().max(64).nullable().optional(),
            unit_cost: z.number().nullable().optional(),
            unit_price: z.number().nullable().optional(),
            margin_pct: z.number().nullable().optional(),
            notes: z.string().max(2000).nullable().optional(),
            line_type: z
              .enum([
                "hardware",
                "software",
                "service",
                "labour",
                "travel",
                "training",
                "subscription",
              ])
              .optional(),
            section: z.string().max(255).nullable().optional(),
            discount_pct: z.number().min(0).max(100).optional(),
          })
          .strict(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // If both cost and margin are provided, derive price; if margin changed and cost exists, derive price.
    const patch = { ...data.patch };
    if (patch.unit_cost != null && patch.margin_pct != null && patch.unit_price == null) {
      patch.unit_price = computeUnitPrice(patch.unit_cost, patch.margin_pct);
    }
    const { data: updated, error } = await context.supabase
      .from("quote_line_items")
      .update(patch)
      .eq("id", data.lineItemId)
      .select("quote_id")
      .single();
    if (error || !updated) throw new Error(error?.message ?? "Update failed");
    await recomputeQuoteTotals(context.supabase, updated.quote_id);
    return { ok: true };
  });

export const applyOfferToLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ lineItemId: z.string().uuid(), offerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: offer } = await supabase
      .from("provider_offers")
      .select("id, identifier, distributor_name, external_part_id, price_breaks, currency")
      .eq("id", data.offerId)
      .maybeSingle();
    if (!offer) throw new Error("Offer not found");
    const { data: line } = await supabase
      .from("quote_line_items")
      .select("id, quote_id, qty, margin_pct")
      .eq("id", data.lineItemId)
      .maybeSingle();
    if (!line) throw new Error("Line item not found");

    const at = priceAtQty(offer.price_breaks, Number(line.qty) || 1);
    if (!at) throw new Error("Selected offer has no usable price");
    const unitPrice = computeUnitPrice(at.price, line.margin_pct ?? 0);

    const { error } = await supabase
      .from("quote_line_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        unit_cost: at.price,
        unit_price: unitPrice,
        selected_offer_id: offer.id,
        source_distributor: offer.distributor_name,
        mpn: offer.identifier,
        external_part_id: offer.external_part_id,
        price_fetched_at: new Date().toISOString(),
      } as any)
      .eq("id", data.lineItemId);
    if (error) throw new Error(error.message);
    await recomputeQuoteTotals(supabase, line.quote_id);
    return { ok: true, unitCost: at.price, currency: at.currency, distributor: offer.distributor_name };
  });

export const addQuoteLineItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quoteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: q } = await context.supabase
      .from("quotes")
      .select("workspace_id")
      .eq("id", data.quoteId)
      .single();
    if (!q) throw new Error("Quote not found");
    const { data: maxRow } = await context.supabase
      .from("quote_line_items")
      .select("line_no")
      .eq("quote_id", data.quoteId)
      .order("line_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNo = (maxRow?.line_no ?? 0) + 1;
    const { error } = await context.supabase.from("quote_line_items").insert({
      quote_id: data.quoteId,
      workspace_id: q.workspace_id,
      line_no: nextNo,
      description: "New item",
      qty: 1,
      source: "manual",
    });
    if (error) throw new Error(error.message);
    await recomputeQuoteTotals(context.supabase, data.quoteId);
    return { ok: true };
  });

export const deleteQuoteLineItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ lineItemId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: li } = await context.supabase
      .from("quote_line_items")
      .select("quote_id")
      .eq("id", data.lineItemId)
      .single();
    const { error } = await context.supabase.from("quote_line_items").delete().eq("id", data.lineItemId);
    if (error) throw new Error(error.message);
    if (li?.quote_id) await recomputeQuoteTotals(context.supabase, li.quote_id);
    return { ok: true };
  });

export const updateQuoteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quoteId: z.string().uuid(),
        status: z.enum(["draft", "sent", "accepted", "declined", "expired"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "sent") patch.sent_at = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("quotes").update(patch as any).eq("id", data.quoteId);
    if (error) throw new Error(error.message);
    // also mark the RFQ as quoted
    if (data.status === "sent") {
      const { data: q } = await context.supabase.from("quotes").select("rfq_id").eq("id", data.quoteId).single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (q?.rfq_id) await context.supabase.from("rfqs").update({ status: "quoted" } as any).eq("id", q.rfq_id);
    }
    // accepting a quote spins up an order to track
    if (data.status === "accepted") {
      try {
        await createOrderForQuote(context.supabase, data.quoteId);
      } catch (e) {
        console.error("[quote accept] order creation failed", e);
      }
    }
    return { ok: true };
  });

/* ---------- updateQuoteStage: pipeline drag-and-drop ---------- */

export const updateQuoteStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quoteId: z.string().uuid(),
        stage: z.enum([
          "drafted",
          "submitted",
          "clarification",
          "reviewing",
          "won",
          "lost",
          "expired",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase
      .from("quotes")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ stage: data.stage } as any)
      .eq("id", data.quoteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- dashboard activity feed ---------- */

type ActivityEvent = {
  id: string;
  type: "rfq" | "quote";
  text: string;
  meta: string;
  at: string;
};

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [{ data: rfqRows }, { data: quoteRows }] = await Promise.all([
      supabase
        .from("rfqs")
        .select("id, buyer_ref, buyer_name, buyer_company, summary, status, created_at")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("quotes")
        .select(
          "id, quote_number, status, total, currency, sent_at, created_at, rfqs(buyer_name, buyer_company, buyer_ref)",
        )
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const events: ActivityEvent[] = [];

    for (const r of rfqRows ?? []) {
      const who = r.buyer_company || r.buyer_name || r.buyer_ref || "a buyer";
      events.push({
        id: `rfq-${r.id}`,
        type: "rfq",
        text: `New RFQ from ${who}`,
        meta: r.summary || "RFQ received",
        at: r.created_at,
      });
    }

    for (const q of quoteRows ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rfq = (q as any).rfqs as { buyer_name?: string | null; buyer_company?: string | null; buyer_ref?: string | null } | null;
      const label =
        q.status === "accepted"
          ? "accepted"
          : q.status === "declined"
            ? "declined"
            : q.status === "sent" || q.sent_at
              ? "sent"
              : "drafted";
      const who = rfq?.buyer_company || rfq?.buyer_name || rfq?.buyer_ref;
      let text = `Quote ${q.quote_number} ${label}`;
      if (label !== "drafted" && who) text += ` for ${who}`;
      const total = q.total != null ? Number(q.total) : null;
      const meta =
        total != null && !Number.isNaN(total)
          ? `${q.currency ?? ""} ${total.toLocaleString()}`.trim()
          : `Status: ${q.status}`;
      events.push({
        id: `quote-${q.id}`,
        type: "quote",
        text,
        meta,
        at: label === "sent" && q.sent_at ? q.sent_at : q.created_at,
      });
    }

    events.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    return { events: events.slice(0, 10) };
  });

/* ---------- createQuote: standalone (no-RFQ) quote ---------- */

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1),
        buyer: z.string().min(1),
        sector: z.string().optional(),
        assignee: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const workspaceId = await resolveWorkspaceId(supabase, context.userId);
    if (!workspaceId) throw new Error("No workspace found for this user");

    const quote_number = await nextQuoteNumber(supabase, workspaceId);

    const { data: created, error } = await supabase
      .from("quotes")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: workspaceId,
        rfq_id: null,
        quote_number,
        status: "draft",
        title: data.title,
        buyer_name: data.buyer,
        sector: data.sector ?? null,
        assignee: data.assignee ?? null,
      } as any)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create quote");
    return { id: created.id as string };
  });
