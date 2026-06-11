import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type CostSegment = {
  label: string
  amount: number
}

// Neutral grayscale fills, differentiated by tint from dark to light.
const fills = ["bg-foreground", "bg-foreground/70", "bg-foreground/45", "bg-foreground/25"]
const legendDots = ["bg-foreground", "bg-foreground/70", "bg-foreground/45", "bg-foreground/25"]

export function LandedCostBreakdown({
  segments,
  currency = "$",
  className,
}: {
  segments: CostSegment[]
  currency?: string
  className?: string
}) {
  const total = segments.reduce((sum, s) => sum + s.amount, 0)
  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString()}`

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Landed cost
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(total)}</span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
        {segments.map((seg, i) => {
          const pct = (seg.amount / total) * 100
          return (
            <Tooltip key={seg.label}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${seg.label}: ${fmt(seg.amount)} (${pct.toFixed(1)}%)`}
                  className={cn(
                    "h-full border-r border-background/40 transition-opacity last:border-r-0 hover:opacity-80",
                    fills[i % fills.length],
                  )}
                  style={{ width: `${pct}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{seg.label}</p>
                <p className="text-muted-foreground tabular-nums">
                  {fmt(seg.amount)} · {pct.toFixed(1)}%
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((seg, i) => {
          const pct = (seg.amount / total) * 100
          return (
            <li key={seg.label} className="flex items-center gap-1.5 text-xs">
              <span className={cn("size-2 rounded-sm", legendDots[i % legendDots.length])} aria-hidden />
              <span className="text-muted-foreground">{seg.label}</span>
              <span className="font-medium tabular-nums text-foreground">{pct.toFixed(0)}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
