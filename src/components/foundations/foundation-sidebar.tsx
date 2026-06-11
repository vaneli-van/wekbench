import { useState } from "react"
import {
  LayoutDashboard,
  FileText,
  ReceiptText,
  Package,
  ShoppingCart,
  BookOpen,
  Building2,
  Factory,
  BarChart3,
  Settings,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const primaryNav = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "RFQs", icon: FileText, badge: 8 },
  { name: "Quotes", icon: ReceiptText },
  { name: "Orders", icon: ShoppingCart, badge: 3 },
  { name: "Invoices", icon: ReceiptText },
  { name: "Catalog", icon: BookOpen },
  { name: "Buyers", icon: Building2 },
  { name: "Suppliers", icon: Factory },
]

const secondaryNav = [
  { name: "Reports", icon: BarChart3 },
  { name: "Settings", icon: Settings },
]

const workspaces = ["Western Premium", "Acme Procurement", "Sandbox Co."]

export function FoundationSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [active, setActive] = useState("Dashboard")
  const [workspace, setWorkspace] = useState(workspaces[0])

  const NavItem = ({
    item,
  }: {
    item: { name: string; icon: React.ElementType; badge?: number }
  }) => {
    const Icon = item.icon
    const isActive = active === item.name
    const button = (
      <button
        onClick={() => setActive(item.name)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-secondary font-medium text-secondary-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="flex-1 text-left">{item.name}</span>}
        {!collapsed && item.badge ? (
          <span className="rounded bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {item.badge}
          </span>
        ) : null}
      </button>
    )
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{item.name}</TooltipContent>
        </Tooltip>
      )
    }
    return button
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Workspace switcher */}
      <div className="border-b border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-secondary/60",
                collapsed && "justify-center",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
                WP
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{workspace}</span>
                    <span className="block text-[11px] text-muted-foreground">Workspace</span>
                  </span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-xs">Switch workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((w) => (
              <DropdownMenuItem key={w} onSelect={() => setWorkspace(w)}>
                <span className="flex-1">{w}</span>
                {w === workspace && <Check className="size-3.5" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {primaryNav.map((item) => (
            <li key={item.name}>
              <NavItem item={item} />
            </li>
          ))}
        </ul>
        <div className="my-3 border-t border-border" />
        <ul className="flex flex-col gap-0.5">
          {secondaryNav.map((item) => (
            <li key={item.name}>
              <NavItem item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* User + collapse toggle */}
      <div className="border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md p-1.5 hover:bg-secondary/60",
                collapsed && "justify-center",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                SA
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium text-foreground">Samuel Adeyemi</span>
                  <span className="block text-[11px] text-muted-foreground">Vendor Sales Lead</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  )
}
