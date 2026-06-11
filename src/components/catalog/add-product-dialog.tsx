import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/foundations/status-badge"
import { supplierFeeds } from "@/lib/catalog"
import {
  PencilLine,
  Upload,
  Rss,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "manual" | "csv" | "feed"

const modes: { id: Mode; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "manual", label: "Manual entry", icon: PencilLine, desc: "Add one product with full spec fields" },
  { id: "csv", label: "Upload CSV", icon: Upload, desc: "Bulk import with validation preview" },
  { id: "feed", label: "Sync supplier feed", icon: Rss, desc: "Pull from configured distributor feeds" },
]

export function AddProductDialog({
  open,
  onClose,
  initialMode = "manual",
}: {
  open: boolean
  onClose: () => void
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle>Add products to catalog</DialogTitle>
          <DialogDescription>Choose how you want to bring products in.</DialogDescription>
        </DialogHeader>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2 border-b border-border p-4">
          {modes.map((m) => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                  active ? "border-foreground bg-muted" : "border-border hover:bg-muted/50",
                )}
              >
                <m.icon className={cn("size-4", active ? "text-foreground" : "text-muted-foreground")} />
                <span className="text-sm font-medium text-foreground">{m.label}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{m.desc}</span>
              </button>
            )
          })}
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-5">
          {mode === "manual" && <ManualForm />}
          {mode === "csv" && <CsvImport />}
          {mode === "feed" && <FeedSync />}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" className="bg-transparent" onClick={onClose}>
            Cancel
          </Button>
          <Button>{mode === "feed" ? "Done" : mode === "csv" ? "Import products" : "Add product"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ManualForm() {
  const fields: { label: string; placeholder: string; full?: boolean }[] = [
    { label: "Brand", placeholder: "e.g. Dell" },
    { label: "Model number", placeholder: "e.g. Latitude 5450" },
    { label: "Category", placeholder: "e.g. Laptops" },
    { label: "Supplier", placeholder: "e.g. Redington Gulf" },
    { label: "Indicative price", placeholder: "e.g. 1180" },
    { label: "Currency", placeholder: "USD" },
    { label: "Lead time", placeholder: "e.g. 10-14 days" },
    { label: "Availability", placeholder: "In stock" },
  ]
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label className="text-xs">Description</Label>
        <Textarea placeholder="Full product description with key specs…" className="mt-1.5 min-h-20" />
      </div>
      {fields.map((f) => (
        <div key={f.label}>
          <Label className="text-xs">{f.label}</Label>
          <Input placeholder={f.placeholder} className="mt-1.5" />
        </div>
      ))}
      <div className="col-span-2">
        <Label className="text-xs">Technical specifications</Label>
        <Textarea placeholder="One spec per line, e.g. Processor: Intel Core i7…" className="mt-1.5 min-h-24" />
      </div>
    </div>
  )
}

function CsvImport() {
  const preview = [
    { row: 1, sku: "SKU-900112", model: "OptiPlex 7010", status: "ok" as const },
    { row: 2, sku: "SKU-900113", model: "ProBook 450 G10", status: "ok" as const },
    { row: 3, sku: "—", model: "Missing model number", status: "error" as const },
    { row: 4, sku: "SKU-900115", model: "ThinkCentre M70q", status: "warning" as const },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileSpreadsheet className="size-4" />
          Need the format?
        </div>
        <Button variant="outline" size="sm" className="bg-transparent">
          <Download className="size-3.5" /> Download template
        </Button>
      </div>

      <div className="flex aspect-[3/1] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
        <Upload className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-foreground">Drop your CSV here</p>
        <p className="text-xs text-muted-foreground">or click to browse</p>
      </div>

      {/* Import preview */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Import preview</p>
          <p className="text-xs text-muted-foreground">2 ready · 1 warning · 1 error</p>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Row</th>
                <th className="px-3 py-2 text-left font-medium">SKU</th>
                <th className="px-3 py-2 text-left font-medium">Model</th>
                <th className="px-3 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.map((p) => (
                <tr key={p.row}>
                  <td className="px-3 py-2 text-muted-foreground">{p.row}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{p.sku}</td>
                  <td className="px-3 py-2 text-foreground">{p.model}</td>
                  <td className="px-3 py-2 text-right">
                    {p.status === "ok" && (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="size-3.5" /> Ready
                      </span>
                    )}
                    {p.status === "warning" && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertTriangle className="size-3.5" /> Duplicate
                      </span>
                    )}
                    {p.status === "error" && (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="size-3.5" /> Missing field
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FeedSync() {
  return (
    <ul className="flex flex-col gap-2">
      {supplierFeeds.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-md",
                f.status === "healthy" && "bg-success/10 text-success",
                f.status === "stale" && "bg-muted text-muted-foreground",
                f.status === "error" && "bg-destructive/10 text-destructive",
              )}
            >
              <Rss className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.type} · {f.skuCount.toLocaleString()} SKUs · synced {f.lastSync}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {f.status === "error" && (
              <StatusBadge variant="error" dot={false}>
                Error
              </StatusBadge>
            )}
            {f.status === "stale" && (
              <StatusBadge variant="warning" dot={false}>
                Stale
              </StatusBadge>
            )}
            <Button variant="outline" size="sm" className="bg-transparent">
              <RefreshCw className="size-3.5" /> Sync now
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
