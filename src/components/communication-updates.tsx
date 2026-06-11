import { useState } from "react"
import {
  Mail,
  Sparkles,
  ArrowRight,
  RefreshCcw,
  Calculator,
  PackageSearch,
  FilePlus2,
  MessageCircleQuestion,
  X,
  Check,
  Clock,
} from "lucide-react"
import { commUpdates } from "@/lib/data"
import { cn } from "@/lib/utils"

const actionIcons: Record<string, React.ElementType> = {
  "Update RFQ line item": RefreshCcw,
  "Recalculate pricing": Calculator,
  "Check product availability": PackageSearch,
  "Create revised quote": FilePlus2,
  "Ask buyer for clarification": MessageCircleQuestion,
  "Ignore update": X,
}

export function CommunicationUpdates() {
  const update = commUpdates[0]
  const [accepted, setAccepted] = useState<string[]>([])

  const toggle = (action: string) => {
    setAccepted((prev) => (prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]))
  }

  return (
    <div className="space-y-5">
      {/* Inbound email */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Mail className="size-4 text-warning" />
            Buyer Update Received
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {update.receivedAt}
          </span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{update.from}</p>
              <p className="text-xs text-muted-foreground">{update.fromCompany}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">{update.subject}</p>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{update.body}</p>
        </div>
      </div>

      {/* Detected changes */}
      <div className="rounded-xl border border-warning/30 bg-warning/5">
        <div className="flex items-center gap-2 border-b border-warning/20 px-5 py-3">
          <Sparkles className="size-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">wekbench Detected Changes</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {update.detectedChanges.map((c) => (
            <div key={c.field} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.field}</p>
              <div className="mt-1.5 flex items-center gap-2 text-sm">
                <span className="rounded bg-destructive/10 px-2 py-0.5 font-medium text-destructive line-through">
                  {c.from}
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="rounded bg-success/10 px-2 py-0.5 font-medium text-success">{c.to}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested actions */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Suggested Actions</h3>
          </div>
          <span className="text-xs text-muted-foreground">You approve before anything changes</span>
        </div>
        <ul className="divide-y divide-border">
          {update.suggestedActions.map((action) => {
            const Icon = actionIcons[action] ?? RefreshCcw
            const isAccepted = accepted.includes(action)
            const isIgnore = action === "Ignore update"
            return (
              <li key={action} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      isIgnore ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action}</span>
                </div>
                <button
                  onClick={() => toggle(action)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isAccepted
                      ? "bg-success text-success-foreground"
                      : isIgnore
                        ? "border border-border text-muted-foreground hover:bg-muted"
                        : "bg-primary text-primary-foreground hover:opacity-90",
                  )}
                >
                  {isAccepted ? (
                    <>
                      <Check className="size-4" />
                      Accepted
                    </>
                  ) : (
                    "Approve"
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
