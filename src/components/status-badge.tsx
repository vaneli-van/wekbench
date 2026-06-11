import { cn } from "@/lib/utils"
import { statusLabels, statusTone } from "@/lib/data"

// The five standardised status variants used across every screen.
export type StatusVariant = "neutral" | "info" | "success" | "warning" | "error"

// Filled treatment. Each variant pairs a solid background with its design-token
// foreground, which already resolves to white or dark text based on lightness.
const variantClasses: Record<StatusVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info text-info-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
}

export function StatusBadge({
  status,
  label,
  variant,
  children,
  dot = true,
  className,
}: {
  /** Domain status key (RFQ, quote, order, invoice, supplier order, document). Looked up in statusTone/statusLabels. */
  status?: string
  /** Override the displayed text when using `status`. */
  label?: string
  /** Explicit variant when not driving the badge from a domain status. */
  variant?: StatusVariant
  /** Explicit content when not driving the badge from a domain status. */
  children?: React.ReactNode
  dot?: boolean
  className?: string
}) {
  const resolvedVariant: StatusVariant = variant ?? (status ? (statusTone[status] ?? "neutral") : "neutral")
  const content = children ?? label ?? (status ? (statusLabels[status] ?? status) : null)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[resolvedVariant],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden /> : null}
      {content}
    </span>
  )
}
