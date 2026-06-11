import { useState } from "react"
import {
  FileText,
  Package,
  Truck,
  Ship,
  MapPin,
  CircleCheck,
  StickyNote,
  ReceiptText,
  Copy,
  Check,
  Download,
} from "lucide-react"

import type { TimelineEvent, TimelineEventType } from "@/lib/order-detail"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/foundations/empty-state"

const eventMeta: Record<TimelineEventType, { icon: React.ElementType; tone: string }> = {
  po: { icon: FileText, tone: "text-accent bg-accent/10 border-accent/20" },
  supplier: { icon: Package, tone: "text-info bg-info/10 border-info/20" },
  shipment: { icon: Truck, tone: "text-info bg-info/10 border-info/20" },
  customs: { icon: Ship, tone: "text-warning bg-warning/10 border-warning/20" },
  delivery: { icon: MapPin, tone: "text-warning bg-warning/10 border-warning/20" },
  delivered: { icon: CircleCheck, tone: "text-success bg-success/10 border-success/20" },
  note: { icon: StickyNote, tone: "text-muted-foreground bg-muted border-border" },
  invoice: { icon: ReceiptText, tone: "text-info bg-info/10 border-info/20" },
}

function CopyTracking({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground hover:bg-muted"
    >
      {value}
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3 text-muted-foreground" />}
      <span className="sr-only">Copy tracking number</span>
    </button>
  )
}

export function TrackingTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="No tracking events yet."
        description="Updates will appear here once supplier orders are placed."
      />
    )
  }

  return (
    <ol className="space-y-0">
      {events.map((ev, i) => {
        const meta = eventMeta[ev.type]
        const Icon = meta.icon
        const isLast = i === events.length - 1
        return (
          <li key={ev.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span className="absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px bg-border" aria-hidden />
            )}
            <div
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                meta.tone,
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground text-pretty">{ev.action}</p>
                <time className="shrink-0 text-xs text-muted-foreground">{ev.timestamp}</time>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ev.actor}
                {ev.detail ? ` · ${ev.detail}` : ""}
              </p>
              {(ev.tracking || ev.document) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {ev.tracking && <CopyTracking value={ev.tracking} />}
                  {ev.document && (
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted">
                      <FileText className="size-3 text-muted-foreground" />
                      {ev.document.name}
                      <Download className="size-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
