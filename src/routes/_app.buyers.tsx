import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buyers } from "@/lib/data"
import { Plus, Mail, Building2, Copy } from "lucide-react"

function BuyersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Buyers"
        description="Enterprise accounts with dedicated RFQ capture addresses. Every inbound email is auto-routed to the right account."
        actions={
          <Button size="sm">
            <Plus className="size-4" />
            Add buyer
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {buyers.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{b.company}</h3>
                  <p className="text-sm text-muted-foreground">{b.sector}</p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {b.lifetimeValue}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Open RFQs</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{b.openRfqs}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Active orders</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{b.activeOrders}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span>{b.contact}</span>
                <span className="text-foreground">·</span>
                <span className="truncate">{b.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Dedicated RFQ address</p>
                  <p className="truncate font-mono text-xs text-foreground">{b.rfqEmail}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Copy RFQ email">
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}


export const Route = createFileRoute("/_app/buyers")({
  component: BuyersPage,
});
