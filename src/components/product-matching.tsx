import { useState } from "react"
import { FileText, CheckCircle2, Circle, Sparkles, ExternalLink } from "lucide-react"
import { productMatches, rfqs } from "@/lib/data"
import { cn } from "@/lib/utils"
import { AiBadge, AiConfidence, AiSources, type AiConfidenceLevel } from "@/components/foundations/ai-content"

const confidenceLevel = (c: number): AiConfidenceLevel => (c >= 95 ? "high" : c >= 90 ? "medium" : "low")

export function ProductMatching() {
  const [selectedId, setSelectedId] = useState<string>("PM-1")
  const requested = rfqs[0].lineItems[0]

  return (
    <div className="space-y-5">
      {/* Requested item */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Sparkles className="size-3.5 text-accent" />
          Requested Item
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-base font-semibold text-foreground">
            {requested.brand} {requested.description}
          </p>
          <p className="text-sm text-muted-foreground">{requested.spec}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Quantity: <span className="font-medium text-foreground">{requested.quantity} units</span> · Target:{" "}
          <span className="font-medium text-foreground">{requested.targetPrice}</span>
        </p>
      </div>

      {/* Match cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {productMatches.map((m) => {
          const selected = selectedId === m.id
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col rounded-xl border bg-card transition-colors",
                selected ? "border-primary ring-1 ring-primary/30" : "border-border",
              )}
            >
              <div className="border-b border-border p-4">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                      m.matchType === "exact"
                        ? "bg-success/10 text-success"
                        : "bg-info/10 text-info",
                    )}
                  >
                    {m.matchType === "exact" ? "Exact Match" : "Equivalent"}
                  </span>
                  {m.recommended && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                      <Sparkles className="size-3" />
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{m.brand}</p>
                <p className="text-sm text-muted-foreground">{m.model}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <AiBadge sources={[`Requested item spec`, `${m.oem} catalogue`]} />
                  <AiConfidence level={confidenceLevel(m.confidence)} score={m.confidence / 100} />
                </div>
              </div>

              <div className="flex-1 space-y-3 p-4 text-sm">
                <p className="text-muted-foreground text-pretty">{m.spec}</p>
                <dl className="space-y-1.5">
                  <Row label="Supplier" value={m.supplier} />
                  <Row label="OEM" value={m.oem} />
                  <Row label="Lead time" value={m.leadTime} />
                  <Row label="Indicative price" value={m.indicativePrice} strong />
                </dl>
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <FileText className="size-3.5" />
                  {m.datasheet}
                  <ExternalLink className="size-3" />
                </a>
                <AiSources
                  className="border-t border-border pt-3"
                  sources={[`${m.oem} catalogue`, m.datasheet, `Requested: ${requested.brand} ${requested.description}`]}
                />
              </div>

              <div className="border-t border-border p-3">
                <button
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {selected ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                  {selected ? "Selected for Quote" : "Select for Quote"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-right text-xs", strong ? "font-semibold text-foreground" : "text-foreground")}>
        {value}
      </dd>
    </div>
  )
}
