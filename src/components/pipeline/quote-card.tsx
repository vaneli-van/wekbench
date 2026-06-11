import { MoreHorizontal, ListChecks, Paperclip, MessageSquare, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type PipelineQuote, formatCedi, initials } from "@/lib/pipeline"
import { cn } from "@/lib/utils"

export function QuoteCard({
  quote,
  onOpen,
  onOpenFull,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  quote: PipelineQuote
  onOpen: () => void
  onOpenFull: () => void
  onDragStart: () => void
  onDragEnd: () => void
  dragging?: boolean
}) {
  const stale = quote.daysInStage > 7

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onDoubleClick={onOpenFull}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-foreground/20 hover:shadow-md",
        dragging && "opacity-40",
      )}
    >
      {/* Header: buyer + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
            {initials(quote.buyer)}
          </span>
          <span className="truncate text-xs font-medium text-foreground">{quote.buyer}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
              aria-label="Quote actions"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onOpenFull}>Open full quote</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem>Reassign</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Mark as lost</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quote number + title */}
      <p className="mt-2 text-[11px] font-medium text-muted-foreground">{quote.id}</p>
      <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">{quote.title}</p>

      {/* Value */}
      <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">{formatCedi(quote.value)}</p>

      {/* Footer: icons + days in stage */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1 text-[11px]" title={`${quote.lineItems} line items`}>
            <ListChecks className="size-3.5" />
            {quote.lineItems}
          </span>
          <span className="flex items-center gap-1 text-[11px]" title={`${quote.attachments} attachments`}>
            <Paperclip className="size-3.5" />
            {quote.attachments}
          </span>
          <span className="flex items-center gap-1 text-[11px]" title={`${quote.comments} comments`}>
            <MessageSquare className="size-3.5" />
            {quote.comments}
          </span>
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
            stale ? "bg-destructive/10 text-destructive" : "text-muted-foreground",
          )}
          title={`${quote.daysInStage} days in this stage`}
        >
          <Clock className="size-3" />
          {quote.daysInStage}d
        </span>
      </div>
    </div>
  )
}
