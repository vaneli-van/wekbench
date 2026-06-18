import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Truck, Plus, FileQuestion } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BreadcrumbsDisplay } from "@/components/breadcrumbs-display";
import { generateBreadcrumbs } from "@/lib/breadcrumbs";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/foundations/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getOrder, updateOrderStatus, setOrderShipping, addOrderEvent, ORDER_STATUSES,
} from "@/lib/api/orders.functions";
import { OrderPoCard } from "@/components/order-po-card";

const STAGES = ["received", "confirmed", "processing", "shipped", "in_transit", "delivered"] as const;

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "";
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? String(d) : new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function OrderDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getOrder);
  const statusFn = useServerFn(updateOrderStatus);
  const shipFn = useServerFn(setOrderShipping);
  const eventFn = useServerFn(addOrderEvent);

  const { data, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["order", id] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = (data as any)?.order;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = (data as any)?.events ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems: any[] = (data as any)?.lineItems ?? [];

  const statusMut = useMutation({
    mutationFn: (status: string) => statusFn({ data: { orderId: id, status: status as (typeof ORDER_STATUSES)[number] } }),
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  const shipMut = useMutation({
    mutationFn: (vars: Record<string, string>) => shipFn({ data: { orderId: id, ...vars } }),
    onSuccess: () => { toast.success("Shipment saved"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });
  const eventMut = useMutation({
    mutationFn: (label: string) => eventFn({ data: { orderId: id, label } }),
    onSuccess: () => { toast.success("Update added"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // Shipment form local state (seeded once order loads)
  const [carrier, setCarrier] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState("");

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">Loading order…</div>;
  }
  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState icon={FileQuestion} title="Order not found" description={error instanceof Error ? error.message : `No order with id "${id}".`} action={{ label: "Back to orders", href: "/orders" }} />
      </div>
    );
  }

  const currentIndex = STAGES.indexOf(order.status);
  const trackUrl = typeof window !== "undefined" ? `${window.location.origin}/track/${order.share_token}` : `/track/${order.share_token}`;

  const breadcrumbs = generateBreadcrumbs("order", order?.id?.slice(-6));
  return (
    <PageTransition>
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to orders
      </Link>

      <PageHeader
        title={order.order_number}
        description={order.description ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={order.status} onValueChange={(v) => statusMut.mutate(v)}>
              <SelectTrigger className="h-9 w-44 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Buyer</p>
          <p className="font-medium">{order.buyer_company ?? order.buyer_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{order.buyer_email ?? ""}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Value</p>
          <p className="font-medium tabular-nums">{order.currency ?? ""} {Number(order.value ?? 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Current status</p>
          <Badge variant="outline" className="mt-1 capitalize">{String(order.status).replace("_", " ")}</Badge>
        </Card>
      </div>

      {/* Stage progress */}
      {order.status !== "cancelled" && (
        <div className="mt-4 flex items-center rounded-lg border border-border bg-card px-4 py-4">
          {STAGES.map((s, i) => {
            const done = i <= currentIndex;
            return (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={"flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold " + (done ? "border-success bg-success text-background" : "border-border bg-card text-muted-foreground")}>{i + 1}</div>
                  <span className={"text-center text-[11px] capitalize " + (done ? "font-medium text-foreground" : "text-muted-foreground")}>{s.replace("_", " ")}</span>
                </div>
                {i < STAGES.length - 1 && <div className={"mx-1.5 h-0.5 flex-1 rounded-full " + (i < currentIndex ? "bg-success" : "bg-border")} aria-hidden />}
              </div>
            );
          })}
        </div>
      )}

      {/* Buyer tracking link */}
      <Card className="mt-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Buyer tracking link</p>
          <p className="truncate text-xs text-muted-foreground">{trackUrl}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(trackUrl); toast.success("Link copied"); }}>
            <Copy className="size-3.5" /> Copy
          </Button>
          <a href={`/track/${order.share_token}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">Open</Button>
          </a>
        </div>
      </Card>

      {/* Line items */}
      {lineItems.length > 0 && (
        <Card className="mt-4 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Items ({lineItems.length})</h2>
            <span className="text-xs text-muted-foreground">Ex-tax subtotals</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right w-20">Qty</th>
                  <th className="px-3 py-2 text-right w-28">Unit price</th>
                  <th className="px-3 py-2 text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="px-3 py-2 align-top text-muted-foreground tabular-nums">{li.line_no}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-pretty">{li.product ?? li.description ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums align-top">{Number(li.qty ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums align-top">{Number(li.unit_price ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums align-top">{Number(li.subtotal ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/20">
                  <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Order total (incl. tax)</td>
                  <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">{order.currency ?? "GHS"} {Number(order.value ?? 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <div className="mt-4">
        <OrderPoCard orderId={id} order={order} onChanged={invalidate} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Shipment */}
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Truck className="size-4" /> Shipment</h2>
          <div className="space-y-2">
            <Input placeholder="Carrier (e.g. DHL Global Forwarding)" defaultValue={order.carrier ?? ""} onChange={(e) => setCarrier(e.target.value)} />
            <Input placeholder="Tracking number" defaultValue={order.tracking_number ?? ""} onChange={(e) => setTracking(e.target.value)} />
            <Input placeholder="Carrier tracking URL" defaultValue={order.tracking_url ?? ""} onChange={(e) => setTrackingUrl(e.target.value)} />
            <Input type="date" defaultValue={order.expected_delivery ?? ""} onChange={(e) => setEta(e.target.value)} />
            <Button
              size="sm"
              disabled={shipMut.isPending}
              onClick={() => shipMut.mutate({
                ...(carrier !== null ? { carrier } : {}),
                ...(tracking !== null ? { trackingNumber: tracking } : {}),
                ...(trackingUrl !== null ? { trackingUrl } : {}),
                ...(eta !== null ? { expectedDelivery: eta } : {}),
              })}
            >
              {shipMut.isPending ? "Saving…" : "Save shipment"}
            </Button>
          </div>
        </Card>

        {/* Tracking updates */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Tracking updates</h2>
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="Add an update (e.g. Cleared customs)"
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newEvent.trim()) { eventMut.mutate(newEvent.trim()); setNewEvent(""); } }}
            />
            <Button size="sm" disabled={!newEvent.trim() || eventMut.isPending} onClick={() => { eventMut.mutate(newEvent.trim()); setNewEvent(""); }}>
              <Plus className="size-3.5" />
            </Button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            <ol className="relative ml-1">
              <span className="absolute left-[5px] top-1 bottom-1 w-px bg-border" aria-hidden />
              {events.slice().reverse().map((e) => (
                <li key={e.id} className="relative flex gap-3 pb-3 last:pb-0">
                  <span className="z-10 mt-1 size-2.5 shrink-0 rounded-full bg-primary ring-4 ring-card" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{e.label}</p>
                    {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                    <p className="text-[11px] text-muted-foreground">{fmtDateTime(e.occurred_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
    </PageTransition>
  );
}

export const Route = createFileRoute("/_app/orders/$id")({
  component: OrderDetailPage,
});
