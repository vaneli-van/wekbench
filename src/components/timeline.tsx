import { Cpu, Sparkles, User, Building2, CircleCheck, CircleDot, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { type TimelineEvent } from "@/lib/data"

const typeIcon: Record<string, React.ElementType> = {
  system: Cpu,
  ai: Sparkles,
  user: User,
  buyer: Building2,
}

const typeLabel: Record<string, string> = {
  system: "System",
  ai: "wekbench AI",
  user: "Vendor",
  buyer: "Buyer",
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative">
      {events.map((event, i) => {
        const Icon = typeIcon[event.type]
        const isLast = i === events.length - 1
        return (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px",
                  event.status === "done" ? "bg-success/40" : "bg-border",
                )}
                aria-hidden
              />
            )}
            <div
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                event.status === "done" && "border-success/30 bg-success/10 text-success",
                event.status === "current" && "border-accent bg-accent/10 text-accent",
                event.status === "upcoming" && "border-border bg-card text-muted-foreground",
              )}
            >
              {event.status === "done" ? (
                <CircleCheck className="size-4" />
              ) : event.status === "current" ? (
                <CircleDot className="size-4" />
              ) : (
                <Circle className="size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    event.status === "upcoming" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {event.label}
                </p>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{event.timestamp}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{event.detail}</p>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3" />
                <span>{typeLabel[event.type]}</span>
                <span aria-hidden>·</span>
                <span>{event.actor}</span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
