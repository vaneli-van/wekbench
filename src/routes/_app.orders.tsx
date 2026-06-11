import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router"
import { Package, ArrowUpRight, Truck } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { orders } from "@/lib/data"

function OrdersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Orders"
        description="Purchase orders detected from buyer emails and converted from approved quotes. Track fulfillment end to end."
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
          <span>Order / PO</span>
          <span>Buyer</span>
          <span>Supplier Status</span>
          <span>Value</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-border">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-muted/30 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center md:gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Package className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{order.poNumber}</p>
                    <p className="truncate text-sm font-medium text-foreground">{order.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.id} · from {order.quoteRef}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground">{order.buyer}</p>
                  <p className="text-xs text-muted-foreground">{order.buyerContact}</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Truck className="size-3.5" />
                  {order.supplierStatus}
                </div>
                <p className="text-sm font-semibold text-foreground">{order.value}</p>
                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <StatusBadge status={order.status} />
                  <ArrowUpRight className="hidden size-4 text-muted-foreground md:block" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}


export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});
