/**
 * Buyer side (self-serve concierge): sourcing requests.
 * A buyer lists what they need; priceSourcingRequest runs the existing sourcing router
 * per line and converts each best offer into the buyer's local currency, so they see
 * landed cost to their country. Reuses routeItems + convertAmount — no new pricing plumbing.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";
import { convertAmount } from "@/lib/fx.server";

async function wsId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<string> {
  const id = await resolveWorkspaceId(supabase, userId);
  if (!id) throw new Error("No workspace");
  return id;
}

const itemInput = z.object({
  description: z.string().max(2000).optional(),
  brand: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  mpn: z.string().max(255).optional(),
  qty: z.number().min(0).optional(),
  unit: z.string().max(64).optional(),
});

export const createSourcingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        destinationCountry: z.string().max(120).optional(),
        destinationCity: z.string().max(120).optional(),
        currency: z.string().max(8).optional(),
        notes: z.string().max(2000).optional(),
        items: z.array(itemInput).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const { data: req, error } = await context.supabase
      .from("sourcing_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id,
        title: data.title,
        destination_country: data.destinationCountry ?? null,
        destination_city: data.destinationCity ?? null,
        currency: data.currency ?? "GHS",
        notes: data.notes ?? null,
        status: "draft",
      } as any)
      .select("id")
      .single();
    if (error || !req) throw new Error(error?.message ?? "Could not create request");

    const rows = data.items.map((it, idx) => ({
      request_id: req.id,
      workspace_id,
      line_no: idx + 1,
      description: it.description ?? null,
      brand: it.brand ?? null,
      model: it.model ?? null,
      mpn: it.mpn ?? null,
      qty: it.qty ?? 1,
      unit: it.unit ?? null,
    }));
    const { error: liErr } = await context.supabase.from("sourcing_request_items").insert(rows as never);
    if (liErr) throw new Error(liErr.message);

    try {
      const { emitProductEvent } = await import("@/lib/telemetry.server");
      await emitProductEvent(context.supabase, {
        workspaceId: workspace_id,
        userId: context.userId,
        event: "sourcing_request_created",
        props: { lines: rows.length },
      });
    } catch {
      /* best-effort */
    }
    return { id: req.id as string };
  });

/** Run the sourcing router per line and store best offer + landed (local-currency) price. */
export const priceSourcingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const { data: req } = await context.supabase
      .from("sourcing_requests")
      .select("id, currency, workspace_id, freight_pct, duty_pct, vat_pct")
      .eq("id", data.id)
      .single();
    if (!req) throw new Error("Request not found");
    const { data: items } = await context.supabase
      .from("sourcing_request_items")
      .select("id, line_no, description, brand, model, mpn, qty")
      .eq("request_id", data.id)
      .order("line_no");
    const lines = items ?? [];
    if (lines.length === 0) return { priced: 0, landedSubtotal: 0, currency: req.currency };

    const { routeItems } = await import("@/lib/sourcing/router.server");
    const routed = await routeItems(
      lines.map((li) => ({
        description: li.description,
        brand: li.brand,
        model: li.model,
        mpn: li.mpn,
        qty: Number(li.qty ?? 1),
      })),
      { supabase: context.supabase, workspaceId: req.workspace_id, currency: req.currency },
    );

    let priced = 0;
    let landedSubtotal = 0;
    for (let i = 0; i < lines.length; i++) {
      const li = lines[i];
      const r = routed.items[i];
      // pick the cheapest offer across this line's providers
      let best: { price: number; currency: string; distributor: string } | null = null;
      let offerCount = 0;
      for (const p of r?.providers ?? []) {
        offerCount += p.offerCount ?? 0;
        if (p.bestPrice && (best == null || p.bestPrice.price < best.price)) best = p.bestPrice;
      }
      let converted: number | null = null;
      let rate: number | null = null;
      if (best) {
        const c = await convertAmount(best.price, best.currency, req.currency);
        if (c) {
          converted = c.amount;
          rate = c.rate;
        }
      }
      if (best) {
        priced++;
        landedSubtotal += (converted ?? 0) * Number(li.qty ?? 1);
      }
      await context.supabase
        .from("sourcing_request_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          category: r?.category ?? null,
          best_distributor: best?.distributor ?? null,
          best_price: best?.price ?? null,
          best_currency: best?.currency ?? null,
          converted_unit_price: converted,
          fx_rate: rate,
          offer_count: offerCount,
          item_status: best ? "priced" : "no_offer",
          priced_at: new Date().toISOString(),
        } as any)
        .eq("id", li.id);
    }

    // Landed cost = goods + freight, then duty on the customs value, then VAT/levies on top.
    const freightPct = Number(req.freight_pct ?? 12);
    const dutyPct = Number(req.duty_pct ?? 20);
    const vatPct = Number(req.vat_pct ?? 21.9);
    const goods = landedSubtotal;
    const freight = goods * (freightPct / 100);
    const customsValue = goods + freight;
    const duty = customsValue * (dutyPct / 100);
    const vat = (customsValue + duty) * (vatPct / 100);
    const landedTotal = customsValue + duty + vat;

    await context.supabase
      .from("sourcing_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        status: "priced",
        goods_subtotal: goods,
        freight_est: freight,
        duty_est: duty,
        vat_est: vat,
        landed_total: landedTotal,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", data.id);

    try {
      const { emitProductEvent } = await import("@/lib/telemetry.server");
      await emitProductEvent(context.supabase, {
        workspaceId: workspace_id,
        userId: context.userId,
        event: "sourcing_request_priced",
        props: { lines: lines.length, priced, goods: Math.round(goods), landed_total: Math.round(landedTotal) },
      });
    } catch {
      /* best-effort */
    }
    return {
      priced,
      total: lines.length,
      currency: req.currency,
      goods,
      freight,
      duty,
      vat,
      landedTotal,
    };
  });

/** Turn a priced sourcing request into a tracked import order (reuses the orders pipeline). */
export const placeSourcingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const { data: req } = await context.supabase
      .from("sourcing_requests")
      .select("id, title, currency, status, order_id, landed_total, goods_subtotal, destination_country")
      .eq("id", data.id)
      .single();
    if (!req) throw new Error("Request not found");
    if (req.order_id) return { orderId: req.order_id as string, already: true };
    if (req.status !== "priced") throw new Error("Price the request before ordering");

    const { data: items } = await context.supabase
      .from("sourcing_request_items")
      .select("line_no, description, brand, model, qty, unit, converted_unit_price")
      .eq("request_id", data.id)
      .order("line_no");
    const lines = items ?? [];

    // Order number: ORD-YYYY-NNNN
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    const { data: last } = await context.supabase
      .from("orders")
      .select("order_number")
      .eq("workspace_id", workspace_id)
      .like("order_number", `${prefix}%`)
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    let n = 1;
    if (last?.order_number) {
      const parsed = parseInt(String(last.order_number).split("-").pop() ?? "0", 10);
      if (!Number.isNaN(parsed)) n = parsed + 1;
    }
    const orderNumber = `${prefix}${String(n).padStart(4, "0")}`;

    const value = Number(req.landed_total ?? req.goods_subtotal ?? 0);
    const { data: order, error: ordErr } = await context.supabase
      .from("orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id,
        order_number: orderNumber,
        description: req.title,
        currency: req.currency,
        value,
        status: "received",
        ordered_at: new Date().toISOString(),
      } as any)
      .select("id, workspace_id")
      .single();
    if (ordErr || !order) throw new Error(ordErr?.message ?? "Could not create order");

    if (lines.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = lines.map((li: any) => {
        const unitPrice = li.converted_unit_price != null ? Number(li.converted_unit_price) : null;
        const qty = Number(li.qty ?? 1);
        return {
          order_id: order.id,
          workspace_id,
          line_no: li.line_no,
          product: li.description,
          description: [li.brand, li.model].filter(Boolean).join(" · ") || null,
          qty,
          unit: li.unit,
          unit_price: unitPrice,
          subtotal: unitPrice != null ? unitPrice * qty : null,
          currency: req.currency,
        };
      });
      await context.supabase.from("order_line_items").insert(rows as never);
    }

    await context.supabase.from("order_events").insert({
      order_id: order.id,
      workspace_id,
      event_type: "status",
      status: "received",
      label: "Import order placed",
    });

    // Draft invoice so the buyer has something to pay.
    try {
      const { createInvoiceForOrder } = await import("./invoices.functions");
      await createInvoiceForOrder(context.supabase, order.id);
    } catch (e) {
      console.error("[sourcing order] invoice creation failed", e);
    }

    await context.supabase
      .from("sourcing_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: "ordered", order_id: order.id, updated_at: new Date().toISOString() } as any)
      .eq("id", data.id);

    try {
      const { emitProductEvent } = await import("@/lib/telemetry.server");
      await emitProductEvent(context.supabase, {
        workspaceId: workspace_id,
        userId: context.userId,
        event: "sourcing_order_placed",
        props: { lines: lines.length, value: Math.round(value) },
      });
    } catch {
      /* best-effort */
    }
    return { orderId: order.id as string, orderNumber, already: false };
  });

export const getSourcingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: request, error } = await context.supabase
      .from("sourcing_requests")
      .select(
        "id, title, destination_country, destination_city, currency, status, notes, created_at, order_id, goods_subtotal, freight_pct, freight_est, duty_pct, duty_est, vat_pct, vat_est, landed_total",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error || !request) throw new Error("Request not found");
    const { data: items } = await context.supabase
      .from("sourcing_request_items")
      .select(
        "id, line_no, description, brand, model, mpn, qty, unit, category, best_distributor, best_price, best_currency, converted_unit_price, fx_rate, offer_count, item_status",
      )
      .eq("request_id", data.id)
      .order("line_no");
    return { request, items: items ?? [] };
  });

export const listSourcingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sourcing_requests")
      .select("id, title, destination_country, currency, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });
