import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { listQuotes } from "@/lib/api/quotes.functions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import {
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Table as TableIcon,
  ChevronDown,
  X,
  ArrowUpDown,
  Bookmark,
  ReceiptText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
import { QuoteCard } from "@/components/pipeline/quote-card"
import { EmptyState } from "@/components/foundations/empty-state"
import {
  pipelineQuotes,
  PIPELINE_STAGES,
  ASSIGNEES,
  SECTORS,
  formatCedi,
  formatCediFull,
  initials,
  type PipelineQuote,
  type PipelineStageId,
} from "@/lib/pipeline"
import { useManualQuotes } from "@/lib/manual-quotes"
import { NewQuoteDialog } from "@/components/new-quote-dialog"
import { cn } from "@/lib/utils"

type ViewMode = "kanban" | "list"
type SortKey = "value" | "daysInStage" | "buyer" | "updatedAt"

function QuotesPage() {
  const navigate = useNavigate()
  const manualQuotes = useManualQuotes()
  const [seededQuotes, setSeededQuotes] = useState<PipelineQuote[]>(pipelineQuotes)
  const quotes = useMemo(() => [...manualQuotes, ...seededQuotes], [manualQuotes, seededQuotes])
  const setQuotes = setSeededQuotes
  const [view, setView] = useState<ViewMode>("kanban")
  const [search, setSearch] = useState("")
  const [buyerFilter, setBuyerFilter] = useState<string[]>([])
  const [sectorFilter, setSectorFilter] = useState<string[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<PipelineStageId | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const buyers = useMemo(
    () => Array.from(new Set([...manualQuotes, ...pipelineQuotes].map((q) => q.buyer))),
    [manualQuotes],
  )

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch =
        !search ||
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.id.toLowerCase().includes(search.toLowerCase()) ||
        q.buyer.toLowerCase().includes(search.toLowerCase())
      const matchesBuyer = buyerFilter.length === 0 || buyerFilter.includes(q.buyer)
      const matchesSector = sectorFilter.length === 0 || sectorFilter.includes(q.sector)
      const matchesAssignee = assigneeFilter.length === 0 || assigneeFilter.includes(q.assignee)
      return matchesSearch && matchesBuyer && matchesSector && matchesAssignee
    })
  }, [quotes, search, buyerFilter, sectorFilter, assigneeFilter])

  const activeFilterCount = buyerFilter.length + sectorFilter.length + assigneeFilter.length

  function clearFilters() {
    setBuyerFilter([])
    setSectorFilter([])
    setAssigneeFilter([])
    setSearch("")
  }

  function handleDrop(stage: PipelineStageId) {
    setOverStage(null)
    if (!dragId) return
    const quote = quotes.find((q) => q.id === dragId)
    if (!quote || quote.stage === stage) {
      setDragId(null)
      return
    }
    const fromLabel = PIPELINE_STAGES.find((s) => s.id === quote.stage)?.label
    const toLabel = PIPELINE_STAGES.find((s) => s.id === stage)?.label
    setQuotes((prev) =>
      prev.map((q) => (q.id === dragId ? { ...q, stage, daysInStage: 0, updatedAt: "2026-06-10" } : q)),
    )
    setDragId(null)
    toast.success(`${quote.id} moved to ${toLabel}`, {
      description: `From ${fromLabel}`,
      action: {
        label: "Undo",
        onClick: () =>
          setQuotes((prev) =>
            prev.map((q) =>
              q.id === quote.id ? { ...q, stage: quote.stage, daysInStage: quote.daysInStage } : q,
            ),
          ),
      },
    })
  }

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  return (
    <div className="flex h-full flex-col">
      <Toaster position="bottom-right" />

      <LiveQuotesPanel />

      {/* Header + controls */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Quote pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} quotes · {formatCedi(filtered.reduce((s, q) => s + q.value, 0))} total value
            </p>
          </div>
          <NewQuoteDialog />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotes..."
              className="h-9 pl-8"
            />
          </div>

          {/* Filters */}
          <FilterMenu label="Buyer" options={buyers} selected={buyerFilter} onToggle={(v) => toggle(buyerFilter, v, setBuyerFilter)} />
          <FilterMenu label="Sector" options={SECTORS} selected={sectorFilter} onToggle={(v) => toggle(sectorFilter, v, setSectorFilter)} />
          <FilterMenu label="Assignee" options={ASSIGNEES} selected={assigneeFilter} onToggle={(v) => toggle(assigneeFilter, v, setAssigneeFilter)} />

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="size-4" />
              Clear ({activeFilterCount})
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {view === "list" && (
              <Button variant="outline" size="sm" className="bg-transparent">
                <Bookmark className="size-4" />
                Save view
              </Button>
            )}
            {/* View toggle */}
            <div className="flex items-center rounded-md border border-border p-0.5">
              <ViewToggleButton active={view === "kanban"} onClick={() => setView("kanban")} icon={LayoutGrid} label="Kanban" />
              <ViewToggleButton active={view === "list"} onClick={() => setView("list")} icon={ListIcon} label="List" />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      {filtered.length === 0 && quotes.length === 0 ? (
        <BoardEmptyState />
      ) : view === "kanban" ? (
        <KanbanBoard
          quotes={filtered}
          dragId={dragId}
          overStage={overStage}
          onDragStartCard={setDragId}
          onDragEndCard={() => setDragId(null)}
          onDragOverStage={setOverStage}
          onDrop={handleDrop}
          onOpen={(q) => navigate({ to: "/quote/$id", params: { id: q.id } })}
          onOpenFull={(q) => navigate({ to: "/quote/$id", params: { id: q.id } })}
        />
      ) : (
        <ListView
          quotes={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(k) => {
            if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc")
            else {
              setSortKey(k)
              setSortDir("desc")
            }
          }}
          onOpen={(q) => navigate({ to: "/quote/$id", params: { id: q.id } })}
        />
      )}
    </div>
  )
}

/* ---------- Kanban board ---------- */
function KanbanBoard({
  quotes,
  dragId,
  overStage,
  onDragStartCard,
  onDragEndCard,
  onDragOverStage,
  onDrop,
  onOpen,
  onOpenFull,
}: {
  quotes: PipelineQuote[]
  dragId: string | null
  overStage: PipelineStageId | null
  onDragStartCard: (id: string) => void
  onDragEndCard: () => void
  onDragOverStage: (s: PipelineStageId | null) => void
  onDrop: (s: PipelineStageId) => void
  onOpen: (q: PipelineQuote) => void
  onOpenFull: (q: PipelineQuote) => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex h-full gap-3 px-4 py-4 md:px-6">
        {PIPELINE_STAGES.map((stage) => {
          const stageQuotes = quotes.filter((q) => q.stage === stage.id)
          const total = stageQuotes.reduce((s, q) => s + q.value, 0)
          const isOver = overStage === stage.id
          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault()
                onDragOverStage(stage.id)
              }}
              onDragLeave={() => onDragOverStage(null)}
              onDrop={() => onDrop(stage.id)}
              className={cn(
                "flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
                isOver ? "border-foreground/30 bg-muted/60" : "border-border",
              )}
            >
              {/* Column header */}
              <div className="shrink-0 border-b border-border px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {stageQuotes.length}
                    </span>
                  </div>
                </div>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatCedi(total)}</p>
              </div>

              {/* Cards */}
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                {stageQuotes.length === 0 ? (
                  <p className="px-2 py-8 text-center text-xs text-muted-foreground">No quotes in this stage</p>
                ) : (
                  stageQuotes.map((q) => (
                    <QuoteCard
                      key={q.id}
                      quote={q}
                      dragging={dragId === q.id}
                      onOpen={() => onOpen(q)}
                      onOpenFull={() => onOpenFull(q)}
                      onDragStart={() => onDragStartCard(q.id)}
                      onDragEnd={onDragEndCard}
                    />
                  ))
                )}

                {stage.id === "drafted" && (
                  <button className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
                    <Plus className="size-3.5" />
                    Add quote
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- List / table view ---------- */
function ListView({
  quotes,
  sortKey,
  sortDir,
  onSort,
  onOpen,
}: {
  quotes: PipelineQuote[]
  sortKey: SortKey
  sortDir: "asc" | "desc"
  onSort: (k: SortKey) => void
  onOpen: (q: PipelineQuote) => void
}) {
  const sorted = useMemo(() => {
    const arr = [...quotes]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === "value") cmp = a.value - b.value
      else if (sortKey === "daysInStage") cmp = a.daysInStage - b.daysInStage
      else if (sortKey === "buyer") cmp = a.buyer.localeCompare(b.buyer)
      else cmp = a.updatedAt.localeCompare(b.updatedAt)
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [quotes, sortKey, sortDir])

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-4 md:px-6">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50">
            <tr className="border-b border-border text-left">
              <SortHeader label="Quote" />
              <SortHeader label="Buyer" active={sortKey === "buyer"} dir={sortDir} onClick={() => onSort("buyer")} />
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Stage</th>
              <SortHeader label="Value" align="right" active={sortKey === "value"} dir={sortDir} onClick={() => onSort("value")} />
              <SortHeader label="Days in stage" active={sortKey === "daysInStage"} dir={sortDir} onClick={() => onSort("daysInStage")} />
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((q) => (
              <tr
                key={q.id}
                onClick={() => onOpen(q)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium text-foreground">{q.id}</p>
                  <p className="max-w-xs truncate text-xs text-muted-foreground">{q.title}</p>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {initials(q.buyer)}
                    </span>
                    <span className="text-foreground">{q.buyer}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {PIPELINE_STAGES.find((s) => s.id === q.stage)?.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums text-foreground">
                      {formatCediFull(q.value)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("tabular-nums", q.daysInStage > 7 ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {q.daysInStage}d
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{q.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeader({
  label,
  align = "left",
  active,
  dir,
  onClick,
}: {
  label: string
  align?: "left" | "right"
  active?: boolean
  dir?: "asc" | "desc"
  onClick?: () => void
}) {
  return (
    <th className={cn("px-3 py-2.5 font-medium text-muted-foreground", align === "right" && "text-right")}>
      {onClick ? (
        <button
          onClick={onClick}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground",
            align === "right" && "flex-row-reverse",
            active && "text-foreground",
          )}
        >
          {label}
          <ArrowUpDown className="size-3" />
        </button>
      ) : (
        label
      )}
    </th>
  )
}

/* ---------- Filter dropdown ---------- */
function FilterMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("bg-transparent", selected.length > 0 && "border-foreground/30")}>
          {label}
          {selected.length > 0 && (
            <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
              {selected.length}
            </span>
          )}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filter by {label.toLowerCase()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
            onSelect={(e) => e.preventDefault()}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ViewToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function BoardEmptyState() {
  return (
    <EmptyState
      className="flex-1"
      icon={ReceiptText}
      title="No quotes yet."
      description="Build your first quote from an RFQ to start tracking your pipeline."
      action={{ label: "Go to RFQ inbox", href: "/inbox" }}
    />
  )
}


export const Route = createFileRoute("/_app/quotes")({
  component: QuotesPage,
});
