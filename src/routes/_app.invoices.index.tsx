import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { orders } from "@/lib/data"
import { FileText, Download, Send, Plus } from "lucide-react"
import { Link } from "@tanstack/react-router"

const invoiceTone: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  uploaded: "bg-info/15 text-info border-info/30",
  accepted: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
}

const invoiceLabel: Record<string, string> = {
  pending: "Awaiting generation",
  uploaded: "Sent to buyer",
  accepted: "Paid / Accepted",
  rejected: "Disputed",
}

function InvoicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Invoices"
        description="Commercial invoices generated from confirmed orders. Track delivery and payment status."
        actions={
          <Button size="sm" asChild>
            <Link to="/invoices/new">
              <Plus className="size-4" />
              New invoice
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Outstanding", value: "GH₵27.3M", tone: "text-warning" },
          { label: "Sent this month", value: "GH₵34.0M", tone: "text-info" },
          { label: "Paid this month", value: "GH₵19.2M", tone: "text-success" },
          { label: "Disputed", value: "GH₵0", tone: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Order / PO</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link to="/invoices/$id" params={{ id: o.id }} className="flex items-center gap-2 group">
                      <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <FileText className="size-4" />
                      </span>
                      <div>
                        <p className="font-medium group-hover:underline">INV-{o.id.replace("ORD-", "")}</p>
                        <p className="text-xs text-muted-foreground">{o.orderedAt}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{o.buyer}</p>
                    <p className="text-xs text-muted-foreground">{o.buyerContact}</p>
                  </TableCell>
                  <TableCell>
                    <Link to="/orders/$id" params={{ id: o.id }} className="text-sm text-info hover:underline">
                      {o.poNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{o.value}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={invoiceTone[o.invoiceStatus]}>
                      {invoiceLabel[o.invoiceStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Open invoice" asChild>
                        <Link to="/invoices/$id" params={{ id: o.id }}>
                          <FileText className="size-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Download invoice">
                        <Download className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label="Send invoice">
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}


export const Route = createFileRoute("/_app/invoices/")({
  component: InvoicesPage,
});
