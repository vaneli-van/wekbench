import { useEffect, useState } from "react"
import { Search, Bell, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function FoundationTopBar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Western Premium</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>RFQs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Global search */}
      <button
        onClick={() => setOpen(true)}
        className="ml-auto flex h-8 w-64 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search...</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-8">
              <Bell className="size-4" />
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-foreground" />
              <span className="sr-only">Notifications</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <HelpCircle className="size-4" />
              <span className="sr-only">Help</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help &amp; support</TooltipContent>
        </Tooltip>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search RFQs, quotes, buyers..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem>Go to Dashboard</CommandItem>
            <CommandItem>View RFQs</CommandItem>
            <CommandItem>View Orders</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem>Create new RFQ</CommandItem>
            <CommandItem>Add buyer</CommandItem>
            <CommandItem>New quote</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  )
}
