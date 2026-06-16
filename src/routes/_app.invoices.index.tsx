import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Download, Send, RefreshCw, ReceiptText } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/foundations/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listInvoices, updateInvoiceStatus, backfillInvoices } from "@/lib/api/invoices.functions";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-warning/15 text-warning border-warning/30",
  sent: "bg-info/15 text-info border-info/30",
  partial: "bg-primary/15 text-primary border-primary/30",
  paid: "bg-success/15 text-success border-success/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  disputed: "bg-destructive/15 text-destructive border-destructive/30",
  void: "bg-muted text-muted-foreground",
};

function money(v: number | null | undefined, c: string | null | undefined) {
  return `${c ?? ""} ${Number(v ?? 0).toLocaleString()}`.trim();
}

function InvoicesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listInvoices);
  const statusFn = useServerFn(updateInvoiceStatus);
  const backfillFn = useServerFn(backfillInvoices);

  const { data, isLoading } = useQuery({ queryKey: ["invoices"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["invoices"] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: any[] = (data as any)?.invoices ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = (data as any)?.stats ?? {
    outstanding: 0, overdue: 0, paidThisMonth: 0, draft: 0,
    aging: { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 }, currency: "GHS",
  };

  const statusMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (v: { invoiceId: string; status: string }) => statusFn({ data: v as any }),
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const backfillMut = useMutation({
    mutationFn: () => backfillFn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (r: any) => { toast.success(`${r?.created ?? 0} invoice(s) ready`); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const cards = [
    { label: "Outstanding", value: money(stats.outstanding, stats.currency), tone: "text-foreground" },
    { label: "Overdue", value: money(stats.overdue, stats.currency), tone: "text-destructive" },
    { label: "Paid this month", value: money(stats.paidThisMonth, stats.currency), tone: "text-success" },
    { label: "Draft (unbilled)", value: money(stats.draft, stats.currency), tone: "text-warning" },
  ];

  const aging = stats.aging ?? { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  const agingBuckets = [
    { label: "Current", value: aging.current, tone: "bg-success" },
    { label: "1–30d", value: aging.d30, tone: "bg-warning" },
    { label: "31–60d", value: aging.d60, tone: "bg-warning/80" },
    { label: "61–90d", value: aging.d90, tone: "bg-destructive/70" },
    { label: "90d+", value: aging.d90plus, tone: "bg-destructive" },
  ];
  const agingTotal = agingBuckets.reduce((s, b) => s + b.value, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Invoices"
        description="Commercial invoices generated from orders. Track delivery and payment status."
        actions={
          <Button size="sm" variant="outline" onClick={() => backfillMut.mutate()} disabled={backfillMut.isPending}>
            <RefreshCw className={`size-4 ${backfillMut.isPending ? "animate-spin" : ""}`} />
            Sync from orders
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* AR aging */}
      <Card className="mb-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Receivables aging</h2>
          <span className="text-xs text-muted-foreground">Outstanding by age of overdue balance</span>
        </div>
        {agingTotal === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing outstanding — all invoices settled.</p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {agingBuckets.map((b) => b.value > 0 && (
                <div key={b.label} className={b.tone} style={{ width: `${(b.value / agingTotal) * 100}%` }} title={`${b.label}: ${money(b.value, stats.currency)}`} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {agingBuckets.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-xs">
                  <span className={`size-2.5 rounded-sm ${b.tone}`} aria-hidden />
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="ml-auto font-medium tabular-nums">{money(b.value, stats.currency)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No invoices yet."
          description="Invoices are created automatically when an order is created from an accepted quote."
          action={{ label: "Go to orders", href: "/orders" }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link to="/invoices/$id" params={{ id: inv.id }} className="flex items-center gap-2 group">
                        <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <FileText className="size-4" />
                        </span>
                        <div>
                          <p className="font-medium group-hover:underline">{inv.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">{inv.issued_at}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{inv.buyer_company ?? inv.buyer_name ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm tabular-nums ${inv.isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        {inv.due_date ?? "—"}
                        {inv.isOverdue ? ` · ${inv.daysOverdue}d` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(inv.total, inv.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {inv.outstanding > 0 ? money(inv.outstanding, inv.currency) : <span className="text-success">Settled</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${inv.isOverdue && inv.status !== "paid" ? STATUS_TONE.overdue : STATUS_TONE[inv.status] ?? ""}`}>
                        {inv.isOverdue && inv.status !== "paid" ? "overdue" : inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" aria-label="Open" asChild>
                          <Link to="/invoices/$id" params={{ id: inv.id }}><FileText className="size-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" aria-label="Download PDF" asChild>
                          <Link to="/invoices/$id" params={{ id: inv.id }}><Download className="size-4" /></Link>
                        </Button>
                        {inv.status === "draft" && (
                          <Button variant="ghost" size="icon" className="size-8" aria-label="Mark sent" onClick={() => statusMut.mutate({ invoiceId: inv.id, status: "sent" })}>
                            <Send className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/invoices/")({
  component: InvoicesPage,
});
