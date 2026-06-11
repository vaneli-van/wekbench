import { createFileRoute } from "@tanstack/react-router";
import { notFound } from "@tanstack/react-router"
import { ShieldCheck, Headphones } from "lucide-react"

import { orders } from "@/lib/data"
import { getOrderDetail } from "@/lib/order-detail"
import { StatusBadge } from "@/components/status-badge"
import { TrackingTimeline } from "@/components/orders/tracking-timeline"
import { supplierStatusMeta } from "@/lib/order-detail"
import { Wordmark } from "@/components/wordmark"

function BuyerTrackingPage() {
  const { token } = Route.useParams();
  return <TrackingResolver params={params} />
}

async function TrackingResolver({ params }: { params: Promise<{ token: string }> }) {

  // Resolve the order whose share token matches.
  const match = orders
    .map((o) => ({ order: o, detail: getOrderDetail(o) }))
    .find((x) => x.detail.shareToken === token)

  if (!match) return notFound()
  const { order, detail } = match

  // Steps the buyer sees (simplified, no internal supplier costs).
  const progress = [
    { key: "po-received", label: "Order received" },
    { key: "in-progress", label: "In progress" },
    { key: "delivered", label: "Delivered" },
  ]
  const currentIndex = progress.findIndex((p) => p.key === order.status)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-muted">
      {/* Branded header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Wordmark size="sm" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" />
            Secure tracking
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        {/* Order summary */}
        <div className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Order for {order.buyer}</p>
              <h1 className="mt-1 text-pretty text-xl font-semibold text-foreground">{order.description}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                PO {order.poNumber} · Reference {order.id}
              </p>
            </div>
            <StatusBadge status={order.status} className="text-sm" />
          </div>

          {/* Progress bar */}
          <div className="mt-6 flex items-center">
            {progress.map((p, i) => {
              const done = i <= currentIndex
              return (
                <div key={p.key} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={
                        "flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold " +
                        (done
                          ? "border-success bg-success text-background"
                          : "border-border bg-card text-muted-foreground")
                      }
                    >
                      {i + 1}
                    </div>
                    <span
                      className={
                        "text-center text-xs " + (done ? "font-medium text-foreground" : "text-muted-foreground")
                      }
                    >
                      {p.label}
                    </span>
                  </div>
                  {i < progress.length - 1 && (
                    <div
                      className={"mx-2 h-0.5 flex-1 rounded-full " + (i < currentIndex ? "bg-success" : "bg-border")}
                      aria-hidden
                    />
                  )}
                </div>
              )
            })}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Expected delivery</dt>
              <dd className="mt-0.5 font-medium text-foreground">{order.expectedDelivery}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Items</dt>
              <dd className="mt-0.5 font-medium text-foreground">{detail.lineItems.length} line items</dd>
            </div>
          </dl>
        </div>

        {/* What's in the order (no cost info shown to buyer) */}
        <div className="mt-5 rounded-xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-sm font-semibold text-foreground">Items in this order</h2>
          <ul className="mt-3 divide-y divide-border">
            {detail.lineItems.map((li) => (
              <li key={li.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{li.description}</p>
                  <p className="text-xs text-muted-foreground">Qty {li.qty}</p>
                </div>
                <StatusBadge
                  status={supplierStatusMeta[li.lineStatus].status}
                  label={supplierStatusMeta[li.lineStatus].label}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Tracking timeline */}
        <div className="mt-5 rounded-xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-sm font-semibold text-foreground">Tracking updates</h2>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Live updates as your order moves from our suppliers to your door.
          </p>
          <TrackingTimeline events={detail.timeline} />
        </div>

        {/* Support footer */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Headphones className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Questions about your order?</p>
              <p className="text-xs text-muted-foreground">Reply to your order email or contact your account manager.</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
            wekbench · wekbench.com · 2026
        </p>
      </main>
    </div>
  )
}


export const Route = createFileRoute("/track/$token")({
  component: BuyerTrackingPage,
});
