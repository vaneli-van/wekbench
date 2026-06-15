import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, ArrowUpRight, Truck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/foundations/empty-state";
import { listOrders } from "@/lib/api/orders.functions";

function fmtMoney(v: number | null | undefined, c: string | null | undefined) {
  return `${c ?? ""} ${Number(v ?? 0).toLocaleString()}`.trim();
}

function OrdersPage() {
  const listFn = useServerFn(listOrders);
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => listFn() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = ((data as any)?.orders ?? []) as any[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Orders"
        description="Orders created from accepted quotes. Track fulfillment end to end."
      />

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading orders…</p>
      ) : orders.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Package}
          title="No orders yet."
          description="Accept a quote to create an order you can track."
          action={{ label: "Go to quotes", href: "/quotes" }}
        />
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
            <span>Order</span>
            <span>Buyer</span>
            <span>Shipment</span>
            <span>Value</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  to="/orders/$id"
                  params={{ id: order.id }}
                  className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-muted/30 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center md:gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Package className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{order.order_number}</p>
                      <p className="truncate text-sm font-medium text-foreground">{order.description ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{order.buyer_company ?? order.buyer_name ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Truck className="size-3.5" />
                    {order.carrier ?? "Not shipped"}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{fmtMoney(order.value, order.currency)}</p>
                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <Badge variant="outline" className="capitalize">{String(order.status).replace("_", " ")}</Badge>
                    <ArrowUpRight className="hidden size-4 text-muted-foreground md:block" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/orders/")({
  component: OrdersPage,
});
