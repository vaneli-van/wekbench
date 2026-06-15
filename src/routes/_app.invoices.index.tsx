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
  const stats = (data as any)?.stats ?? { outstanding: 0, sent: 0, paid: 0, disputed: 0, currency: "" };

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
    { label: "Outstanding", value: money(stats.outstanding, stats.currency), tone: "text-warning" },
    { label: "Sent this month", value: money(stats.sent, stats.currency), tone: "text-info" },
    { label: "Paid this month", value: money(stats.paid, stats.currency), tone: "text-success" },
    { label: "Disputed", value: money(stats.disputed, stats.currency), tone: "text-muted-foreground" },
  ];

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

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

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
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
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
                      {inv.order_id ? (
                        <Link to="/orders/$id" params={{ id: inv.order_id }} className="text-sm text-info hover:underline">
                          View order
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(inv.total, inv.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${STATUS_TONE[inv.status] ?? ""}`}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" aria-label="Open" asChild>
                          <Link to="/invoices/$id" params={{ id: inv.id }}><FileText className="size-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" aria-label="Download" onClick={() => toast.info("PDF export coming soon")}>
                          <Download className="size-4" />
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
