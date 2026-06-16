import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

export const INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "disputed", "void"] as const;

/** Named payment-term presets (drive the invoice due date). */
export const PAYMENT_TERMS = [
  { value: "receipt", label: "Due on receipt", days: 0 },
  { value: "net15", label: "Net 15", days: 15 },
  { value: "net30", label: "Net 30", days: 30 },
  { value: "net45", label: "Net 45", days: 45 },
  { value: "net60", label: "Net 60", days: 60 },
  { value: "eofm", label: "End of following month", days: null as number | null },
] as const;

/** Compute a due date from an issue date + a term value. */
export function computeDueDate(issuedAt: string | null | undefined, term: string): string | null {
  const base = new Date(`${issuedAt ?? ""}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  if (term === "eofm") {
    const d = new Date(base.getFullYear(), base.getMonth() + 2, 0); // last day of next month
    return d.toISOString().slice(0, 10);
  }
  const t = PAYMENT_TERMS.find((x) => x.value === term);
  if (!t || t.days == null) return null;
  const d = new Date(base);
  d.setDate(d.getDate() + t.days);
  return d.toISOString().slice(0, 10);
}

/** Days between two ISO dates (a - b), or null. */
function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

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
        "id, invoice_number, buyer_name, buyer_company, description, status, currency, amount, total, amount_paid, terms, issued_at, due_date, paid_at, order_id, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (data ?? []) as any[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      outstanding: 0,
      overdue: 0,
      paidThisMonth: 0,
      draft: 0,
      aging: { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 },
      currency: raw[0]?.currency ?? "GHS",
    };

    const invoices = raw.map((r) => {
      const total = Number(r.total ?? 0);
      const paid = Number(r.amount_paid ?? 0);
      const outstanding = Math.max(0, total - paid);
      const settled = r.status === "paid" || r.status === "void";
      const due = r.due_date ? new Date(`${r.due_date}T00:00:00`) : null;
      const daysOverdue = due && !settled && outstanding > 0 ? daysBetween(today, due) : 0;
      const isOverdue = daysOverdue > 0;

      if (!settled && outstanding > 0) {
        stats.outstanding += outstanding;
        if (isOverdue) {
          stats.overdue += outstanding;
          if (daysOverdue <= 30) stats.aging.d30 += outstanding;
          else if (daysOverdue <= 60) stats.aging.d60 += outstanding;
          else if (daysOverdue <= 90) stats.aging.d90 += outstanding;
          else stats.aging.d90plus += outstanding;
        } else {
          stats.aging.current += outstanding;
        }
      }
      if (r.status === "draft") stats.draft += total;
      if (r.paid_at) {
        const p = new Date(`${r.paid_at}T00:00:00`);
        if (p.getFullYear() === today.getFullYear() && p.getMonth() === today.getMonth()) {
          stats.paidThisMonth += paid;
        }
      }
      return { ...r, outstanding, isOverdue, daysOverdue };
    });

    return { invoices, stats };
  });

export const getInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: invoice, error } = await context.supabase
      .from("invoices")
      .select("*, orders(order_number, share_token, status), workspaces(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !invoice) throw new Error("Invoice not found");
    const { data: payments } = await context.supabase
      .from("invoice_payments")
      .select("id, amount, paid_on, method, reference, note, created_at")
      .eq("invoice_id", data.id)
      .order("paid_on", { ascending: false });
    // Pull the order's line items so the invoice can be itemised.
    let lineItems: unknown[] = [];
    if (invoice.order_id) {
      const { data: li } = await context.supabase
        .from("order_line_items")
        .select("line_no, product, description, qty, unit, unit_price, subtotal")
        .eq("order_id", invoice.order_id)
        .order("line_no", { ascending: true });
      lineItems = li ?? [];
    }
    const total = Number(invoice.total ?? 0);
    const paid = Number(invoice.amount_paid ?? 0);
    return { invoice, payments: payments ?? [], lineItems, outstanding: Math.max(0, total - paid) };
  });

/** Recompute amount_paid + status from the payments ledger. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recomputeInvoicePayment(supabase: any, invoiceId: string): Promise<void> {
  const { data: inv } = await supabase
    .from("invoices")
    .select("total, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return;
  const { data: pays } = await supabase
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paid = (pays ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
  const total = Number(inv.total ?? 0);
  let status = inv.status;
  let paidAt: string | null = null;
  if (paid <= 0) {
    if (status === "paid" || status === "partial") status = "sent";
  } else if (paid >= total && total > 0) {
    status = "paid";
    paidAt = new Date().toISOString().slice(0, 10);
  } else {
    status = "partial";
  }
  await supabase
    .from("invoices")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ amount_paid: Number(paid.toFixed(2)), status, paid_at: paidAt } as any)
    .eq("id", invoiceId);
}

/** Record a payment received against an invoice. */
export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        invoiceId: z.string().uuid(),
        amount: z.number().positive(),
        paidOn: z.string().optional(),
        method: z.string().max(80).optional(),
        reference: z.string().max(120).optional(),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: inv } = await context.supabase
      .from("invoices")
      .select("workspace_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!inv) throw new Error("Invoice not found");
    const { error } = await context.supabase
      .from("invoice_payments")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: inv.workspace_id,
        invoice_id: data.invoiceId,
        amount: data.amount,
        paid_on: data.paidOn || new Date().toISOString().slice(0, 10),
        method: data.method || null,
        reference: data.reference || null,
        note: data.note || null,
      } as any);
    if (error) throw new Error(error.message);
    await recomputeInvoicePayment(context.supabase, data.invoiceId);
    return { ok: true };
  });

/** Remove a recorded payment and recompute the invoice. */
export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ paymentId: z.string().uuid(), invoiceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("invoice_payments").delete().eq("id", data.paymentId);
    if (error) throw new Error(error.message);
    await recomputeInvoicePayment(context.supabase, data.invoiceId);
    return { ok: true };
  });

/** Update invoice terms / due date / status. */
export const updateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        invoiceId: z.string().uuid(),
        patch: z
          .object({
            terms: z.string().max(120).nullable().optional(),
            due_date: z.string().nullable().optional(),
            status: z.enum(INVOICE_STATUSES).optional(),
          })
          .strict(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("invoices").update(data.patch as any).eq("id", data.invoiceId);
    if (error) throw new Error(error.message);
    return { ok: true };
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
