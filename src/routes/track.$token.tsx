import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Headphones, Package, Truck, CheckCircle2, XCircle } from "lucide-react";

import { getTrackingByToken } from "@/lib/api/orders.functions";
import { Wordmark } from "@/components/wordmark";

const STAGES = [
  { key: "received", label: "Received" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "in_transit", label: "In transit" },
  { key: "delivered", label: "Delivered" },
] as const;

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return String(d);
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return String(d);
  return new Date(d).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-muted">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Wordmark size="sm" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" />
            Secure tracking
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}

function BuyerTrackingPage() {
  const { token } = Route.useParams();
  const trackFn = useServerFn(getTrackingByToken);
  const { data, isLoading, error } = useQuery({
    queryKey: ["tracking", token],
    queryFn: () => trackFn({ data: { token } }),
    retry: false,
  });

  if (isLoading) {
    return <Shell><p className="py-16 text-center text-sm text-muted-foreground">Loading your order…</p></Shell>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracking = (data as any)?.tracking;
  if (error || !tracking?.order) {
    return (
      <Shell>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Package className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Order not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This tracking link is invalid or has expired. Please check the link in your order email.
          </p>
        </div>
      </Shell>
    );
  }

  const order = tracking.order;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = Array.isArray(tracking.events) ? tracking.events : [];
  const cancelled = order.status === "cancelled";
  const currentIndex = STAGES.findIndex((s) => s.key === order.status);

  return (
    <Shell>
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              Order for {order.buyer_company ?? order.buyer_name ?? "you"}
            </p>
            <h1 className="mt-1 text-pretty text-xl font-semibold text-foreground">
              {order.description ?? order.order_number}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Reference {order.order_number}</p>
          </div>
          {cancelled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-sm font-medium text-destructive">
              <XCircle className="size-4" /> Cancelled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary capitalize">
              {order.status === "delivered" ? <CheckCircle2 className="size-4" /> : <Truck className="size-4" />}
              {String(order.status).replace("_", " ")}
            </span>
          )}
        </div>

        {!cancelled && (
          <div className="mt-6 flex items-center">
            {STAGES.map((s, i) => {
              const done = i <= currentIndex;
              return (
                <div key={s.key} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={
                        "flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold " +
                        (done ? "border-success bg-success text-background" : "border-border bg-card text-muted-foreground")
                      }
                    >
                      {i + 1}
                    </div>
                    <span className={"text-center text-[11px] " + (done ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={"mx-1.5 h-0.5 flex-1 rounded-full " + (i < currentIndex ? "bg-success" : "bg-border")} aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Expected delivery</dt>
            <dd className="mt-0.5 font-medium text-foreground">{fmtDate(order.expected_delivery)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Carrier</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {order.carrier ?? "—"}
              {order.tracking_number ? <span className="text-muted-foreground"> · {order.tracking_number}</span> : null}
            </dd>
          </div>
        </dl>
        {order.tracking_url && (
          <a href={order.tracking_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-medium text-primary hover:underline">
            Track with carrier →
          </a>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-sm font-semibold text-foreground">Tracking updates</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">Live updates as your order progresses.</p>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet.</p>
        ) : (
          <ol className="relative ml-1">
            <span className="absolute left-[5px] top-1 bottom-1 w-px bg-border" aria-hidden />
            {events.slice().reverse().map((e, i) => (
              <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
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
      </div>

      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-border bg-card p-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Headphones className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Questions about your order?</p>
          <p className="text-xs text-muted-foreground">Reply to your order email or contact your account manager.</p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">wekbench · wekbench.com · 2026</p>
    </Shell>
  );
}

export const Route = createFileRoute("/track/$token")({
  component: BuyerTrackingPage,
});
