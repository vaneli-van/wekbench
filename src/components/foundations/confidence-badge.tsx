import { Check, HelpCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type ConfidenceLevel = "high" | "medium" | "low"

const config: Record<
  ConfidenceLevel,
  { label: string; icon: React.ElementType; className: string }
> = {
  high: {
    label: "High",
    icon: Check,
    className: "border-transparent bg-foreground text-background",
  },
  medium: {
    label: "Medium",
    icon: HelpCircle,
    className: "border-foreground/40 bg-background text-foreground",
  },
  low: {
    label: "Low",
    icon: AlertTriangle,
    className: "border-dashed border-foreground/50 bg-background text-muted-foreground",
  },
}

export function ConfidenceBadge({
  level,
  score,
  sources = [],
  className,
}: {
  level: ConfidenceLevel
  score: number
  sources?: string[]
  className?: string
}) {
  const conf = config[level]
  const Icon = conf.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex cursor-default items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            conf.className,
            className,
          )}
        >
          <Icon className="size-3" />
          {conf.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-56">
        <p className="font-medium">
          Confidence {score.toFixed(2)}
          <span className="text-muted-foreground"> / 1.00</span>
        </p>
        {sources.length > 0 && (
          <div className="mt-1.5 border-t border-border pt-1.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            <ul className="space-y-0.5">
              {sources.map((s) => (
                <li key={s} className="text-xs text-muted-foreground">
                  • {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
