import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, ArrowUpRight, Truck, Search, X } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/foundations/empty-state";
import { listOrders } from "@/lib/api/orders.functions";

function fmtMoney(v: number | null | undefined, c: string | null | undefined) {
  return `${c ?? ""} ${Number(v ?? 0).toLocaleString()}`.trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orderYear(o: any): number | null {
  const d = o.ordered_at ?? o.created_at;
  if (!d) return null;
  const y = new Date(d).getFullYear();
  return Number.isFinite(y) ? y : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupByYear(orders: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any[]>();
  for (const o of orders) {
    const y = orderYear(o);
    const key = y == null ? "Undated" : String(y);
    (map.get(key) ?? map.set(key, []).get(key)!).push(o);
  }
  return [...map.entries()]
    .sort((a, b) => {
      if (a[0] === "Undated") return 1;
      if (b[0] === "Undated") return -1;
      return Number(b[0]) - Number(a[0]); // newest year first
    })
    .map(([year, items]) => ({
      year,
      items,
      count: items.length,
      total: items.reduce((s, o) => s + Number(o.value ?? 0), 0),
      currency: items[0]?.currency ?? "GHS",
    }));
}

function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const listFn = useServerFn(listOrders);
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => listFn() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = ((data as any)?.orders ?? []) as any[];
  const filteredOrders = orders.filter(order => {
    const matchesStatus = !statusFilter || String(order.status).replace("_", " ") === statusFilter;
    const matchesSearch = !searchTerm || 
      String(order.order_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.buyer_company ?? order.buyer_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.buyer_po_ref ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const groups = groupByYear(filteredOrders);
  const grandTotal = filteredOrders.reduce((s, o) => s + Number(o.value ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Orders"
        description="Sales orders grouped by year. Track fulfillment end to end."
      />

      {/* Filters and search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order number, buyer, or PO…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 pl-9 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter ?? ""}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
        >
          <option value="">All statuses</option>
          {["confirmed", "production", "shipping", "delivered", "cancelled"].map(status => (
            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
          ))}
        </select>
      </div>

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
        <>
          {/* Year summary chips */}
          <div className="mt-6 flex flex-wrap gap-3">
            {groups.map((g) => (
              <div key={`sum-${g.year}`} className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{g.year}</p>
                <p className="text-lg font-semibold tabular-nums">{fmtMoney(g.total, g.currency)}</p>
                <p className="text-xs text-muted-foreground">{g.count} order{g.count === 1 ? "" : "s"}</p>
              </div>
            ))}
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">All years</p>
              <p className="text-lg font-semibold tabular-nums">{fmtMoney(grandTotal, groups[0]?.currency ?? "GHS")}</p>
              <p className="text-xs text-muted-foreground">{orders.length} orders</p>
            </div>
          </div>

          <div className="mt-6 space-y-8">
            {groups.map((g) => (
              <section key={g.year}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold text-foreground">{g.year}</h2>
                  <p className="text-xs text-muted-foreground">
                    {g.count} order{g.count === 1 ? "" : "s"} · <span className="tabular-nums">{fmtMoney(g.total, g.currency)}</span>
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
                    <span>Order</span>
                    <span>Buyer</span>
                    <span>Shipment</span>
                    <span>Value</span>
                    <span>Status</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.items.map((order) => (
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
                              <p className="truncate text-sm font-medium text-foreground">
                                {order.description ?? (order.ordered_at ? new Date(order.ordered_at).toLocaleDateString() : "—")}
                              </p>
                              {order.buyer_po_ref && (
                                <p className="truncate text-[11px] text-muted-foreground">
                                  PO {order.buyer_po_ref}
                                  {order.po_status === "acknowledged" ? " · acknowledged" : ""}
                                </p>
                              )}
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
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/orders/")({
  component: OrdersPage,
});
