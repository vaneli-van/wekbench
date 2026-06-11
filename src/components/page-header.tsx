import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: {
  title: string
  description?: string
  breadcrumb?: { label: string; href?: string }[]
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
