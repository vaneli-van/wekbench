import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type EmptyAction = {
  label: string
  onClick?: () => void
  href?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  // Back-compat convenience props
  actionLabel,
  onAction,
}: {
  icon: React.ElementType
  /** Short statement of the empty condition, e.g. "No RFQs match your filters." */
  title: string
  /** One sentence of guidance, e.g. "Try clearing filters or capture a new RFQ." */
  description?: string
  action?: EmptyAction
  secondaryAction?: EmptyAction
  className?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const primary: EmptyAction | undefined = action ?? (actionLabel ? { label: actionLabel, onClick: onAction } : undefined)

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-foreground text-pretty">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">{description}</p>}
      {(primary || secondaryAction) && (
        <div className="mt-4 flex items-center gap-3">
          {primary &&
            (primary.href ? (
              <Button size="sm" asChild>
                <a href={primary.href}>{primary.label}</a>
              </Button>
            ) : (
              <Button size="sm" onClick={primary.onClick}>
                {primary.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <a
                href={secondaryAction.href}
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {secondaryAction.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {secondaryAction.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
