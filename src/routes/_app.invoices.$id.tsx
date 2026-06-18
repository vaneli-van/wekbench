import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, FileQuestion, Package, Plus, Send, Trash2, Wallet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BreadcrumbsDisplay } from "@/components/breadcrumbs-display";
import { generateBreadcrumbs } from "@/lib/breadcrumbs";
import { PageTransition } from "@/components/page-transition";
import { CopyButton } from "@/components/copy-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/foundations/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getInvoice, updateInvoiceStatus, recordPayment, deletePayment, updateInvoice,
  sendInvoiceReminder, INVOICE_STATUSES, PAYMENT_TERMS, computeDueDate,
} from "@/lib/api/invoices.functions";
import { parseUpgrade, type UpgradeFeature } from "@/lib/plans";
import { UpgradeDialog } from "@/components/upgrade-dialog";

function money(v: number | null | undefined, c: string | null | undefined) {
  return `${c ?? ""} ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`.trim();
}

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getInvoice);
  const statusFn = useServerFn(updateInvoiceStatus);
  const payFn = useServerFn(recordPayment);
  const delPayFn = useServerFn(deletePayment);

  const { data, isLoading, error } = useQuery({ queryKey: ["invoice", id], queryFn: () => getFn({ data: { id } }) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = (data as any)?.invoice;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payments: any[] = (data as any)?.payments ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems: any[] = (data as any)?.lineItems ?? [];
  const outstanding = (data as any)?.outstanding ?? 0;
  const defaultBillingEmail = (data as any)?.defaultBillingEmail ?? null;
  const order = inv?.orders;

  const [billingEmail, setBillingEmail] = useState<string | null>(null);
  const billingValue = billingEmail ?? inv?.billing_email ?? defaultBillingEmail ?? inv?.buyer_email ?? "";

  function printInvoice() {
    if (!inv) return;
    const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const cur = inv.currency ?? "GHS";
    const fmt = (v: unknown) => `${cur} ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const seller = esc(inv.workspaces?.name ?? "");
    const rows = lineItems.length
      ? lineItems.map((li) => `<tr>
          <td>${esc(li.product ?? li.description ?? "—")}</td>
          <td class="r">${Number(li.qty ?? 0).toLocaleString()}</td>
          <td class="r">${fmt(li.unit_price)}</td>
          <td class="r">${fmt(li.subtotal)}</td></tr>`).join("")
      : `<tr><td>${esc(inv.description ?? "Goods & services")}</td><td class="r"></td><td class="r"></td><td class="r">${fmt(inv.amount)}</td></tr>`;
    const paidRow = Number(inv.amount_paid ?? 0) > 0
      ? `<tr><td class="r k">Paid</td><td class="r">-${fmt(inv.amount_paid)}</td></tr>
         <tr><td class="r k"><strong>Balance due</strong></td><td class="r"><strong>${fmt(outstanding)}</strong></td></tr>` : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoice_number)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: system-ui, Arial, sans-serif; color:#1a1a1a; font-size: 12pt; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1a1a1a; padding-bottom:10px; }
  .seller { font-size:16pt; font-weight:700; }
  h1 { font-size:18pt; margin:0; letter-spacing:1px; color:#444; }
  .muted { color:#666; }
  .meta { margin-top:14px; display:flex; justify-content:space-between; font-size:11pt; }
  table.items { width:100%; border-collapse:collapse; margin-top:18px; font-size:11pt; }
  table.items th { text-align:left; border-bottom:1px solid #ccc; padding:6px 4px; color:#666; font-weight:600; }
  table.items td { padding:6px 4px; border-bottom:1px solid #eee; }
  .r { text-align:right; }
  table.tot { margin-left:auto; margin-top:12px; border-collapse:collapse; font-size:11pt; min-width:240px; }
  table.tot td { padding:3px 4px; }
  table.tot td.k { color:#666; }
  .status { margin-top:18px; display:inline-block; padding:4px 12px; border-radius:4px; font-weight:600; font-size:10pt; }
  .paid { background:#e7f6ec; color:#1a7f43; }
  .due { background:#fdecec; color:#b3261e; }
</style></head><body>
  <div class="top">
    <div class="seller">${seller || "Invoice"}</div>
    <div style="text-align:right"><h1>INVOICE</h1><div class="muted">${esc(inv.invoice_number)}</div></div>
  </div>
  <div class="meta">
    <div>
      <div class="muted">Billed to</div>
      <div style="font-weight:600">${esc(inv.buyer_company ?? inv.buyer_name ?? "—")}</div>
      <div class="muted">${esc(inv.buyer_email ?? "")}</div>
    </div>
    <div style="text-align:right">
      <div><span class="muted">Issued:</span> ${esc(inv.issued_at ?? "—")}</div>
      <div><span class="muted">Due:</span> ${esc(inv.due_date ?? "—")}</div>
      ${inv.terms ? `<div><span class="muted">Terms:</span> ${esc(inv.terms)}</div>` : ""}
      ${order?.order_number ? `<div><span class="muted">Order:</span> ${esc(order.order_number)}</div>` : ""}
    </div>
  </div>
  <table class="items">
    <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="tot">
    <tr><td class="k">Subtotal</td><td class="r">${fmt(inv.amount)}</td></tr>
    <tr><td class="k">Tax (${Number(inv.tax_pct ?? 0)}%)</td><td class="r">${fmt(inv.tax_amount)}</td></tr>
    <tr><td class="k"><strong>Total</strong></td><td class="r"><strong>${fmt(inv.total)}</strong></td></tr>
    ${paidRow}
  </table>
  <div class="status ${outstanding > 0 ? "due" : "paid"}">${outstanding > 0 ? "Balance due " + fmt(outstanding) : "Paid in full"}</div>
</body></html>`;
    const w = window.open("", "_blank", "width=860,height=1000");
    if (!w) { toast.error("Pop-up blocked — allow pop-ups to print the invoice"); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }

  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); };

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statusFn({ data: { invoiceId: id, status: status as any } }),
    onSuccess: () => { toast.success("Invoice updated"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const payMut = useMutation({
    mutationFn: () => payFn({ data: { invoiceId: id, amount: Number(amount), paidOn, method: method || undefined, reference: reference || undefined } }),
    onSuccess: () => { toast.success("Payment recorded"); setAmount(""); setMethod(""); setReference(""); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delPayMut = useMutation({
    mutationFn: (paymentId: string) => delPayFn({ data: { paymentId, invoiceId: id } }),
    onSuccess: () => { toast.success("Payment removed"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const updFn = useServerFn(updateInvoice);
  const termsMut = useMutation({
    mutationFn: (termValue: string) => {
      const t = PAYMENT_TERMS.find((x) => x.value === termValue);
      const due = computeDueDate(inv?.issued_at, termValue);
      return updFn({ data: { invoiceId: id, patch: { terms: t?.label ?? null, due_date: due } } });
    },
    onSuccess: () => { toast.success("Terms updated"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const saveBillingMut = useMutation({
    mutationFn: () => updFn({ data: { invoiceId: id, patch: { billing_email: billingValue || null } } }),
    onSuccess: () => { toast.success("Billing email saved"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const [upgradeFeature, setUpgradeFeature] = useState<UpgradeFeature | null>(null);
  const reminderFn = useServerFn(sendInvoiceReminder);
  const reminderMut = useMutation({
    mutationFn: () => reminderFn({ data: { invoiceId: id } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (r: any) => {
      if (r?.sent) toast.success(`Reminder sent to ${r.recipient}`);
      else if (r?.skipped) toast.message(`Email not configured (${r.skipped}). Recipient would be ${r.recipient}.`);
      else toast.error(r?.error ?? "Could not send reminder");
      refresh();
    },
    onError: (e) => {
      const f = parseUpgrade(e);
      if (f) { setUpgradeFeature(f); return; }
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground">Loading invoice…</div>;
  }
  if (error || !inv) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState icon={FileQuestion} title="Invoice not found" description={error instanceof Error ? error.message : `No invoice with id "${id}".`} action={{ label: "Back to invoices", href: "/invoices" }} />
      </div>
    );
  }

  const breadcrumbs = generateBreadcrumbs("invoice", invoice?.id?.slice(-6));
  return (
    <PageTransition>
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <Link to="/invoices" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to invoices
      </Link>

      <PageHeader
        title={inv.invoice_number}
        description={inv.description ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <Select value={inv.status} onValueChange={(v) => statusMut.mutate(v)}>
              <SelectTrigger className="h-9 w-36 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={printInvoice}>
              <Download className="size-4" /> PDF
            </Button>
          </div>
        }
      />

      <Card className="mt-6 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Billed to</p>
            <p className="mt-1 font-medium">{inv.buyer_company ?? inv.buyer_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{inv.buyer_email ?? ""}</p>
          </div>
          <div className="space-y-1.5 text-right text-sm">
            <p><span className="text-muted-foreground">Issued:</span> {inv.issued_at ?? "—"}</p>
            <p><span className="text-muted-foreground">Due:</span> {inv.due_date ?? "—"}</p>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Terms</span>
              <Select value={PAYMENT_TERMS.find((t) => t.label === inv.terms)?.value ?? ""} onValueChange={(v) => termsMut.mutate(v)}>
                <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Set terms" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr><th className="px-3 py-2 font-medium">Description</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-3 py-2">{inv.description ?? "Goods & services"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(inv.amount, inv.currency)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="px-3 py-2 text-right text-muted-foreground">Tax ({Number(inv.tax_pct ?? 0)}%)</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(inv.tax_amount, inv.currency)}</td>
              </tr>
              <tr className="border-t border-border bg-muted/30">
                <td className="px-3 py-2 text-right font-semibold">Total</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(inv.total, inv.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {order && inv.order_id && (
          <Link to="/orders/$id" params={{ id: inv.order_id }} className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Package className="size-3.5" /> {order.order_number} — view order &amp; tracking
          </Link>
        )}
      </Card>

      {/* Receivable / payments */}
      <Card className="mt-4 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Wallet className="size-4" /> Payment</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Paid <span className="font-medium tabular-nums text-foreground">{money(inv.amount_paid, inv.currency)}</span></span>
            <span className="text-muted-foreground">Outstanding{" "}
              <span className={`font-semibold tabular-nums ${outstanding > 0 ? "text-foreground" : "text-success"}`}>
                {outstanding > 0 ? money(outstanding, inv.currency) : "Settled"}
              </span>
            </span>
          </div>
        </div>

        {/* Record a payment */}
        {outstanding > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <div className="sm:col-span-1">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Amount</p>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" />
            </div>
            <div className="sm:col-span-1">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Date</p>
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="h-9" />
            </div>
            <div className="sm:col-span-1">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Method</p>
              <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Bank transfer" className="h-9" />
            </div>
            <div className="sm:col-span-1">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Reference</p>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ref" className="h-9" />
            </div>
            <div className="flex items-end">
              <Button size="sm" className="h-9 w-full" onClick={() => payMut.mutate()} disabled={payMut.isPending || !(Number(amount) > 0)}>
                <Plus className="size-3.5" /> Record
              </Button>
            </div>
          </div>
        )}

        {/* Payment history */}
        {payments.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium tabular-nums">{money(p.amount, inv.currency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.paid_on}{p.method ? ` · ${p.method}` : ""}{p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => delPayMut.mutate(p.id)} aria-label="Remove payment">
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">No payments recorded yet.</p>
        )}

        {inv.status === "paid" && (
          <Badge variant="outline" className="mt-3 border-success/30 bg-success/10 text-success">Paid in full{inv.paid_at ? ` · ${inv.paid_at}` : ""}</Badge>
        )}
      </Card>

      {/* Payment reminder */}
      {outstanding > 0 && (
        <Card className="mt-4 p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Send className="size-4" /> Payment reminder</h2>
            {inv.reminder_sent_at && (
              <span className="text-xs text-muted-foreground">
                Last sent {new Date(inv.reminder_sent_at).toLocaleDateString()}{inv.reminder_count ? ` · ${inv.reminder_count}×` : ""}
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Reminders go to the billing / accounts-payable contact — often different from the buyer. Set the right recipient here.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Reminder recipient</p>
              <Input
                type="email"
                value={billingValue}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="accounts@buyer.com"
                className="h-9"
              />
            </div>
            <Button size="sm" variant="outline" className="h-9" onClick={() => saveBillingMut.mutate()} disabled={saveBillingMut.isPending}>
              Save
            </Button>
            <Button size="sm" className="h-9" onClick={() => reminderMut.mutate()} disabled={reminderMut.isPending || !billingValue}>
              <Send className="size-3.5" /> {reminderMut.isPending ? "Sending…" : "Send reminder"}
            </Button>
          </div>
          {defaultBillingEmail && !inv.billing_email && (
            <p className="mt-2 text-[11px] text-muted-foreground">Defaulting to the buyer&apos;s billing email. Save to lock it for this invoice.</p>
          )}
        </Card>
      )}

      <UpgradeDialog
        feature={upgradeFeature}
        onOpenChange={(o) => {
          if (!o) setUpgradeFeature(null);
        }}
      />
    </div>
    </PageTransition>
  );
}

export const Route = createFileRoute("/_app/invoices/$id")({
  component: InvoiceDetailPage,
});
