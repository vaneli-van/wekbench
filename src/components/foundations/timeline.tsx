import { Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"

export type TimelineItem = {
  id: string
  timestamp: string
  actor: string
  action: string
  document?: { name: string; href?: string }
  state?: "done" | "current" | "upcoming"
}

export function Timeline({
  items,
  className,
}: {
  items: TimelineItem[]
  className?: string
}) {
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const state = item.state ?? "done"
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span className="absolute left-[5px] top-3 h-[calc(100%-0.5rem)] w-px bg-border" aria-hidden />
            )}
            <span
              className={cn(
                "relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-background",
                state === "done" && "bg-foreground",
                state === "current" && "bg-foreground ring-muted",
                state === "upcoming" && "border border-border bg-background",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm text-foreground text-pretty">
                  <span className="font-medium">{item.actor}</span> {item.action}
                </p>
                <time className="font-mono text-xs text-muted-foreground tabular-nums">{item.timestamp}</time>
              </div>
              {item.document && (
                <a
                  href={item.document.href ?? "#"}
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-secondary-foreground transition-colors hover:bg-muted"
                >
                  <Paperclip className="size-3 text-muted-foreground" />
                  {item.document.name}
                </a>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
