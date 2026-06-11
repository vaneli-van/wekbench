import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  Plus,
  Trash2,
  Check,
  X,
  Upload,
  FileText,
  Eye,
  Save,
  Send,
  MoreVertical,
  Copy,
  Download,
  Archive,
  CreditCard,
  Bell,
  CircleAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  sellerProfile,
  currencies,
  requiredDocTemplate,
  computeTotals,
  formatMoney,
  addDays,
  statusLabelForInvoice,
  type InvoiceLine,
  type RequiredDoc,
  type InvoicePrefill,
} from "@/lib/invoice"

export function InvoiceGenerator({ prefill }: { prefill: InvoicePrefill }) {
  const [invoiceNumber, setInvoiceNumber] = useState(prefill.invoiceNumber)
  const [issueDate, setIssueDate] = useState(prefill.issueDate)
  const [dueDate, setDueDate] = useState(prefill.dueDate)
  const [termsDays, setTermsDays] = useState(prefill.paymentTermsDays)
  const [reference, setReference] = useState(prefill.reference)
  const [currencyKey, setCurrencyKey] = useState(prefill.currencyKey)
  const [buyer, setBuyer] = useState(prefill.buyer)
  const [lines, setLines] = useState<InvoiceLine[]>(prefill.lines)
  const [notes, setNotes] = useState(
    "Thank you for your business. Please reference the invoice number on all payments.",
  )
  const [docs, setDocs] = useState<RequiredDoc[]>(
    requiredDocTemplate.map((d) => ({
      ...d,
      // seed: most required docs already attached except Proof of Delivery
      attached: d.id !== "pod",
      fileName: d.id !== "pod" ? `${d.name.replace(/\s+/g, "-")}.pdf` : undefined,
    })),
  )
  const [openBasics, setOpenBasics] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [savedAt, setSavedAt] = useState("just now")

  const totals = useMemo(() => computeTotals(lines), [lines])
  const currency = currencies[currencyKey] ?? currencies.GHS

  const requiredDocs = docs.filter((d) => d.required)
  const attachedRequired = requiredDocs.filter((d) => d.attached).length
  const allRequiredAttached = attachedRequired === requiredDocs.length

  const isSent = prefill.status !== "draft"
  const isOverdue = prefill.status === "amended"
  const amountPaid = prefill.amountPaid ?? 0
  const outstanding = Math.max(totals.total - amountPaid, 0)

  function updateLine(id: string, patch: Partial<InvoiceLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    setSavedAt("just now")
  }
  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: `L-${Date.now()}`, description: "", qty: 1, unitPrice: 0 },
    ])
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }
  function toggleDoc(id: string) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              attached: !d.attached,
              fileName: !d.attached ? `${d.name.replace(/\s+/g, "-")}.pdf` : undefined,
            }
          : d,
      ),
    )
  }
  function attachAllMissing() {
    setDocs((prev) =>
      prev.map((d) =>
        d.attached ? d : { ...d, attached: true, fileName: `${d.name.replace(/\s+/g, "-")}.pdf` },
      ),
    )
  }
  function setTerms(days: number) {
    setTermsDays(days)
    setDueDate(addDays(issueDate, days))
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-6">
      {/* ---------- Header ---------- */}
      <div className="mb-5">
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/invoices" className="hover:text-foreground">
            Invoices
          </Link>
          <span>/</span>
          <span className="text-foreground">{invoiceNumber}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Invoice {invoiceNumber}
              </h1>
              <StatusBadge status={prefill.status} label={statusLabelForInvoice[prefill.status]} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {buyer.name} · linked to order{" "}
              <Link to={`/orders/${prefill.order.id}`} className="text-info hover:underline">
                {prefill.order.id}
              </Link>
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-success" />
            Saved {savedAt}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* ---------- LEFT: form (60%) ---------- */}
        <div className="space-y-4 lg:col-span-3 lg:pb-24">
          {/* Section 1: Basics */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setOpenBasics((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-foreground">Invoice basics</span>
              <ChevronDown
                className={cn("size-4 text-muted-foreground transition-transform", openBasics && "rotate-180")}
              />
            </button>
            {openBasics && (
              <div className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2">
                <Field label="Invoice number">
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </Field>
                <Field label="Reference (PO)">
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                </Field>
                <Field label="Issue date">
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => {
                      setIssueDate(e.target.value)
                      setDueDate(addDays(e.target.value, termsDays))
                    }}
                  />
                </Field>
                <Field label={`Due date (Net ${termsDays})`}>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
                <Field label="Payment terms">
                  <Select value={String(termsDays)} onValueChange={(v) => setTerms(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Due on receipt</SelectItem>
                      <SelectItem value="14">Net 14</SelectItem>
                      <SelectItem value="30">Net 30</SelectItem>
                      <SelectItem value="60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Currency">
                  <Select value={currencyKey} onValueChange={setCurrencyKey}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(currencies).map(([key, c]) => (
                        <SelectItem key={key} value={key}>
                          {c.code} · {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </Card>

          {/* Section 2: Buyer & seller */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Buyer &amp; seller</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Bill to (buyer)
                </p>
                <div className="space-y-2">
                  <Input
                    value={buyer.name}
                    onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                    className="font-medium"
                  />
                  <Textarea
                    value={buyer.address}
                    onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                  <Input
                    value={buyer.taxId}
                    onChange={(e) => setBuyer({ ...buyer, taxId: e.target.value })}
                    className="text-sm"
                  />
                  <Input
                    value={buyer.contact}
                    onChange={(e) => setBuyer({ ...buyer, contact: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  From (seller)
                </p>
                <p className="text-sm font-medium text-foreground">{sellerProfile.name}</p>
                {sellerProfile.addressLines.map((l) => (
                  <p key={l} className="text-sm text-muted-foreground">
                    {l}
                  </p>
                ))}
                <p className="mt-1 text-sm text-muted-foreground">{sellerProfile.taxId}</p>
                <p className="text-sm text-muted-foreground">{sellerProfile.email}</p>
              </div>
            </div>
          </Card>

          {/* Section 3: Line items */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Line items</h2>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="size-4" />
                Add line
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit price</th>
                    <th className="pb-2 text-right font-medium">Line total</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-2">
                        <Input
                          value={l.description}
                          onChange={(e) => updateLine(l.id, { description: e.target.value })}
                          placeholder="Item description"
                          className="h-9 border-transparent bg-transparent hover:border-border focus:border-input"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          value={l.qty}
                          onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })}
                          className="h-9 w-16 text-right"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          value={l.unitPrice}
                          onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) })}
                          className="h-9 w-32 text-right tabular-nums"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right font-medium tabular-nums">
                        {formatMoney(l.qty * l.unitPrice, currencyKey)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => removeLine(l.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove line"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Section 4: Totals */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Totals</h2>
            <div className="ml-auto max-w-sm space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal, currencyKey)} />
              {totals.levies.map((lv) => (
                <Row
                  key={lv.id}
                  muted
                  label={`${lv.label} (${(lv.rate * 100).toFixed(1)}%)`}
                  value={formatMoney(lv.amount, currencyKey)}
                />
              ))}
              <Row
                muted
                label={`${totals.vat.label} (${(totals.vat.rate * 100).toFixed(0)}%)`}
                value={formatMoney(totals.vat.amount, currencyKey)}
              />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total due</span>
                <span className="tabular-nums">{formatMoney(totals.total, currencyKey)}</span>
              </div>
            </div>
          </Card>

          {/* Section 5: Attachments / document pack */}
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Document pack</h2>
              <CompletenessIndicator attached={attachedRequired} total={requiredDocs.length} />
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                attachAllMissing()
              }}
              className={cn(
                "mb-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 text-center transition-colors",
                dragOver ? "border-info bg-info/5" : "border-border",
              )}
            >
              <Upload className="mb-1.5 size-5 text-muted-foreground" />
              <p className="text-sm text-foreground">Drag &amp; drop files here</p>
              <p className="text-xs text-muted-foreground">or click to browse · PDF, JPG, PNG up to 10MB</p>
            </div>

            <ul className="divide-y divide-border">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <Checkbox checked={d.attached} onCheckedChange={() => toggleDoc(d.id)} />
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {d.name}
                      {!d.required && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>
                      )}
                    </p>
                    {d.fileName && <p className="truncate text-xs text-muted-foreground">{d.fileName}</p>}
                  </div>
                  {d.attached ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <Check className="size-3.5" /> Attached
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium",
                        d.required ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      <X className="size-3.5" /> Missing
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {/* Section 6: Notes & bank */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Notes &amp; payment details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Notes to buyer">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </Field>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Bank details
                </p>
                <dl className="space-y-1 text-muted-foreground">
                  <BankRow label="Bank" value={sellerProfile.bank.bankName} />
                  <BankRow label="Account name" value={sellerProfile.bank.accountName} />
                  <BankRow label="Account no." value={sellerProfile.bank.accountNumber} />
                  <BankRow label="Branch" value={sellerProfile.bank.branch} />
                  <BankRow label="SWIFT" value={sellerProfile.bank.swift} />
                </dl>
              </div>
            </div>
          </Card>

          {/* Payment status panel — only on sent invoices */}
          {isSent && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Payment status</h2>
                <StatusBadge status={prefill.status} label={statusLabelForInvoice[prefill.status]} />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Amount paid</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-success">
                    {formatMoney(amountPaid, currencyKey)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      outstanding > 0 ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(outstanding, currencyKey)}
                  </p>
                </div>
              </div>

              {prefill.payments && prefill.payments.length > 0 && (
                <div className="mb-4">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Payment history
                  </p>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {prefill.payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{p.method}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.date} · {p.ref}
                          </p>
                        </div>
                        <span className="font-medium tabular-nums text-foreground">
                          {formatMoney(p.amount, currencyKey)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={outstanding === 0}>
                  <CreditCard className="size-4" />
                  Record payment
                </Button>
                {isOverdue && (
                  <Button size="sm" variant="outline">
                    <Bell className="size-4" />
                    Send reminder
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ---------- RIGHT: live PDF preview (40%) ---------- */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Live preview
            </p>
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
              <InvoiceDocument
                invoiceNumber={invoiceNumber}
                issueDate={issueDate}
                dueDate={dueDate}
                reference={reference}
                buyer={buyer}
                lines={lines}
                notes={notes}
                currencyKey={currencyKey}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Sticky action bar ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:left-[var(--sidebar-width,0)]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 text-sm">
            {allRequiredAttached ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <Check className="size-4" /> Document pack complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-warning">
                <CircleAlert className="size-4" />
                {requiredDocs.length - attachedRequired} required doc
                {requiredDocs.length - attachedRequired > 1 ? "s" : ""} missing
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              Preview full PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSavedAt("just now")}>
              <Save className="size-4" />
              Save draft
            </Button>
            <Button size="sm" disabled={!allRequiredAttached} title={allRequiredAttached ? undefined : "Attach all required documents first"}>
              <Send className="size-4" />
              Send to buyer
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Copy className="size-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="size-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="size-4" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ---------- Full PDF preview modal ---------- */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
          </DialogHeader>
          <InvoiceDocument
            large
            invoiceNumber={invoiceNumber}
            issueDate={issueDate}
            dueDate={dueDate}
            reference={reference}
            buyer={buyer}
            lines={lines}
            notes={notes}
            currencyKey={currencyKey}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ----------------------------- Sub-components ----------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted ? "text-muted-foreground" : "text-foreground")}>{label}</span>
      <span className={cn("tabular-nums", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
    </div>
  )
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

function CompletenessIndicator({ attached, total }: { attached: number; total: number }) {
  const complete = attached === total
  const pct = Math.round((attached / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", complete ? "bg-success" : "bg-warning")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          complete ? "text-success" : "text-warning",
        )}
      >
        {attached} of {total}
      </span>
    </div>
  )
}

/* The branded invoice document, shared by the live preview + full modal. */
function InvoiceDocument({
  invoiceNumber,
  issueDate,
  dueDate,
  reference,
  buyer,
  lines,
  notes,
  currencyKey,
  large,
}: {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  reference: string
  buyer: InvoicePrefill["buyer"]
  lines: InvoiceLine[]
  notes: string
  currencyKey: string
  large?: boolean
}) {
  const totals = computeTotals(lines)
  return (
    <div className={cn("rounded-md bg-card text-card-foreground shadow-sm", large ? "p-8 text-sm" : "p-5 text-xs")}>
      {/* brand header */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className={large ? "size-5" : "size-4"} />
          </div>
          <div>
            <p className={cn("font-semibold text-foreground", large ? "text-base" : "text-sm")}>
              {sellerProfile.name}
            </p>
            <p className="text-muted-foreground">{sellerProfile.addressLines[0]}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("font-bold uppercase tracking-wide text-foreground", large ? "text-xl" : "text-base")}>
            Invoice
          </p>
          <p className="text-muted-foreground">{invoiceNumber}</p>
        </div>
      </div>

      {/* meta */}
      <div className="grid grid-cols-2 gap-4 py-4">
        <div>
          <p className="mb-1 font-medium uppercase text-muted-foreground">Bill to</p>
          <p className="font-medium text-foreground">{buyer.name}</p>
          <p className="whitespace-pre-line text-muted-foreground">{buyer.address}</p>
          <p className="text-muted-foreground">{buyer.taxId}</p>
        </div>
        <div className="text-right">
          <MetaLine label="Issue date" value={issueDate} />
          <MetaLine label="Due date" value={dueDate} />
          <MetaLine label="PO reference" value={reference} />
        </div>
      </div>

      {/* table */}
      <table className="w-full">
        <thead>
          <tr className="border-y border-border text-left text-muted-foreground">
            <th className="py-1.5 font-medium">Description</th>
            <th className="py-1.5 text-right font-medium">Qty</th>
            <th className="py-1.5 text-right font-medium">Unit</th>
            <th className="py-1.5 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-border/60">
              <td className="py-1.5 pr-2 text-foreground">{l.description || "—"}</td>
              <td className="py-1.5 text-right tabular-nums text-foreground">{l.qty}</td>
              <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                {formatMoney(l.unitPrice, currencyKey)}
              </td>
              <td className="py-1.5 text-right tabular-nums text-foreground">
                {formatMoney(l.qty * l.unitPrice, currencyKey)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* totals */}
      <div className="ml-auto mt-3 max-w-[55%] space-y-1">
        <MetaLine label="Subtotal" value={formatMoney(totals.subtotal, currencyKey)} />
        {totals.levies.map((lv) => (
          <MetaLine key={lv.id} label={`${lv.label} (${(lv.rate * 100).toFixed(1)}%)`} value={formatMoney(lv.amount, currencyKey)} />
        ))}
        <MetaLine label={`VAT (${(totals.vat.rate * 100).toFixed(0)}%)`} value={formatMoney(totals.vat.amount, currencyKey)} />
        <div className="flex justify-between border-t border-border pt-1 font-semibold text-foreground">
          <span>Total due</span>
          <span className="tabular-nums">{formatMoney(totals.total, currencyKey)}</span>
        </div>
      </div>

      {/* footer */}
      <div className="mt-4 border-t border-border pt-3 text-muted-foreground">
        <p className="font-medium text-foreground">Notes</p>
        <p className="mb-2">{notes}</p>
        <p>
          {sellerProfile.bank.bankName} · {sellerProfile.bank.accountName} · {sellerProfile.bank.accountNumber}
        </p>
      </div>
    </div>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  )
}
