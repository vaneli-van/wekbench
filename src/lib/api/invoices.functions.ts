import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";
import { sendEmail, escapeHtml } from "@/lib/email.server";

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
    type LineItem = {
      line_no: number | null;
      product: string | null;
      description: string | null;
      qty: number | null;
      unit: string | null;
      unit_price: number | null;
      subtotal: number | null;
    };
    let lineItems: LineItem[] = [];
    let defaultBillingEmail: string | null = null;
    if (invoice.order_id) {
      const { data: li } = await context.supabase
        .from("order_line_items")
        .select("line_no, product, description, qty, unit, unit_price, subtotal")
        .eq("order_id", invoice.order_id)
        .order("line_no", { ascending: true });
      lineItems = li ?? [];
      // Resolve the buyer's billing/AP email (default reminder recipient).
      const { data: ord } = await context.supabase
        .from("orders")
        .select("buyer_id")
        .eq("id", invoice.order_id)
        .maybeSingle();
      if (ord?.buyer_id) {
        const { data: b } = await context.supabase
          .from("buyers")
          .select("billing_email, email")
          .eq("id", ord.buyer_id)
          .maybeSingle();
        defaultBillingEmail = b?.billing_email ?? b?.email ?? null;
      }
    }
    const total = Number(invoice.total ?? 0);
    const paid = Number(invoice.amount_paid ?? 0);
    return {
      invoice,
      payments: payments ?? [],
      lineItems,
      defaultBillingEmail,
      outstanding: Math.max(0, total - paid),
    };
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
            billing_email: z.string().max(200).nullable().optional(),
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

/**
 * Send a payment reminder for an invoice. Recipient resolution (so reminders
 * reach the AP/finance payer, not just the buyer contact):
 *   1. invoice.billing_email (per-invoice override)
 *   2. the buyer's billing_email (via the order's buyer), then buyer.email
 *   3. invoice.buyer_email (last resort)
 */
export const sendInvoiceReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, order_id, invoice_number, buyer_name, buyer_company, buyer_email, billing_email, currency, total, amount_paid, due_date, workspaces(name)")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!inv) throw new Error("Invoice not found");

    let recipient: string | null = inv.billing_email || null;
    if (!recipient && inv.order_id) {
      const { data: ord } = await supabase.from("orders").select("buyer_id").eq("id", inv.order_id).maybeSingle();
      if (ord?.buyer_id) {
        const { data: b } = await supabase.from("buyers").select("billing_email, email").eq("id", ord.buyer_id).maybeSingle();
        recipient = b?.billing_email || b?.email || null;
      }
    }
    if (!recipient) recipient = inv.buyer_email || null;
    if (!recipient) throw new Error("No billing email set for this invoice. Add one before sending a reminder.");

    const outstanding = Math.max(0, Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0));
    if (outstanding <= 0) throw new Error("Nothing outstanding on this invoice.");

    const cur = inv.currency ?? "GHS";
    const amount = `${cur} ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    let overdueLine = "";
    if (inv.due_date) {
      const due = new Date(`${inv.due_date}T00:00:00`);
      const days = Math.floor((Date.now() - due.getTime()) / 86_400_000);
      overdueLine = days > 0
        ? `<p style="margin:0 0 12px;color:#b3261e">This invoice is <strong>${days} day${days === 1 ? "" : "s"} overdue</strong> (due ${escapeHtml(inv.due_date)}).</p>`
        : `<p style="margin:0 0 12px">Due on <strong>${escapeHtml(inv.due_date)}</strong>.</p>`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seller = (inv as any).workspaces?.name ?? "";
    const html =
      `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6">` +
      `<p style="margin:0 0 8px">Dear ${escapeHtml(inv.buyer_company ?? inv.buyer_name ?? "Accounts team")},</p>` +
      `<p style="margin:0 0 12px">This is a friendly reminder regarding invoice <strong>${escapeHtml(inv.invoice_number)}</strong> with an outstanding balance of <strong>${escapeHtml(amount)}</strong>.</p>` +
      overdueLine +
      `<p style="margin:0 0 12px">We'd appreciate settlement at your earliest convenience. If payment is already in progress, please disregard this note.</p>` +
      (seller ? `<p style="margin:14px 0 0">Kind regards,<br>${escapeHtml(seller)}</p>` : "") +
      `</div>`;

    const res = await sendEmail({
      to: recipient,
      subject: `Payment reminder — invoice ${inv.invoice_number} (${amount} outstanding)`,
      html,
    });
    if (res.sent) {
      await supabase
        .from("invoices")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ reminder_sent_at: new Date().toISOString(), reminder_count: (Number((inv as any).reminder_count ?? 0)) + 1 } as any)
        .eq("id", inv.id);
    }
    return { ...res, recipient };
  });

/** A buyer's statement of account: open invoices + outstanding + aging. */
export const getBuyerStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ buyerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: buyer } = await supabase
      .from("buyers")
      .select("id, name, contact_name, email, billing_email")
      .eq("id", data.buyerId)
      .maybeSingle();
    if (!buyer) throw new Error("Buyer not found");

    const { data: orders } = await supabase.from("orders").select("id").eq("buyer_id", data.buyerId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderIds = ((orders ?? []) as any[]).map((o) => o.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invRows: any[] = [];
    if (orderIds.length) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, invoice_number, issued_at, due_date, total, amount_paid, status, currency")
        .in("order_id", orderIds)
        .order("issued_at", { ascending: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invRows = (inv ?? []) as any[];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const aging = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
    let totalOutstanding = 0;
    const open = invRows
      .map((r) => {
        const outstanding = Math.max(0, Number(r.total ?? 0) - Number(r.amount_paid ?? 0));
        const due = r.due_date ? new Date(`${r.due_date}T00:00:00`) : null;
        const daysOverdue = due ? daysBetween(today, due) : 0;
        return { ...r, outstanding, daysOverdue, isOverdue: daysOverdue > 0 };
      })
      .filter((r) => r.outstanding > 0 && r.status !== "void");
    for (const r of open) {
      totalOutstanding += r.outstanding;
      if (r.daysOverdue <= 0) aging.current += r.outstanding;
      else if (r.daysOverdue <= 30) aging.d30 += r.outstanding;
      else if (r.daysOverdue <= 60) aging.d60 += r.outstanding;
      else if (r.daysOverdue <= 90) aging.d90 += r.outstanding;
      else aging.d90plus += r.outstanding;
    }
    const currency = open[0]?.currency ?? "GHS";
    const recipient = buyer.billing_email ?? buyer.email ?? null;
    return { buyer, invoices: open, totalOutstanding, aging, currency, recipient };
  });

/** Email a buyer's statement of account to their billing contact. */
export const sendBuyerStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ buyerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: buyer } = await supabase
      .from("buyers")
      .select("id, name, email, billing_email, workspace_id")
      .eq("id", data.buyerId)
      .maybeSingle();
    if (!buyer) throw new Error("Buyer not found");
    const recipient = buyer.billing_email ?? buyer.email ?? null;
    if (!recipient) throw new Error("No billing email set for this buyer.");

    const { data: ws } = await supabase.from("workspaces").select("name").eq("id", buyer.workspace_id).maybeSingle();
    const seller = ws?.name ?? "";

    const { data: orders } = await supabase.from("orders").select("id").eq("buyer_id", data.buyerId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderIds = ((orders ?? []) as any[]).map((o) => o.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invRows: any[] = [];
    if (orderIds.length) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("invoice_number, issued_at, due_date, total, amount_paid, status, currency")
        .in("order_id", orderIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invRows = (inv ?? []) as any[];
    }
    const open = invRows
      .map((r) => ({ ...r, outstanding: Math.max(0, Number(r.total ?? 0) - Number(r.amount_paid ?? 0)) }))
      .filter((r) => r.outstanding > 0 && r.status !== "void");
    if (open.length === 0) throw new Error("This buyer has no outstanding invoices.");

    const cur = open[0]?.currency ?? "GHS";
    const fmt = (v: number) => `${cur} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const total = open.reduce((s, r) => s + r.outstanding, 0);
    const rows = open
      .map((r) => `<tr><td>${escapeHtml(r.invoice_number)}</td><td>${escapeHtml(r.due_date ?? "—")}</td><td style="text-align:right">${escapeHtml(fmt(r.outstanding))}</td></tr>`)
      .join("");
    const html =
      `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6">` +
      `<p style="margin:0 0 8px">Dear ${escapeHtml(buyer.name)} accounts team,</p>` +
      `<p style="margin:0 0 12px">Please find your statement of account. Total outstanding: <strong>${escapeHtml(fmt(total))}</strong> across ${open.length} invoice${open.length === 1 ? "" : "s"}.</p>` +
      `<table style="border-collapse:collapse;font-size:14px;width:100%;max-width:480px">` +
      `<thead><tr style="color:#666;text-align:left"><th style="padding:4px 0">Invoice</th><th style="padding:4px 0">Due</th><th style="padding:4px 0;text-align:right">Outstanding</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>` +
      `<p style="margin:14px 0 0">We'd appreciate settlement of any overdue balances at your earliest convenience.</p>` +
      (seller ? `<p style="margin:14px 0 0">Kind regards,<br>${escapeHtml(seller)}</p>` : "") +
      `</div>`;
    const res = await sendEmail({
      to: recipient,
      subject: `Statement of account — ${fmt(total)} outstanding`,
      html,
    });
    return { ...res, recipient, totalOutstanding: total, count: open.length };
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
