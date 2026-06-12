import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { notFound } from "@tanstack/react-router"
import {
  ChevronRight,
  FileText,
  Mail,
  Paperclip,
  Download,
  MoreHorizontal,
  ArrowRight,
  Plus,
  X,
  Sparkles,
  AlertTriangle,
  Building2,
  User,
  Inbox as InboxIcon,
  ClipboardList,
  RotateCcw,
  PencilLine,
  Check,
  Clock,
  PackageSearch,
  Calculator,
  ReceiptText,
  MessageSquare,
  FolderOpen,
  History,
  ArrowLeft,
} from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { ConfidenceBadge, type ConfidenceLevel } from "@/components/foundations/confidence-badge"
import { AiBadge, AiSources } from "@/components/foundations/ai-content"
import { EmptyState } from "@/components/foundations/empty-state"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProductMatching } from "@/components/product-matching"
import { LandedCostCalculator } from "@/components/landed-cost-calculator"
import { QuoteBuilder } from "@/components/quote-builder"
import { CommunicationUpdates } from "@/components/communication-updates"
import { Timeline } from "@/components/timeline"
import { rfqs, timeline } from "@/lib/data"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ---------------------------------------------------------------- */
/* Seeded extraction data — richer than the shared sample so the     */
/* "AI extraction" moment lands (7 items, 2 low-confidence flags).   */
/* ---------------------------------------------------------------- */

type ExtractedItem = {
  id: string
  description: string
  quantity: number
  unit: string
  brand: string
  model: string
  spec: string
  confidence: { level: ConfidenceLevel; score: number; sources: string[] }
}

const seededExtractions: Record<string, ExtractedItem[]> = {
  "RFQ-2026-0418": [
    {
      id: "LI-1",
      description: "Business Laptop",
      quantity: 25,
      unit: "units",
      brand: "Dell",
      model: "Latitude 5450",
      spec: 'Intel Core i7-1355U, 16GB RAM, 512GB SSD, 14" FHD, Windows 11 Pro',
      confidence: { level: "high", score: 0.96, sources: ["Page 1, line 4", "Spec table row 1"] },
    },
    {
      id: "LI-2",
      description: "Docking Station",
      quantity: 25,
      unit: "units",
      brand: "Dell",
      model: "WD19S 130W",
      spec: "USB-C dock, dual 4K display support, 130W power delivery",
      confidence: { level: "high", score: 0.93, sources: ["Page 1, line 6"] },
    },
    {
      id: "LI-3",
      description: "Laptop Carry Case",
      quantity: 25,
      unit: "units",
      brand: "Targus",
      model: "CN514",
      spec: '14" padded sleeve, water resistant',
      confidence: { level: "high", score: 0.91, sources: ["Page 2, line 2"] },
    },
    {
      id: "LI-4",
      description: "Wireless Mouse",
      quantity: 25,
      unit: "units",
      brand: "Logitech",
      model: "M331 Silent",
      spec: "2.4GHz wireless, silent click",
      confidence: { level: "medium", score: 0.74, sources: ["Page 2, line 5"] },
    },
    {
      id: "LI-5",
      description: "External SSD",
      quantity: 10,
      unit: "units",
      brand: "Samsung",
      model: "T7 1TB",
      spec: "Portable USB 3.2 SSD, 1TB",
      confidence: { level: "high", score: 0.9, sources: ["Page 2, line 7"] },
    },
    {
      id: "LI-6",
      description: "Extended Warranty (per laptop)",
      quantity: 25,
      unit: "units",
      brand: "Dell",
      model: "ProSupport 3yr",
      spec: "3-year next business day onsite — verify coverage scope",
      confidence: { level: "low", score: 0.42, sources: ["Page 3, footnote"] },
    },
    {
      id: "LI-7",
      description: "Monitor (optional add-on)",
      quantity: 12,
      unit: "units",
      brand: "Dell",
      model: "P2425 (?)",
      spec: '24" FHD IPS — model number unclear in source, please confirm',
      confidence: { level: "low", score: 0.38, sources: ["Handwritten note, page 3"] },
    },
  ],
}

function buildItems(rfqId: string, fallback: typeof rfqs[number]["lineItems"]): ExtractedItem[] {
  if (seededExtractions[rfqId]) return seededExtractions[rfqId]
  return fallback.map((li, i) => ({
    id: li.id,
    description: li.description,
    quantity: li.quantity,
    unit: li.unit,
    brand: li.brand,
    model: "—",
    spec: li.spec,
    confidence: {
      level: (i % 3 === 2 ? "low" : i % 2 === 0 ? "high" : "medium") as ConfidenceLevel,
      score: i % 3 === 2 ? 0.45 : i % 2 === 0 ? 0.92 : 0.7,
      sources: ["Extracted from source document"],
    },
  }))
}

const sourceText = `From: Adaeze Okafor <a.okafor@meridianbank.com>
Subject: RFQ — Branch Laptop Rollout (25 units)

Dear Supplier,

Please provide your best quotation for the following items for our
branch refresh programme. Delivery to Lagos head office. Quote validity
30 days. Payment terms: 30 days net on delivery.

  1. 25 x Dell Latitude business laptops — i7 / 16GB / 512GB SSD
  2. 25 x Dell WD19S docking stations
  3. 25 x 14" laptop carry cases
  4. 25 x wireless mice (silent)
  5. 10 x Samsung T7 1TB external SSD
  6. 3-year Dell ProSupport warranty per laptop
  7. (optional) 12 x 24" FHD monitors

Kindly respond by 12 June 2026.

Regards,
Adaeze Okafor
Procurement, Meridian Bank Plc`

/* ---------------------------------------------------------------- */

function RFQDetailPage() {
  const { id } = Route.useParams();

  const rfq = rfqs.find((r) => r.id === id)
  if (!rfq) return notFound()

  return <RFQDetail rfq={rfq} />
}

function RFQDetail({ rfq }: { rfq: (typeof rfqs)[number] }) {
  const [items, setItems] = useState<ExtractedItem[]>(() => buildItems(rfq.id, rfq.lineItems))
  const [confirmed, setConfirmed] = useState(false)
  const [stage, setStage] = useState<"extraction" | "sourcing">("extraction")
  const [activeTab, setActiveTab] = useState<WorkflowTabId>("matches")
  const [sourceTab, setSourceTab] = useState<"original" | "text" | "attachments">("original")

  const lowCount = useMemo(() => items.filter((i) => i.confidence.level === "low").length, [items])

  function updateItem(id: string, patch: Partial<ExtractedItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  function deleteItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `LI-${Date.now()}`,
        description: "",
        quantity: 1,
        unit: "units",
        brand: "",
        model: "",
        spec: "",
        confidence: { level: "high", score: 1, sources: ["Manually added"] },
      },
    ])
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 lg:py-6">
      {/* ---------- HEADER ---------- */}
      <header>
        <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/inbox" className="hover:text-foreground">
            RFQs
          </Link>
          <ChevronRight className="size-3" />
          <span className="hover:text-foreground">{rfq.buyer}</span>
          <ChevronRight className="size-3" />
          <span className="font-medium text-foreground">{rfq.ref}</span>
        </nav>

        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance md:text-2xl">
              {rfq.subject}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={rfq.status} />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <Mail className="size-3" />
                Email
              </span>
              <DeadlineCountdown />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {stage === "sourcing" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStage("extraction")}
                className="text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
                Extraction
              </Button>
            )}
            <BuildQuoteButton
              confirmed={confirmed}
              onBuild={() => {
                setStage("sourcing")
                setActiveTab("quote")
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => toast.info("Reassign — coming soon")}>Reassign</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success("RFQ archived")}>Archive</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => toast.success("Marked as Lost")}>
                  Mark as Lost
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ---------- STAGE: SOURCING (workflow tabs) ---------- */}
      {stage === "sourcing" ? (
        <div className="mt-5">
          <WorkflowTabs active={activeTab} onChange={setActiveTab} />
          <div className="mt-5">
            {activeTab === "matches" && <ProductMatching />}
            {activeTab === "pricing" && <LandedCostCalculator />}
            {activeTab === "quote" && <QuoteBuilder />}
            {activeTab === "comms" && <CommunicationUpdates />}
            {activeTab === "documents" && <DocumentsTab rfq={rfq} />}
            {activeTab === "activity" && (
              <div className="rounded-lg border border-border bg-card p-5">
                <Timeline events={timeline} />
              </div>
            )}
          </div>
        </div>
      ) : (
      /* ---------- STAGE: EXTRACTION (3-column body) ---------- */
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT — SOURCE */}
        <section className="lg:col-span-3">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex border-b border-border">
              {[
                { id: "original" as const, label: "Original" },
                { id: "text" as const, label: "Text" },
                { id: "attachments" as const, label: "Attachments" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSourceTab(t.id)}
                  className={cn(
                    "relative flex-1 px-2 py-2.5 text-xs font-medium transition-colors",
                    sourceTab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {sourceTab === t.id && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" aria-hidden />
                  )}
                </button>
              ))}
            </div>

            <div className="p-3">
              {sourceTab === "original" && <SourcePreview rfq={rfq} />}
              {sourceTab === "text" && (
                <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {sourceText}
                </pre>
              )}
              {sourceTab === "attachments" && <AttachmentsList rfq={rfq} />}
            </div>
          </div>
        </section>

        {/* MIDDLE — EXTRACTED LINE ITEMS */}
        <section className="lg:col-span-6">
          {items.length === 0 ? (
            <EmptyState
              className="rounded-lg border border-dashed border-border bg-card"
              icon={ClipboardList}
              title="No line items were extracted."
              description="Add the requested items manually to start sourcing."
              action={{ label: "Add line item", onClick: addItem }}
            />
          ) : (
            <div className="space-y-3">
              {/* AI attribution header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AiBadge sources={[rfq.document.name, "Email body"]} />
                  <span className="text-xs text-muted-foreground">
                    {items.length} line items extracted
                  </span>
                </div>
                <AiSources
                  label="Sources"
                  sources={[rfq.document.name, "Email body", "Spec table"]}
                  onSelect={() => setSourceTab("original")}
                />
              </div>

              {/* Warning callout */}
              {lowCount > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p className="text-sm text-foreground">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Sparkles className="size-3.5 text-warning" />
                      AI extracted {items.length} line items.
                    </span>{" "}
                    {lowCount} flagged as needing review (low confidence). Confirm or correct before
                    sourcing.
                  </p>
                </div>
              )}

              <LineItemsTable
                items={items}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onAdd={addItem}
              />
            </div>
          )}
        </section>

        {/* RIGHT — METADATA & ACTIONS */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-20 space-y-3">
            <MetaCard title="Buyer" icon={Building2}>
              <MetaRow label="Company" value={rfq.buyer} />
              <MetaRow label="Contact" value={rfq.buyerContact} />
              <MetaRow label="Email" value={rfq.buyerEmail} />
              <MetaRow label="Sector" value="Financial Services" />
              <MetaRow label="Payment history" value="30 days net · on time (4/4)" />
            </MetaCard>

            <MetaCard title="Source" icon={InboxIcon}>
              <MetaRow label="Channel" value="Email (rfq@inbox)" />
              <MetaRow label="Received" value={rfq.receivedAt} />
              <MetaRow label="File" value={rfq.document.name} />
            </MetaCard>

            <MetaCard title="Internal" icon={User}>
              <MetaRow label="Assigned to" value="Samuel Adeyemi" />
              <MetaRow label="Priority" value="High" />
              <MetaRow label="Notes" value="Repeat buyer — prioritise turnaround." />
            </MetaCard>

            <MetaCard title="Activity" icon={Clock}>
              <ul className="space-y-2.5">
                {activityEvents.map((e, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground">{e.text}</p>
                      <p className="text-[11px] text-muted-foreground">{e.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </MetaCard>

            {/* Sticky confirm */}
            <div className="rounded-lg border border-border bg-card p-3">
              {confirmed ? (
                <Button
                  onClick={() => {
                    setStage("sourcing")
                    setActiveTab("matches")
                  }}
                  className="w-full"
                >
                  Continue to sourcing
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setConfirmed(true)}
                  className="h-auto w-full whitespace-normal py-2 text-center leading-snug"
                  disabled={items.length === 0}
                >
                  Confirm extraction and start sourcing
                  <ArrowRight className="size-4 shrink-0" />
                </Button>
              )}
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {confirmed
                  ? "Extraction confirmed. Continue to product matching."
                  : "AI suggests, you confirm. Review the items above first."}
              </p>
            </div>
          </div>
        </aside>
      </div>
      )}
      </div>
    </TooltipProvider>
  )
}

/* ---------- Build Quote button (gated) ---------- */
function BuildQuoteButton({ confirmed, onBuild }: { confirmed: boolean; onBuild: () => void }) {
  return (
    <Button
      onClick={() => {
        if (!confirmed) {
          toast.info("Confirm the extraction first", {
            description: "Review the parsed items, then click \"Confirm extraction and start sourcing\".",
          })
          return
        }
        onBuild()
      }}
    >
      Build Quote
    </Button>
  )
}

/* ---------- Workflow tabs (sourcing stage) ---------- */
type WorkflowTabId = "matches" | "pricing" | "quote" | "comms" | "documents" | "activity"

const workflowTabs: { id: WorkflowTabId; label: string; icon: React.ElementType }[] = [
  { id: "matches", label: "Product Matches", icon: PackageSearch },
  { id: "pricing", label: "Pricing", icon: Calculator },
  { id: "quote", label: "Quote", icon: ReceiptText },
  { id: "comms", label: "Communication & Updates", icon: MessageSquare },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "activity", label: "Activity Timeline", icon: History },
]

function WorkflowTabs({
  active,
  onChange,
}: {
  active: WorkflowTabId
  onChange: (id: WorkflowTabId) => void
}) {
  return (
    <div className="overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-1">
        {workflowTabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" aria-hidden />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Documents tab ---------- */
function DocumentsTab({ rfq }: { rfq: (typeof rfqs)[number] }) {
  const docs = [
    { name: rfq.document.name, size: rfq.document.size, kind: "Source RFQ", type: "pdf" as const },
    { name: "Branch-list-Q3.xlsx", size: "32 KB", kind: "Attachment", type: "xls" as const },
    { name: `Quote-${rfq.ref}-v1.pdf`, size: "180 KB", kind: "Generated quote", type: "pdf" as const },
  ]
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <ul className="divide-y divide-border">
        {docs.map((d) => (
          <li key={d.name} className="flex items-center gap-3 px-4 py-3">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-md",
                d.type === "pdf" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
              )}
            >
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {d.kind} · {d.size}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toast.info(`Downloading ${d.name}…`)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Download className="size-4" />
              <span className="sr-only">Download {d.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Deadline countdown ---------- */
function DeadlineCountdown() {
  const [label, setLabel] = useState("Quote due in 6h 22m")
  useEffect(() => {
    // target ~6h22m from mount; tick every minute
    const target = Date.now() + (6 * 60 + 22) * 60 * 1000
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) return setLabel("Quote overdue")
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setLabel(`Quote due in ${h}h ${m}m`)
    }
    tick()
    const iv = setInterval(tick, 60_000)
    return () => clearInterval(iv)
  }, [])
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
      <Clock className="size-3" />
      {label}
    </span>
  )
}

/* ---------- Source previews ---------- */
function SourcePreview({ rfq }: { rfq: (typeof rfqs)[number] }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <div className="mx-auto max-w-full rounded bg-background p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Mail className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{rfq.buyerContact}</p>
            <p className="truncate text-[11px] text-muted-foreground">{rfq.buyerEmail}</p>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-foreground">RFQ — Branch Laptop Rollout (25 units)</p>
        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>Dear Supplier,</p>
          <p>
            Please provide your best quotation for the following items for our branch refresh
            programme. Delivery to Lagos head office. Quote validity 30 days.
          </p>
          <ol className="ml-4 list-decimal space-y-0.5">
            <li>25 x Dell Latitude business laptops</li>
            <li>25 x Dell WD19S docking stations</li>
            <li>25 x carry cases</li>
            <li>25 x wireless mice</li>
            <li className="text-foreground/80">…and 3 more items</li>
          </ol>
          <p>Kindly respond by 12 June 2026.</p>
        </div>
      </div>
    </div>
  )
}

function AttachmentsList({ rfq }: { rfq: (typeof rfqs)[number] }) {
  const files = [
    { name: rfq.document.name, size: rfq.document.size, type: "pdf" as const },
    { name: "Branch-list-Q3.xlsx", size: "32 KB", type: "xls" as const },
  ]
  return (
    <ul className="space-y-2">
      {files.map((f) => (
        <li
          key={f.name}
          className="flex items-center gap-2.5 rounded-md border border-border bg-background p-2.5"
        >
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-md",
              f.type === "pdf" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
            )}
          >
            <FileText className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{f.name}</p>
            <p className="text-[11px] text-muted-foreground">{f.size}</p>
          </div>
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Download className="size-4" />
            <span className="sr-only">Download {f.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Line items table ---------- */
function LineItemsTable({
  items,
  onUpdate,
  onDelete,
  onAdd,
}: {
  items: ExtractedItem[]
  onUpdate: (id: string, patch: Partial<ExtractedItem>) => void
  onDelete: (id: string) => void
  onAdd: () => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">

            <tr>
              <th className="w-24 px-2.5 py-2 text-left font-medium">Confidence</th>
              <th className="w-8 px-1 py-2 text-left font-medium">#</th>
              <th className="px-2.5 py-2 text-left font-medium">Description</th>
              <th className="w-14 px-2.5 py-2 text-right font-medium">Qty</th>
              <th className="w-16 px-2.5 py-2 text-left font-medium">Unit</th>
              <th className="px-2.5 py-2 text-left font-medium">Brand</th>
              <th className="px-2.5 py-2 text-left font-medium">Model</th>
              <th className="px-2.5 py-2 text-left font-medium">Specifications</th>
              <th className="w-8 px-1 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it, i) => {
              const flagged = it.confidence.level === "low"
              return (
                <tr key={it.id} className={cn("group align-top", flagged && "bg-warning/[0.06]")}>
                  <td className="px-2.5 py-2.5">
                    <ConfidenceBadge
                      level={it.confidence.level}
                      score={it.confidence.score}
                      sources={it.confidence.sources}
                    />
                  </td>
                  <td className="px-1 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-2.5 py-1.5">
                    <EditableCell
                      value={it.description}
                      onChange={(v) => onUpdate(it.id, { description: v })}
                      placeholder="Description"
                      className="font-medium text-foreground"
                    />
                  </td>
                  <td className="px-2.5 py-1.5 text-right">
                    <EditableCell
                      value={String(it.quantity)}
                      onChange={(v) => onUpdate(it.id, { quantity: Number(v) || 0 })}
                      align="right"
                      className="tabular-nums"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <EditableCell value={it.unit} onChange={(v) => onUpdate(it.id, { unit: v })} />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <EditableCell
                      value={it.brand}
                      onChange={(v) => onUpdate(it.id, { brand: v })}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <EditableCell
                      value={it.model}
                      onChange={(v) => onUpdate(it.id, { model: v })}
                      placeholder="—"
                      className="font-mono text-xs"
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <EditableCell
                      value={it.spec}
                      onChange={(v) => onUpdate(it.id, { spec: v })}
                      placeholder="Specifications"
                      multiline
                      className="text-muted-foreground"
                    />
                  </td>
                  <td className="px-1 py-2.5">
                    <button
                      onClick={() => onDelete(it.id)}
                      className="rounded p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                      <span className="sr-only">Delete line {i + 1}</span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={onAdd}
        className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <Plus className="size-4" />
        Add line item
      </button>
    </div>
  )
}

/* ---------- Inline editable cell ---------- */
function EditableCell({
  value,
  onChange,
  placeholder,
  className,
  align = "left",
  multiline = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  align?: "left" | "right"
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  function commit() {
    onChange(draft.trim())
    setEditing(false)
  }

  if (editing) {
    const sharedClass = cn(
      "w-full rounded border border-ring bg-background px-1.5 py-1 text-sm outline-none ring-2 ring-ring/20",
      align === "right" && "text-right",
      className,
    )
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false)
        }}
        className={cn(sharedClass, "resize-none leading-snug")}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className={sharedClass}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        "group/cell flex w-full items-start gap-1 rounded px-1.5 py-1 text-left transition-colors hover:bg-muted/60",
        align === "right" && "justify-end text-right",
        className,
      )}
    >
      <span className={cn("min-w-0 break-words", !value && "text-muted-foreground/50")}>
        {value || placeholder}
      </span>
      <PencilLine className="mt-0.5 size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover/cell:text-muted-foreground/60" />
    </button>
  )
}

/* ---------- Metadata cards ---------- */
function MetaCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="size-3.5 text-muted-foreground" />
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

const activityEvents = [
  { text: "RFQ received via email inbox", time: "8 Jun, 09:14" },
  { text: "AI extracted 7 line items", time: "8 Jun, 09:14" },
  { text: "Assigned to Samuel Adeyemi", time: "8 Jun, 09:20" },
  { text: "2 items flagged for review", time: "8 Jun, 09:21" },
  { text: "Buyer profile matched (repeat)", time: "8 Jun, 09:21" },
]


export const Route = createFileRoute("/_app/rfq/$id")({
  component: RFQDetailPage,
});
