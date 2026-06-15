import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import {
  Inbox,
  FileClock,
  TrendingUp,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Sparkles,
  FileText,
  Mailbox,
  ArrowRight,
  Plus,
  ChevronDown,
  Mail,
  PenLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewQuoteDialog } from "@/components/new-quote-dialog"

import { Badge } from "@/components/ui/badge"
import { FxRatesCard } from "@/components/fx-rates-card"
import { ShippingRatesCard } from "@/components/shipping-rates-card"
import { QuotesPerWeekChart } from "@/components/quotes-per-week-chart"
import { DashboardWelcome } from "@/components/dashboard-welcome"
import { buyers } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useProfile } from "@/hooks/use-profile"
import { useWorkspaceId } from "@/hooks/use-workspace"
import { listActivity, listRfqs } from "@/lib/api/quotes.functions"

/* ---- KPI strip ---- */
const kpis = [
  {
    label: "Open RFQs",
    value: "4",
    icon: Inbox,
    href: "/inbox",
    delta: { dir: "up" as const, text: "+2 vs last week" },
  },
  {
    label: "Quotes awaiting response",
    value: "3",
    icon: FileClock,
    href: "/quotes",
    delta: { dir: "flat" as const, text: "avg 4.2 days waiting" },
  },
  {
    label: "Won this month",
    value: "GH₵94.2M",
    icon: TrendingUp,
    href: "/quotes",
    delta: { dir: "up" as const, text: "61% win rate" },
  },
  {
    label: "Orders in transit",
    value: "2",
    icon: Truck,
    href: "/orders",
    delta: { dir: "down" as const, text: "1 overdue", alert: true },
  },
]

/* ---- Activity feed ---- */
const activityTone: Record<string, string> = {
  rfq: "bg-info/10 text-info",
  quote: "bg-primary/10 text-primary",
}

const activityIcon = {
  rfq: Inbox,
  quote: FileText,
} as const

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return "Yesterday"
  if (d < 7) return `${d} days ago`
  return new Date(iso).toLocaleDateString()
}

/* ---- Quote pipeline ---- */
const pipeline = [
  { stage: "Drafted", count: 3, value: 41.5, className: "bg-muted-foreground/30", text: "text-foreground" },
  { stage: "Submitted", count: 5, value: 88.2, className: "bg-info", text: "text-info-foreground" },
  { stage: "Clarification", count: 2, value: 22.7, className: "bg-warning", text: "text-warning-foreground" },
  { stage: "Won", count: 4, value: 94.2, className: "bg-success", text: "text-success-foreground" },
  { stage: "Lost", count: 2, value: 18.4, className: "bg-destructive/70", text: "text-destructive-foreground" },
  { stage: "Expired", count: 1, value: 7.9, className: "bg-muted-foreground/50", text: "text-foreground" },
]
const pipelineTotalValue = pipeline.reduce((s, p) => s + p.value, 0)
const pipelineTotalCount = pipeline.reduce((s, p) => s + p.count, 0)

/* ---- Top buyers this quarter ---- */
const topBuyers = [...buyers]
  .map((b) => ({ company: b.company, value: Number(b.lifetimeValue.replace(/[^\d]/g, "")) / 1_000_000 }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 5)
const topBuyerMax = Math.max(...topBuyers.map((b) => b.value))

/* ---- RFQ due-date formatting ---- */
function formatDue(d: string | null | undefined): { label: string; urgent: boolean } {
  if (!d) return { label: "No date", urgent: false }
  const due = new Date(`${d}T00:00:00`).getTime()
  if (Number.isNaN(due)) return { label: String(d), urgent: false }
  const days = Math.round((due - Date.now()) / 86_400_000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, urgent: true }
  if (days === 0) return { label: "Today", urgent: true }
  if (days === 1) return { label: "Tomorrow", urgent: true }
  if (days <= 3) return { label: `in ${days} days`, urgent: true }
  return { label: `in ${days} days`, urgent: false }
}

function DeltaIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up") return <ArrowUpRight className="size-3.5 text-success" />
  if (dir === "down") return <ArrowDownRight className="size-3.5 text-destructive" />
  return <span className="block h-px w-3 bg-muted-foreground" />
}

function CreateQuoteButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1">
            <Plus className="size-4" />
            New quote
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <PenLine className="size-4" />
            Create manually
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/email-capture" className="gap-2">
              <Mail className="size-4" />
              Upload PDF or Excel or CSV file
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewQuoteDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function DashboardPage() {
  const { data: profile } = useProfile();
  const { data: workspaceId } = useWorkspaceId();
  const listActivityFn = useServerFn(listActivity);
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard-activity", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listActivityFn(),
  });
  const activity = activityData?.events ?? [];

  const listRfqsFn = useServerFn(listRfqs);
  const { data: rfqData, isLoading: rfqLoading } = useQuery({
    queryKey: ["dashboard-rfqs", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listRfqsFn(),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRfqs = (rfqData?.rfqs ?? []) as any[];
  const openRfqs = allRfqs.filter((r) => r.status === "open");
  const attentionRfqs = (openRfqs.length ? openRfqs : allRfqs)
    .slice()
    .sort((a, b) => {
      const ad = a.due_date ? +new Date(a.due_date) : Infinity;
      const bd = b.due_date ? +new Date(b.due_date) : Infinity;
      return ad - bd;
    })
    .slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-4 md:px-8">
      {/* First sign-in welcome (shows once after onboarding) */}
      <DashboardWelcome />

      {/* Row 1: greeting + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {greeting}{profile?.firstName ? `, ${profile.firstName}` : ""}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateQuoteButton />
          <Link
            to="/inbox"
            className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <Sparkles className="size-3.5 shrink-0" />
            <span className="truncate">What&apos;s new · 3 RFQs arrived overnight</span>
          </Link>
        </div>
      </div>

      {/* Row 2: KPI strip */}
      <section aria-label="Key metrics" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link
              key={kpi.label}
              to={kpi.href}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-secondary/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{kpi.value}</p>
              <div className="mt-1.5 flex items-center gap-1 text-xs">
                <DeltaIcon dir={kpi.delta.dir} />
                <span className={cn("font-medium", kpi.delta.alert ? "text-destructive" : "text-muted-foreground")}>
                  {kpi.delta.text}
                </span>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Row 3: RFQs needing attention (8) + Activity feed (4) */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-8">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">RFQs needing attention</h2>
            <Link to="/inbox" className="text-xs font-medium text-primary hover:underline">
              View all RFQs
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Buyer</th>
                  <th className="px-4 py-2 font-medium">Reference</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rfqLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                      Loading RFQs…
                    </td>
                  </tr>
                ) : attentionRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                      No RFQs yet. New RFQs appear here as they arrive.
                    </td>
                  </tr>
                ) : (
                  attentionRfqs.map((rfq) => {
                    const due = formatDue(rfq.due_date)
                    return (
                      <tr key={rfq.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {rfq.buyer_name ?? rfq.buyer_email ?? rfq.buyer_ref ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {rfq.buyer_ref ?? String(rfq.id).slice(0, 8)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                              due.urgent ? "bg-destructive/10 text-destructive" : "text-muted-foreground",
                            )}
                          >
                            {due.urgent && <AlertTriangle className="size-3" />}
                            {due.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="capitalize">{rfq.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Link
                            to="/rfq/$id"
                            params={{ id: rfq.id }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Open <ArrowRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Activity feed */}
        <section className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Activity feed</h2>
            <span className="text-xs text-muted-foreground">Last 10 events</span>
          </div>
          <ol className="relative px-4 py-3">
            <span className="absolute left-[27px] top-4 bottom-4 w-px bg-border" aria-hidden />
            {activityLoading ? (
              <li className="px-1 py-2 text-xs text-muted-foreground">Loading activity…</li>
            ) : activity.length === 0 ? (
              <li className="px-1 py-2 text-xs text-muted-foreground">
                No activity yet. New RFQs and quotes will appear here.
              </li>
            ) : (
              activity.map((e) => {
                const Icon = activityIcon[e.type]
                return (
                  <li key={e.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                    <span
                      className={cn(
                        "z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                        activityTone[e.type],
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-xs font-medium leading-snug text-foreground">{e.text}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.meta}</p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground">{timeAgo(e.at)}</span>
                  </li>
                )
              })
            )}
          </ol>
        </section>
      </div>

      {/* Row 4: Quote pipeline summary */}
      <section className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Quote pipeline summary</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold tabular-nums text-foreground">{pipelineTotalCount}</span> quotes
            </span>
            <span>
              <span className="font-semibold tabular-nums text-foreground">GH₵{pipelineTotalValue.toFixed(1)}M</span>{" "}
              total value
            </span>
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="flex h-9 w-full overflow-hidden rounded-md">
            {pipeline.map((seg) => (
              <Link
                key={seg.stage}
                to={`/quotes?stage=${seg.stage.toLowerCase()}`}
                style={{ width: `${(seg.value / pipelineTotalValue) * 100}%` }}
                className={cn(
                  "flex items-center justify-center text-[11px] font-semibold tabular-nums transition-opacity hover:opacity-80",
                  seg.className,
                  seg.text,
                )}
                title={`${seg.stage}: ${seg.count} quotes · GH₵${seg.value}M`}
              >
                {seg.count}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {pipeline.map((seg) => (
              <div key={seg.stage} className="flex items-center gap-1.5 text-xs">
                <span className={cn("size-2.5 rounded-sm", seg.className)} aria-hidden />
                <span className="text-muted-foreground">{seg.stage}</span>
                <span className="font-medium tabular-nums text-foreground">{seg.count}</span>
                <span className="tabular-nums text-muted-foreground">· GH₵{seg.value}M</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Row 5: weekly metrics (6) + top buyers (6) */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">This month&apos;s metrics</h2>
            <span className="text-xs text-muted-foreground">Quotes sent per week</span>
          </div>
          <div className="mt-3">
            <QuotesPerWeekChart />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Top buyers by value</h2>
            <span className="text-xs text-muted-foreground">This quarter</span>
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {topBuyers.map((b) => (
              <li key={b.company} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-sm text-foreground">{b.company}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-secondary">
                  <div
                    className="h-full rounded bg-primary/80"
                    style={{ width: `${(b.value / topBuyerMax) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-foreground">
                  GH₵{b.value.toFixed(1)}M
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Market data: FX + shipping (carried over from earlier request) */}
      <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FxRatesCard />
        <ShippingRatesCard />
      </section>
    </div>
  )
}


export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});
