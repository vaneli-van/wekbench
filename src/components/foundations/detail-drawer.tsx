import { ExternalLink } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/foundations/status-badge"

export function DetailDrawer({
  trigger,
  title,
  subtitle,
  statusLabel,
  statusVariant = "neutral",
  fullPageHref,
  overview,
  activity,
  documents,
  primaryAction = "Edit",
  secondaryAction = "Archive",
}: {
  trigger: React.ReactNode
  title: string
  subtitle?: string
  statusLabel?: string
  statusVariant?: StatusVariant
  fullPageHref?: string
  overview: React.ReactNode
  activity: React.ReactNode
  documents: React.ReactNode
  primaryAction?: string
  secondaryAction?: string
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {/* Header */}
        <div className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
                {statusLabel && <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>}
              </div>
              {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {fullPageHref && (
              <a
                href={fullPageHref}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Open full page
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>

        {/* Tabbed body */}
        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border px-5 pt-3">
            <TabsList className="h-9 bg-transparent p-0">
              <TabsTrigger value="overview" className="text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                Activity
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                Documents
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <TabsContent value="overview" className="mt-0">
              {overview}
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              {activity}
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              {documents}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" className="bg-transparent">
            {secondaryAction}
          </Button>
          <Button>{primaryAction}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
