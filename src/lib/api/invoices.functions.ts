import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "disputed", "void"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nextInvoiceNumber(supabase: any, workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("workspace_id", workspaceId)
    .like("invoice_number", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let n = 1;
  if (data?.invoice_number) {
    const parsed = parseInt(String(data.invoice_number).split("-").pop() ?? "0", 10);
    if (!Number.isNaN(parsed)) n = parsed + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/**
 * Create a draft invoice from an order (idempotent: returns the existing
 * invoice if the order already has one). Called when an order is created.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createInvoiceForOrder(supabase: any, orderId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: order } = await supabase
    .from("orders")
    .select("id, workspace_id, quote_id, buyer_name, buyer_email, buyer_company, description, currency, value")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const invoiceNumber = await nextInvoiceNumber(supabase, order.workspace_id);
  const amount = Number(order.value ?? 0);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { data: inv, error } = await supabase
    .from("invoices")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      workspace_id: order.workspace_id,
      order_id: order.id,
      quote_id: order.quote_id,
      invoice_number: invoiceNumber,
      buyer_name: order.buyer_name,
      buyer_email: order.buyer_email,
      buyer_company: order.buyer_company,
      description: order.description,
      currency: order.currency,
      amount,
      tax_pct: 0,
      tax_amount: 0,
      total: amount,
      status: "draft",
      due_date: dueDate.toISOString().slice(0, 10),
    } as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return inv?.id ?? null;
}

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select(
        "id, invoice_number, buyer_name, buyer_company, description, status, currency, amount, total, issued_at, due_date, order_id, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []) as any[];
    const stats = { outstanding: 0, sent: 0, paid: 0, disputed: 0, currency: rows[0]?.currency ?? "" };
    const thisMonth = new Date();
    for (const r of rows) {
      const total = Number(r.total ?? 0);
      const issued = r.issued_at ? new Date(r.issued_at) : null;
      const sameMonth = issued && issued.getFullYear() === thisMonth.getFullYear() && issued.getMonth() === thisMonth.getMonth();
      if (r.status === "sent" || r.status === "overdue") stats.outstanding += total;
      if (sameMonth && r.status === "sent") stats.sent += total;
      if (sameMonth && r.status === "paid") stats.paid += total;
      if (r.status === "disputed") stats.disputed += total;
    }
    return { invoices: rows, stats };
  });

export const getInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: invoice, error } = await context.supabase
      .from("invoices")
      .select("*, orders(order_number, share_token, status)")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !invoice) throw new Error("Invoice not found");
    return { invoice };
  });

export const createInvoiceFromOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const id = await createInvoiceForOrder(context.supabase, data.orderId);
    if (!id) throw new Error("Order not found");
    return { id };
  });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ invoiceId: z.string().uuid(), status: z.enum(INVOICE_STATUSES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invoices")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: data.status } as any)
      .eq("id", data.invoiceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Manually generate invoices for any orders that don't have one yet. */
export const backfillInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const { data: orders } = await context.supabase
      .from("orders")
      .select("id")
      .eq("workspace_id", wsId);
    let created = 0;
    for (const o of orders ?? []) {
      const id = await createInvoiceForOrder(context.supabase, o.id);
      if (id) created += 1;
    }
    return { created };
  });
