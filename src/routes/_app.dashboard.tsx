import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { toast } from "sonner"
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
  ArrowRight,
  Plus,
  ChevronDown,
  Mail,
  PenLine,
  Upload,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewQuoteDialog } from "@/components/new-quote-dialog"
import { supabase } from "@/integrations/supabase/client"
import { ingestRfqUpload } from "@/lib/api/uploads.functions"

import { Badge } from "@/components/ui/badge"
import { FxRatesCard } from "@/components/fx-rates-card"
import { DashboardWelcome } from "@/components/dashboard-welcome"
import { GettingStartedTutorials } from "@/components/getting-started-tutorials"
import { cn } from "@/lib/utils"
import { useProfile } from "@/hooks/use-profile"
import { useWorkspaceId } from "@/hooks/use-workspace"
import { listActivity, listRfqs, approveExtractionToRfq } from "@/lib/api/quotes.functions"
import { listInboundHighlights } from "@/lib/api/emails.functions"
import { getDashboardStats } from "@/lib/api/dashboard.functions"

/* ---- formatting ---- */
function money(n: number, currency = "GHS") {
  const sym = currency === "GHS" ? "GH₵" : `${currency} `
  return `${sym}${Math.round(n).toLocaleString()}`
}

const activityTone: Record<string, string> = {
  rfq: "bg-info/10 text-info",
  quote: "bg-primary/10 text-primary",
}
const activityIcon = { rfq: Inbox, quote: FileText } as const

const STAGE_STYLE: Record<string, { bar: string; text: string; label: string }> = {
  drafted: { bar: "bg-muted-foreground/30", text: "text-foreground", label: "Drafted" },
  submitted: { bar: "bg-info", text: "text-info-foreground", label: "Submitted" },
  clarification: { bar: "bg-warning", text: "text-warning-foreground", label: "Clarification" },
  reviewing: { bar: "bg-primary", text: "text-primary-foreground", label: "Reviewing" },
  won: { bar: "bg-success", text: "text-success-foreground", label: "Won" },
  lost: { bar: "bg-destructive/70", text: "text-destructive-foreground", label: "Lost" },
  expired: { bar: "bg-muted-foreground/50", text: "text-foreground", label: "Expired" },
}

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
  const navigate = useNavigate()
  const { data: workspaceId } = useWorkspaceId()
  const ingestFn = useServerFn(ingestRfqUpload)
  const approveFn = useServerFn(approveExtractionToRfq)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | null | undefined) {
    if (!file) return
    if (!workspaceId) {
      toast.error("Workspace not ready — please try again in a moment")
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File exceeds 20MB")
      return
    }
    setUploading(true)
    const tid = toast.loading("Uploading and reading your file…")
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_")
      const path = `${workspaceId}/${crypto.randomUUID()}-${safe}`
      const { error: upErr } = await supabase.storage
        .from("rfq-uploads")
        .upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (upErr) throw new Error(upErr.message)
      const { documentId } = await ingestFn({ data: { filePath: path, fileName: file.name, contentType: file.type || undefined } })
      toast.loading("Creating your quote…", { id: tid })
      try {
        const { quoteId } = await approveFn({ data: { documentId, createQuote: true, defaultMarginPct: 20 } })
        if (quoteId) {
          toast.success("Quote created from your file", { id: tid })
          navigate({ to: "/quote/$id", params: { id: quoteId } })
          return
        }
      } catch (approveErr) {
        // If auto-approve can't complete, fall back to the extractions list so nothing is lost.
        console.error("[upload] auto-approve failed", approveErr)
      }
      toast.success("Extracted — review it", { id: tid })
      navigate({ to: "/extractions" })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: tid })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.csv,.txt,.xls,.xlsx,image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1" disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            New quote
            <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <PenLine className="size-4" />
            Create manually
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => fileRef.current?.click(), 0) }}>
            <Upload className="size-4" />
            Upload a file (PDF, CSV, image)
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/email-capture" className="gap-2">
              <Mail className="size-4" />
              Connect email
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

  const statsFn = useServerFn(getDashboardStats);
  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => statsFn(),
  });
  const stats = statsData ?? null;
  const k = stats?.kpis;
  const currency = stats?.currency ?? "GHS";

  const listActivityFn = useServerFn(listActivity);
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard-activity", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listActivityFn(),
  });
  const activity = activityData?.events ?? [];

  const listEmailsFn = useServerFn(listInboundHighlights);
  const { data: emailData } = useQuery({
    queryKey: ["dashboard-emails", workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listEmailsFn(),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailHighlights = ((emailData as any)?.emails ?? []) as any[];

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

  // KPI tiles built from real stats.
  const kpis = [
    {
      label: "Open RFQs",
      value: k ? String(k.openRfqs) : "—",
      icon: Inbox,
      href: "/inbox",
      delta: { dir: "flat" as const, text: k ? `${k.rfqsLast24h} new in 24h` : "" },
    },
    {
      label: "Quotes awaiting response",
      value: k ? String(k.quotesAwaiting) : "—",
      icon: FileClock,
      href: "/quotes",
      delta: { dir: "flat" as const, text: k ? `${k.totalQuotes} quotes total` : "" },
    },
    {
      label: "Won this month",
      value: k ? money(k.wonThisMonth, currency) : "—",
      icon: TrendingUp,
      href: "/orders",
      delta: { dir: "up" as const, text: k ? `${k.wonThisMonthCount} orders this month` : "" },
    },
    {
      label: "Orders in transit",
      value: k ? String(k.ordersInTransit) : "—",
      icon: Truck,
      href: "/orders",
      delta:
        k && k.overdue > 0
          ? { dir: "down" as const, text: `${k.overdue} overdue`, alert: true }
          : { dir: "flat" as const, text: "on track" },
    },
  ];

  const pipeline = stats?.pipeline ?? [];
  const pipelineTotalValue = pipeline.reduce((s, p) => s + p.value, 0);
  const pipelineTotalCount = pipeline.reduce((s, p) => s + p.count, 0);

  const topBuyers = stats?.topBuyers ?? [];
  const topBuyerMax = Math.max(1, ...topBuyers.map((b) => b.value));

  const ordersByYear = stats?.ordersByYear ?? [];
  const yearMax = Math.max(1, ...ordersByYear.map((y) => y.total));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-4 md:px-8">
      <DashboardWelcome />
      <GettingStartedTutorials />

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
          {k && k.rfqsLast24h > 0 && (
            <Link
              to="/inbox"
              className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Sparkles className="size-3.5 shrink-0" />
              <span className="truncate">
                What&apos;s new · {k.rfqsLast24h} RFQ{k.rfqsLast24h === 1 ? "" : "s"} in the last 24h
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Activation banner: show until the workspace has its first quote. */}
      {k && k.totalQuotes === 0 && (
        <Link
          to="/quotes"
          search={{ new: true }}
          className="mt-5 flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">Create your first quote</p>
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                Add a buyer and a few line items — source parts and set margin as you go. It&apos;s the fastest way to see Wekbench work.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground sm:self-center">
            Start now <ArrowRight className="size-4" />
          </span>
        </Link>
      )}

      {/* Row 2: KPI strip */}
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          const isPrimary = idx === 0
          return (
            <Link
              key={kpi.label}
              to={kpi.href}
              className={cn(
                "group rounded-lg p-4 transition-all",
                isPrimary
                  ? "border border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
                  : "border border-border bg-card hover:border-primary/30 hover:bg-secondary/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-medium uppercase tracking-wide", isPrimary ? "text-primary" : "text-muted-foreground")}>
                  {kpi.label}
                </span>
                <Icon className={cn("size-4", isPrimary ? "text-primary" : "text-muted-foreground")} />
              </div>
              <p className={cn("mt-3 text-3xl font-semibold tabular-nums tracking-tight", isPrimary ? "text-primary" : "text-foreground")}>
                {kpi.value}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-xs">
                <DeltaIcon dir={kpi.delta.dir} />
                <span className={cn("font-medium", "alert" in kpi.delta && kpi.delta.alert ? "text-destructive" : "text-muted-foreground")}>
                  {kpi.delta.text}
                </span>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Row 3: RFQs needing attention + Activity feed */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-8">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">RFQs needing attention</h2>
            <Link to="/inbox" className="text-xs font-medium text-primary hover:underline">View all RFQs</Link>
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
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading RFQs…</td></tr>
                ) : attentionRfqs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">No RFQs yet. New RFQs appear here as they arrive.</td></tr>
                ) : (
                  attentionRfqs.map((rfq) => {
                    const due = formatDue(rfq.due_date)
                    return (
                      <tr key={rfq.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-2.5 font-medium text-foreground">{rfq.buyer_name ?? rfq.buyer_email ?? rfq.buyer_ref ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{rfq.buyer_ref ?? String(rfq.id).slice(0, 8)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", due.urgent ? "bg-destructive/10 text-destructive" : "text-muted-foreground")}>
                            {due.urgent && <AlertTriangle className="size-3" />}
                            {due.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className="capitalize">{rfq.status}</Badge></td>
                        <td className="px-4 py-2.5 text-right">
                          <Link to="/rfq/$id" params={{ id: rfq.id }} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
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
              <li className="px-1 py-2 text-xs text-muted-foreground">No activity yet. New RFQs and quotes will appear here.</li>
            ) : (
              activity.map((e) => {
                const Icon = activityIcon[e.type]
                const href = e.type === "rfq" ? `/inbox` : e.type === "quote" ? `/quotes` : "#"
                return (
                  <li key={e.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                    <Link to={href} className="absolute inset-0 z-0" aria-hidden />
                    <span className={cn("relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card cursor-pointer hover:ring-primary/40", activityTone[e.type])}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="relative z-10 min-w-0 flex-1 pt-0.5">
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

      {/* Email highlights */}
      <section className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Email highlights</h2>
            <p className="text-xs text-muted-foreground">Captured emails matching RFQ, PO, amendment, invoice &amp; delivery</p>
          </div>
          <Link to="/inbox" className="text-xs font-medium text-primary hover:underline">Open inbox</Link>
        </div>
        {emailHighlights.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No matching emails captured yet. Forward RFQs and POs to your capture address (Email Capture).
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {emailHighlights.map((e) => (
              <li key={e.id}>
                <Link to="/inbox" className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{e.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.from}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(e.receivedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Row 4: Quote pipeline summary (real) */}
      <section className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Quote pipeline summary</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span><span className="font-semibold tabular-nums text-foreground">{pipelineTotalCount}</span> quotes</span>
            <span><span className="font-semibold tabular-nums text-foreground">{money(pipelineTotalValue, currency)}</span> total value</span>
          </div>
        </div>
        {pipeline.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            No quotes in the pipeline yet. New quotes appear here as you create them.
          </p>
        ) : (
          <div className="px-4 py-4">
            <div className="flex h-9 w-full overflow-hidden rounded-md">
              {pipeline.map((seg) => {
                const st = STAGE_STYLE[seg.stage] ?? STAGE_STYLE.drafted
                return (
                  <Link
                    key={seg.stage}
                    to={`/quotes?stage=${seg.stage}`}
                    style={{ width: `${(seg.value || 1) / (pipelineTotalValue || 1) * 100}%` }}
                    className={cn("flex items-center justify-center text-[11px] font-semibold tabular-nums transition-opacity hover:opacity-80", st.bar, st.text)}
                    title={`${st.label}: ${seg.count} quotes · ${money(seg.value, currency)}`}
                  >
                    {seg.count}
                  </Link>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {pipeline.map((seg) => {
                const st = STAGE_STYLE[seg.stage] ?? STAGE_STYLE.drafted
                return (
                  <div key={seg.stage} className="flex items-center gap-1.5 text-xs">
                    <span className={cn("size-2.5 rounded-sm", st.bar)} aria-hidden />
                    <span className="text-muted-foreground">{st.label}</span>
                    <span className="font-medium tabular-nums text-foreground">{seg.count}</span>
                    <span className="tabular-nums text-muted-foreground">· {money(seg.value, currency)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Row 5: revenue by year + top buyers (real) */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Revenue by year</h2>
            <span className="text-xs text-muted-foreground">All orders</span>
          </div>
          {ordersByYear.length === 0 ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {ordersByYear.map((y) => (
                <li key={y.year} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-sm tabular-nums text-foreground">{y.year}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-secondary">
                    <div className="h-full rounded bg-primary/80" style={{ width: `${(y.total / yearMax) * 100}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{y.count} ord.</span>
                  <span className="w-28 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-foreground">{money(y.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Top buyers by value</h2>
            <span className="text-xs text-muted-foreground">All orders</span>
          </div>
          {topBuyers.length === 0 ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">No buyers yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {topBuyers.map((b) => (
                <li key={b.company} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-foreground" title={b.company}>{b.company}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-secondary">
                    <div className="h-full rounded bg-primary/80" style={{ width: `${(b.value / topBuyerMax) * 100}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-foreground">{money(b.value, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Receivables (AR) + FX */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Link to="/invoices" className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-secondary/40">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Receivables</h2>
            <span className="text-xs text-muted-foreground">Open invoices</span>
          </div>
          {(() => {
            const ar = stats?.receivables ?? { outstanding: 0, overdue: 0, current: 0 };
            const pctOverdue = ar.outstanding > 0 ? (ar.overdue / ar.outstanding) * 100 : 0;
            return (
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">{money(ar.outstanding, currency)}</p>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-semibold tabular-nums", ar.overdue > 0 ? "text-destructive" : "text-foreground")}>{money(ar.overdue, currency)}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </div>
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="bg-success" style={{ width: `${100 - pctOverdue}%` }} aria-hidden />
                  <div className="bg-destructive" style={{ width: `${pctOverdue}%` }} aria-hidden />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Current {money(ar.current, currency)}</span>
                  <span>{pctOverdue.toFixed(0)}% overdue</span>
                </div>
              </div>
            );
          })()}
        </Link>
        <FxRatesCard />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});
