import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export type Source = {
  label: string
  href?: string
}

export function SourceChips({
  sources,
  className,
}: {
  sources: Source[]
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Sources
      </span>
      {sources.map((s) => (
        <a
          key={s.label}
          href={s.href ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground transition-colors hover:border-foreground/30 hover:bg-muted"
        >
          {s.label}
          <ExternalLink className="size-3 text-muted-foreground" />
        </a>
      ))}
    </div>
  )
}
