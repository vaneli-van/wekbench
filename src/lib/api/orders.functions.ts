import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";
import { createInvoiceForOrder } from "./invoices.functions";

export const ORDER_STATUSES = [
  "received",
  "confirmed",
  "processing",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

const STATUS_LABEL: Record<string, string> = {
  received: "Order received",
  confirmed: "Order confirmed",
  processing: "In production",
  shipped: "Shipped",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nextOrderNumber(supabase: any, workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .eq("workspace_id", workspaceId)
    .like("order_number", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let n = 1;
  if (data?.order_number) {
    const parsed = parseInt(String(data.order_number).split("-").pop() ?? "0", 10);
    if (!Number.isNaN(parsed)) n = parsed + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/**
 * Create an order from a quote (idempotent: returns the existing order if the
 * quote already has one). Used when a quote is accepted, and for manual creation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createOrderForQuote(supabase: any, quoteId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      "id, workspace_id, quote_number, title, buyer_name, buyer_id, currency, total, rfq_id, rfqs(buyer_name, buyer_email, buyer_company, summary)",
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (error || !quote) throw new Error("Quote not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfq = (Array.isArray(quote.rfqs) ? quote.rfqs[0] : quote.rfqs) as any;
  const buyerName = quote.buyer_name ?? rfq?.buyer_company ?? rfq?.buyer_name ?? null;
  const description = quote.title ?? rfq?.summary ?? quote.quote_number;
  const orderNumber = await nextOrderNumber(supabase, quote.workspace_id);

  const { data: order, error: insErr } = await supabase
    .from("orders")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      workspace_id: quote.workspace_id,
      quote_id: quote.id,
      rfq_id: quote.rfq_id ?? null,
      buyer_id: quote.buyer_id ?? null,
      order_number: orderNumber,
      buyer_name: buyerName,
      buyer_email: rfq?.buyer_email ?? null,
      buyer_company: rfq?.buyer_company ?? null,
      description,
      currency: quote.currency,
      value: quote.total ?? 0,
      status: "received",
    } as any)
    .select("id, workspace_id")
    .single();
  if (insErr || !order) throw new Error(insErr?.message ?? "Could not create order");

  await supabase.from("order_events").insert({
    order_id: order.id,
    workspace_id: order.workspace_id,
    event_type: "status",
    status: "received",
    label: STATUS_LABEL.received,
  });
  // Generate a draft invoice for the new order.
  try {
    await createInvoiceForOrder(supabase, order.id);
  } catch (e) {
    console.error("[order] invoice creation failed", e);
  }
  return order.id;
}

async function resolveWorkspace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<string> {
  const wsId = await resolveWorkspaceId(supabase, userId);
  if (!wsId) throw new Error("No workspace found for this user");
  return wsId;
}

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_number, buyer_name, buyer_company, description, status, currency, value, carrier, tracking_number, expected_delivery, ordered_at, created_at, quote_id",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    const { data: events } = await context.supabase
      .from("order_events")
      .select("id, event_type, status, label, note, occurred_at")
      .eq("order_id", data.id)
      .order("occurred_at", { ascending: true });
    const { data: lineItems } = await context.supabase
      .from("order_line_items")
      .select("id, line_no, product, description, qty, unit, unit_price, subtotal, currency")
      .eq("order_id", data.id)
      .order("line_no", { ascending: true });
    return { order, events: events ?? [], lineItems: lineItems ?? [] };
  });

export const createManualOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        buyer: z.string().min(1),
        description: z.string().min(1),
        value: z.number().optional(),
        currency: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspaceId = await resolveWorkspace(context.supabase, context.userId);
    const orderNumber = await nextOrderNumber(context.supabase, workspaceId);
    const { data: order, error } = await context.supabase
      .from("orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: workspaceId,
        order_number: orderNumber,
        buyer_name: data.buyer,
        description: data.description,
        value: data.value ?? 0,
        currency: data.currency ?? null,
        status: "received",
      } as any)
      .select("id, workspace_id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Could not create order");
    await context.supabase.from("order_events").insert({
      order_id: order.id,
      workspace_id: order.workspace_id,
      event_type: "status",
      status: "received",
      label: STATUS_LABEL.received,
    });
    try {
      await createInvoiceForOrder(context.supabase, order.id);
    } catch (e) {
      console.error("[order] invoice creation failed", e);
    }
    return { id: order.id as string };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(ORDER_STATUSES),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: data.status } as any)
      .eq("id", data.orderId)
      .select("id, workspace_id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Update failed");
    await context.supabase.from("order_events").insert({
      order_id: order.id,
      workspace_id: order.workspace_id,
      event_type: "status",
      status: data.status,
      label: STATUS_LABEL[data.status] ?? data.status,
      note: data.note ?? null,
    });
    return { ok: true };
  });

export const setOrderShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        carrier: z.string().max(200).optional(),
        trackingNumber: z.string().max(200).optional(),
        trackingUrl: z.string().max(500).optional(),
        expectedDelivery: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.carrier !== undefined) patch.carrier = data.carrier || null;
    if (data.trackingNumber !== undefined) patch.tracking_number = data.trackingNumber || null;
    if (data.trackingUrl !== undefined) patch.tracking_url = data.trackingUrl || null;
    if (data.expectedDelivery !== undefined) patch.expected_delivery = data.expectedDelivery || null;
    const { data: order, error } = await context.supabase
      .from("orders")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.orderId)
      .select("id, workspace_id, carrier, tracking_number")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Update failed");
    const label = order.carrier
      ? `Shipment details added — ${order.carrier}${order.tracking_number ? ` (${order.tracking_number})` : ""}`
      : "Shipment details updated";
    await context.supabase.from("order_events").insert({
      order_id: order.id,
      workspace_id: order.workspace_id,
      event_type: "shipment",
      label,
    });
    return { ok: true };
  });

export const addOrderEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        label: z.string().min(1).max(300),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("workspace_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    const { error } = await context.supabase.from("order_events").insert({
      order_id: data.orderId,
      workspace_id: order.workspace_id,
      event_type: "note",
      label: data.label,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * PUBLIC, no-auth: fetch one order + its events by its share token. Uses an
 * anon client + a SECURITY DEFINER RPC, so the buyer page works without login
 * and only the order matching the token is ever returned.
 */
export const getTrackingByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(6) }).parse(input))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase env not configured");
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data: result, error } = await supabase.rpc("get_tracking", { p_token: data.token });
    if (error) throw new Error(error.message);
    return { tracking: result ?? null };
  });
