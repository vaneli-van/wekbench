import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Save,
  Send,
  FileDown,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Paperclip,
  Box,
  Check,
  MoreHorizontal,
  Copy,
  Archive,
  FileText,
  ArrowRightLeft,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"
import { AiBadge, AiSources } from "@/components/foundations/ai-content"
import { LandedCostBreakdown } from "@/components/foundations/landed-cost-breakdown"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/* ---------------- model ---------------- */

  const FX_RATE = 1580 // USD -> GHS
const FX_BUFFER = 0.03
const EFFECTIVE_FX = FX_RATE * (1 + FX_BUFFER)
const SHIPPING_USD_PER_UNIT = 48 // freight + clearing + local delivery
const DUTY_PCT = 0.05

interface Alternative {
  id: string
  label: string
  spec: string
  unitCostUSD: number
}

interface Line {
  id: string
  description: string
  spec: string
  quantity: number
  unitCostUSD: number
  marginPct: number
  sellingOverrideNGN: number | null
  deliveryTime: string
  datasheet: string
  internalNotes: string
  alternatives: Alternative[]
}

const initialLines: Line[] = [
  {
    id: "L1",
    description: "Dell Latitude 5450 Business Laptop",
    spec: 'Core i7-1355U, 16GB DDR5, 512GB NVMe SSD, 14" FHD, Win 11 Pro',
    quantity: 25,
    unitCostUSD: 985,
    marginPct: 18,
    sellingOverrideNGN: null,
    deliveryTime: "12-16 days",
    datasheet: "Dell-Latitude-5450-Datasheet.pdf",
    internalNotes: "Redington has 40 units in Dubai stock. Lock FX before PO.",
    alternatives: [
      { id: "A1", label: "HP EliteBook 640 G11", spec: "Core i7, 16GB, 512GB", unitCostUSD: 942 },
      { id: "A2", label: "Lenovo ThinkPad L14 Gen 5", spec: "Core i7, 16GB, 512GB", unitCostUSD: 908 },
    ],
  },
  {
    id: "L2",
    description: "Dell 24\" P2425H Monitor",
    spec: '24" FHD IPS, USB-C hub, height adjustable',
    quantity: 25,
    unitCostUSD: 168,
    marginPct: 22,
    sellingOverrideNGN: null,
    deliveryTime: "10-14 days",
    datasheet: "Dell-P2425H-Datasheet.pdf",
    internalNotes: "",
    alternatives: [
      { id: "A3", label: 'LG 24" 24BR550B', spec: "24\" FHD IPS", unitCostUSD: 142 },
    ],
  },
]

  const cedi = (n: number) => `GH₵${Math.round(n).toLocaleString()}`

function computeLine(line: Line) {
  const itemCost = line.unitCostUSD * EFFECTIVE_FX
  const shipping = SHIPPING_USD_PER_UNIT * EFFECTIVE_FX
  const dutyTaxes = (itemCost + shipping) * DUTY_PCT
  const landedPerUnit = itemCost + shipping + dutyTaxes
  const calculatedSelling = landedPerUnit * (1 + line.marginPct / 100)
  const sellingPerUnit = line.sellingOverrideNGN ?? calculatedSelling
  const marginValue = (sellingPerUnit - landedPerUnit) * line.quantity
  const total = sellingPerUnit * line.quantity
  return {
    itemCost,
    shipping,
    dutyTaxes,
    landedPerUnit,
    calculatedSelling,
    sellingPerUnit,
    marginValue,
    total,
    overridden: line.sellingOverrideNGN !== null,
  }
}

/* ---------------- main ---------------- */

export type QuoteBuilderProps = {
  quoteId?: string
  initialTitle?: string
  initialBuyer?: string
}

export function QuoteBuilder({ quoteId, initialTitle, initialBuyer }: QuoteBuilderProps = {}) {
  const [lines, setLines] = useState<Line[]>(initialLines)
  const [expanded, setExpanded] = useState<string | null>("L1")
  const [title, setTitle] = useState(initialTitle ?? "25 x Dell Latitude Business Laptops — Branch Rollout")
  const [buyer, setBuyer] = useState(initialBuyer ?? "Meridian Bank Plc")
  const [currency, setCurrency] = useState("GHS")
  const [validity, setValidity] = useState("21")
  const [paymentTerms, setPaymentTerms] = useState("50-50")
  const [incoterm, setIncoterm] = useState("DAP")
  const [buyerNotes, setBuyerNotes] = useState(
    "Pricing includes 3-year Dell ProSupport NBD on-site warranty. Delivery to all 5 branch locations included.",
  )
  const [internalNote, setInternalNote] = useState("Manager approval required before sending. Margin floor is 12%.")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const displayId = quoteId ?? "QT-2026-0418"

  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id))

  const moveLine = (id: string, dir: -1 | 1) =>
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const addLine = (source: string) =>
    setLines((prev) => [
      ...prev,
      {
        id: `L${Date.now()}`,
        description: source === "manual" ? "" : "New item from catalog",
        spec: "",
        quantity: 1,
        unitCostUSD: 0,
        marginPct: 18,
        sellingOverrideNGN: null,
        deliveryTime: "10-14 days",
        datasheet: "",
        internalNotes: "",
        alternatives: [],
      },
    ])

  const swapAlternative = (lineId: string, alt: Alternative) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const newAlt: Alternative = {
          id: `A${Date.now()}`,
          label: l.description,
          spec: l.spec,
          unitCostUSD: l.unitCostUSD,
        }
        return {
          ...l,
          description: alt.label,
          spec: alt.spec,
          unitCostUSD: alt.unitCostUSD,
          sellingOverrideNGN: null,
          alternatives: l.alternatives.map((a) => (a.id === alt.id ? newAlt : a)),
        }
      }),
    )

  const totals = useMemo(() => {
    const computed = lines.map(computeLine)
    const subtotal = computed.reduce((s, c) => s + c.total, 0)
    const landedTotal = computed.reduce((s, c) => s + c.landedPerUnit * 0 + c.landedPerUnit, 0)
    const totalLanded = lines.reduce((s, l, i) => s + computed[i].landedPerUnit * l.quantity, 0)
    const marginValue = computed.reduce((s, c) => s + c.marginValue, 0)
    const vat = subtotal * 0.075
    const total = subtotal + vat
    const marginPct = totalLanded > 0 ? (marginValue / totalLanded) * 100 : 0
    return { subtotal, vat, total, marginValue, marginPct }
  }, [lines])

  return (
    <div className="flex flex-col">
      {/* HEADER */}
      <header className="rounded-t-lg border border-border bg-card px-5 py-4">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Quotes</span>
          <ChevronRight className="size-3" />
          <span className="font-mono font-medium text-foreground">{displayId}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold text-foreground outline-none hover:border-border focus:border-ring"
              aria-label="Quote title"
            />
            <div className="mt-1 flex items-center gap-2 px-1 text-sm text-muted-foreground">
              <span>For</span>
              <input
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                className="rounded border border-transparent bg-transparent px-1 font-medium text-foreground outline-none hover:border-border focus:border-ring"
                aria-label="Buyer name"
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status="draft" />
            <p className="text-xs text-muted-foreground">
              Valid for <span className="font-medium text-foreground">{validity} days</span>
            </p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Check className="size-3 text-success" />
              Saved 2 min ago
            </p>
          </div>
        </div>
      </header>

      {/* SPLIT BODY */}
      <div className="grid grid-cols-1 gap-px border-x border-border bg-border lg:grid-cols-[1fr_340px]">
        {/* LEFT: line items */}
        <div className="bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Line items</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="size-4" />
                  Add line item
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => addLine("catalog")}>
                  <Box className="size-4" />
                  From catalog
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addLine("manual")}>
                  <FileText className="size-4" />
                  Manual entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addLine("copy")}>
                  <Copy className="size-4" />
                  Copy from previous quote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => {
              const c = computeLine(line)
              const isOpen = expanded === line.id
              return (
                <div key={line.id} className="overflow-hidden rounded-lg border border-border bg-card">
                  {/* row */}
                  <div className="flex items-start gap-2 p-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <button
                        onClick={() => moveLine(line.id, -1)}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">{idx + 1}</span>
                      <button
                        onClick={() => moveLine(line.id, 1)}
                        disabled={idx === lines.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>

                    <div className="grid flex-1 grid-cols-12 gap-3">
                      {/* description */}
                      <div className="col-span-12 lg:col-span-4">
                        <textarea
                          value={line.description}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          rows={2}
                          placeholder="Item description"
                          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm font-medium text-foreground outline-none focus:border-ring"
                        />
                        <input
                          value={line.spec}
                          onChange={(e) => updateLine(line.id, { spec: e.target.value })}
                          placeholder="Specification"
                          className="mt-1 w-full rounded border border-transparent bg-transparent px-2 py-0.5 text-xs text-muted-foreground outline-none hover:border-border focus:border-ring"
                        />
                      </div>

                      {/* qty */}
                      <Field label="Qty" className="col-span-3 lg:col-span-1">
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 0 })}
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums text-foreground outline-none focus:border-ring"
                        />
                      </Field>

                      {/* unit cost */}
                      <Field label="Unit cost (USD)" className="col-span-4 lg:col-span-2">
                        <input
                          type="number"
                          value={line.unitCostUSD}
                          onChange={(e) =>
                            updateLine(line.id, { unitCostUSD: Number(e.target.value) || 0, sellingOverrideNGN: null })
                          }
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums text-foreground outline-none focus:border-ring"
                        />
                      </Field>

                      {/* landed (read-only) */}
                      <Field label="Landed/unit" className="col-span-5 lg:col-span-2">
                        <div className="rounded-md bg-muted px-2 py-1.5 text-sm tabular-nums text-foreground">
                          {cedi(c.landedPerUnit)}
                        </div>
                      </Field>

                      {/* margin */}
                      <Field label={`Margin ${line.marginPct}%`} className="col-span-7 lg:col-span-2">
                        <Slider
                          value={[line.marginPct]}
                          min={0}
                          max={45}
                          step={1}
                          onValueChange={([v]) => updateLine(line.id, { marginPct: v, sellingOverrideNGN: null })}
                          className="py-2"
                        />
                      </Field>

                      {/* selling (editable override) */}
                      <Field
                        label={c.overridden ? "Selling (override)" : "Selling/unit"}
                        className="col-span-5 lg:col-span-1"
                      >
                        <input
                          type="number"
                          value={Math.round(c.sellingPerUnit)}
                          onChange={(e) => updateLine(line.id, { sellingOverrideNGN: Number(e.target.value) || 0 })}
                          className={cn(
                            "w-full rounded-md border bg-background px-2 py-1.5 text-sm tabular-nums text-foreground outline-none focus:border-ring",
                            c.overridden ? "border-warning" : "border-input",
                          )}
                        />
                      </Field>
                    </div>

                    {/* total + actions */}
                    <div className="flex flex-col items-end gap-2 pl-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold tabular-nums text-foreground">{cedi(c.total)}</p>
                      <button
                        onClick={() => removeLine(line.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete line item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* expand toggle */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : line.id)}
                    className="flex w-full items-center gap-1.5 border-t border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    {isOpen ? "Hide details" : "Cost breakdown, alternatives & notes"}
                  </button>

                  {/* expandable */}
                  {isOpen && (
                    <div className="space-y-4 border-t border-border p-4">
                      <LandedCostBreakdown
                        currency="GH₵"
                        segments={[
                          { label: "Item cost", amount: c.itemCost },
                          { label: "Shipping", amount: c.shipping },
                          { label: "Duty + taxes", amount: c.dutyTaxes },
                          { label: "Margin", amount: c.sellingPerUnit - c.landedPerUnit },
                        ]}
                      />

                      {line.alternatives.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Alternatives considered
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {line.alternatives.map((alt) => (
                              <div
                                key={alt.id}
                                className="flex min-w-52 shrink-0 flex-col gap-1 rounded-lg border border-dashed border-border bg-background p-3"
                              >
                                <p className="text-sm font-medium text-foreground">{alt.label}</p>
                                <p className="text-xs text-muted-foreground">{alt.spec}</p>
                                <p className="text-xs tabular-nums text-muted-foreground">
                                  ${alt.unitCostUSD} / unit
                                </p>
                                <button
                                  onClick={() => swapAlternative(line.id, alt)}
                                  className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                >
                                  <ArrowRightLeft className="size-3" />
                                  Quick swap
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Delivery time
                          </p>
                          <input
                            value={line.deliveryTime}
                            onChange={(e) => updateLine(line.id, { deliveryTime: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring"
                          />
                          {line.datasheet && (
                            <button
                              type="button"
                              onClick={() => toast.info(`Datasheet "${line.datasheet}" will open in a new tab`)}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            >
                              <FileText className="size-3.5" />
                              {line.datasheet}
                            </button>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Engineer&apos;s notes
                            <span className="rounded bg-muted px-1 text-[9px] normal-case">Team only</span>
                            {line.internalNotes && <AiBadge sources={["Supplier stock feed", "FX desk", "Sourcing history"]} />}
                          </p>
                          <Textarea
                            value={line.internalNotes}
                            onChange={(e) => updateLine(line.id, { internalNotes: e.target.value })}
                            rows={2}
                            placeholder="Visible only to your team"
                            className="resize-none text-sm"
                          />
                          {line.internalNotes && (
                            <AiSources
                              className="mt-2"
                              label="Sources"
                              sources={["Supplier stock feed", "FX desk", "Sourcing history"]}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: summary & settings */}
        <aside className="bg-background p-4">
          <div className="space-y-4 lg:sticky lg:top-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="space-y-1.5 text-sm">
                <Row label="Subtotal" value={cedi(totals.subtotal)} />
                <Row label="VAT (7.5%)" value={cedi(totals.vat)} />
                <div className="my-2 h-px bg-border" />
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold tabular-nums text-foreground">{cedi(totals.total)}</span>
                </div>
              </div>
              <div className="mt-3 rounded-md bg-muted/50 p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total margin</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {totals.marginPct.toFixed(1)}% · {cedi(totals.marginValue)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">Quote settings</h3>
              <Setting label="Currency">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GHS">GHS GH₵ — Ghana Cedi</SelectItem>
                    <SelectItem value="USD">USD $ — US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </Setting>
              <Setting label="Quote validity">
                <Select value={validity} onValueChange={setValidity}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="21">21 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </Setting>
              <Setting label="Payment terms">
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50-50">50% advance, 50% on delivery</SelectItem>
                    <SelectItem value="net14">Net 14 days</SelectItem>
                    <SelectItem value="net30">Net 30 days</SelectItem>
                    <SelectItem value="prepaid">100% advance</SelectItem>
                  </SelectContent>
                </Select>
              </Setting>
              <Setting label="Delivery terms (Incoterms)">
                <Select value={incoterm} onValueChange={setIncoterm}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXW">EXW — Ex Works</SelectItem>
                    <SelectItem value="FOB">FOB — Free on Board</SelectItem>
                    <SelectItem value="CIF">CIF — Cost, Insurance, Freight</SelectItem>
                    <SelectItem value="DAP">DAP — Delivered at Place</SelectItem>
                    <SelectItem value="DDP">DDP — Delivered Duty Paid</SelectItem>
                  </SelectContent>
                </Select>
              </Setting>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes for buyer
                </p>
                <Textarea value={buyerNotes} onChange={(e) => setBuyerNotes(e.target.value)} rows={3} className="resize-none text-sm" />
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Internal notes
                  <span className="rounded bg-muted px-1 text-[9px] normal-case">Team only</span>
                </p>
                <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={2} className="resize-none text-sm" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 rounded-b-lg border border-border bg-card px-4 py-3 shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.2)]">
        <p className="hidden text-xs text-muted-foreground sm:block">
          <Check className="mr-1 inline size-3 text-success" />
          All changes saved automatically
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <FileDown className="size-4" />
            Preview as PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Draft saved")}>
            <Save className="size-4" />
            Save draft
          </Button>
          <Button size="sm" onClick={() => setPreviewOpen(true)}>
            <Send className="size-4" />
            Send to buyer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-9">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.success("Quote duplicated")}><Copy className="size-4" />Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Quote exported as PDF")}><FileDown className="size-4" />Export</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Quote archived")}><Archive className="size-4" />Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* PDF PREVIEW MODAL */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote preview</DialogTitle>
            <DialogDescription>Review the branded quote before sending it to {buyer}.</DialogDescription>
          </DialogHeader>
          <QuotePdf title={title} buyer={buyer} lines={lines} totals={totals} incoterm={incoterm} validity={validity} buyerNotes={buyerNotes} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Back to editing</Button>
            <Button onClick={() => { setPreviewOpen(false); setEmailOpen(true) }}>
              <Mail className="size-4" />
              Approve & send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMAIL COMPOSER MODAL */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send quote to buyer</DialogTitle>
            <DialogDescription>A clean message template is pre-filled. Review and send.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <EmailField label="To" value="adaeze.okafor@meridianbank.com" />
            <EmailField label="Subject" value={`Quotation QT-2026-0418 — ${title}`} />
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Message</p>
              <Textarea
                rows={7}
                defaultValue={`Dear ${buyer.split(" ")[0]} team,\n\nThank you for your enquiry. Please find attached our quotation QT-2026-0418 for ${title}.\n\nTotal: ${cedi(totals.total)} (incl. VAT) · ${incoterm} · valid ${validity} days.\n\nWe'd be glad to answer any questions.\n\nBest regards,\nSamuel Adeyemi\nWestern Premium`}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" />
              Quotation-QT-2026-0418.pdf attached
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button onClick={() => { setEmailOpen(false); toast.success("Quote sent to buyer"); }}>
              <Send className="size-4" />
              Send email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------------- small pieces ---------------- */

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <p className="mb-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  )
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function EmailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <input
        defaultValue={value}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
      />
    </div>
  )
}

function QuotePdf({
  title,
  buyer,
  lines,
  totals,
  incoterm,
  validity,
  buyerNotes,
}: {
  title: string
  buyer: string
  lines: Line[]
  totals: { subtotal: number; vat: number; total: number }
  incoterm: string
  validity: string
  buyerNotes: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-sm">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Box className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Western Premium</p>
            <p className="text-[11px] text-muted-foreground">Authorized Technology Distributor</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Quotation</p>
          <p className="font-mono text-sm font-semibold text-foreground">QT-2026-0418</p>
        </div>
      </div>

      <div className="flex justify-between py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prepared for</p>
          <p className="font-medium text-foreground">{buyer}</p>
          <p className="text-muted-foreground">Adaeze Okafor</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Date: <span className="text-foreground">2026-06-09</span></p>
          <p>Valid: <span className="text-foreground">{validity} days</span></p>
          <p>Terms: <span className="text-foreground">{incoterm}</span></p>
        </div>
      </div>

      <p className="mb-2 font-medium text-foreground">{title}</p>
      <table className="w-full text-xs">
        <thead className="border-y border-border text-muted-foreground">
          <tr>
            <th className="py-2 text-left font-medium">Item</th>
            <th className="py-2 text-center font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Unit</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((l) => {
            const c = computeLine(l)
            return (
              <tr key={l.id}>
                <td className="py-2 pr-2">
                  <p className="font-medium text-foreground">{l.description}</p>
                  <p className="text-muted-foreground">{l.spec}</p>
                </td>
                <td className="py-2 text-center tabular-nums text-foreground">{l.quantity}</td>
                <td className="py-2 text-right tabular-nums text-foreground">{cedi(c.sellingPerUnit)}</td>
                <td className="py-2 text-right font-medium tabular-nums text-foreground">{cedi(c.total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-3 ml-auto w-56 space-y-1 text-xs">
        <Row label="Subtotal" value={cedi(totals.subtotal)} />
        <Row label="VAT (7.5%)" value={cedi(totals.vat)} />
        <div className="flex items-baseline justify-between border-t border-border pt-1">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-base font-bold tabular-nums text-primary">{cedi(totals.total)}</span>
        </div>
      </div>

      {buyerNotes && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground text-pretty">{buyerNotes}</p>
      )}
    </div>
  )
}
