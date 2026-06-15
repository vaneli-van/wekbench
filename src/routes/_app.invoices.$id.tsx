import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Download, FileQuestion, Package } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/foundations/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getInvoice, updateInvoiceStatus, INVOICE_STATUSES } from "@/lib/api/invoices.functions";

function money(v: number | null | undefined, c: string | null | undefined) {
  return `${c ?? ""} ${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`.trim();
}

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getInvoice);
  const statusFn = useServerFn(updateInvoiceStatus);

  const { data, isLoading, error } = useQuery({ queryKey: ["invoice", id], queryFn: () => getFn({ data: { id } }) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = (data as any)?.invoice;
  const order = inv?.orders;

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statusFn({ data: { invoiceId: id, status: status as any } }),
    onSuccess: () => { toast.success("Invoice updated"); qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
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

  return (
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
            <Button size="sm" variant="outline" onClick={() => toast.info("PDF export coming soon")}>
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
          <div className="text-right text-sm">
            <p><span className="text-muted-foreground">Issued:</span> {inv.issued_at ?? "—"}</p>
            <p><span className="text-muted-foreground">Due:</span> {inv.due_date ?? "—"}</p>
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
    </div>
  );
}

export const Route = createFileRoute("/_app/invoices/$id")({
  component: InvoiceDetailPage,
});
