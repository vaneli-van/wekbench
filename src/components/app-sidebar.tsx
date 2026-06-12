import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Inbox,
  AtSign,
  FileText,
  Search,
  Package,
  Library,
  ReceiptText,
  FolderArchive,
  Building2,
  Factory,
  BarChart3,
  Plug,
  Settings,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { useProfile } from "@/hooks/use-profile";

const navGroups: {
  label: string;
  items: { name: string; href: string; icon: React.ElementType; badge?: number }[];
}[] = [
  {
    label: "Workflow",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "My Wekbench", href: "/inbox", icon: Inbox, badge: 3 },
      { name: "AI Extractions", href: "/extractions", icon: Sparkles },
      { name: "Quotes", href: "/quotes", icon: FileText, badge: 1 },
      { name: "Product Search", href: "/product-search", icon: Search },
      { name: "Catalog", href: "/catalog", icon: Library },
      { name: "Catalog Items", href: "/catalog-items", icon: Package },
      { name: "Orders", href: "/orders", icon: Package, badge: 2 },
      { name: "Invoices", href: "/invoices", icon: ReceiptText },
      { name: "Documents", href: "/documents", icon: FolderArchive },
    ],
  },
  {
    label: "Directory",
    items: [
      { name: "Buyers", href: "/buyers", icon: Building2 },
      { name: "Suppliers / OEMs", href: "/suppliers", icon: Factory },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Email Capture", href: "/email-capture", icon: AtSign },
      { name: "Integrations", href: "/integrations", icon: Plug },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
        <Wordmark size="md" />
      </div>

      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-sidebar-foreground/50" />
          <input
            type="search"
            placeholder="Search RFQs, buyers, parts..."
            className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 py-1.5 pl-8 pr-2 text-sm text-sidebar-accent-foreground outline-none placeholder:text-sidebar-foreground/50 focus:ring-2 focus:ring-sidebar-ring/30"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          active ? "text-sidebar-primary" : "text-sidebar-foreground/70",
                        )}
                      />
                      <span className="flex-1">{item.name}</span>
                      {item.badge ? (
                        <span
                          className={cn(
                            "flex items-center justify-center min-w-5 h-5 px-1.5 rounded text-[10px] font-semibold tabular-nums",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "bg-sidebar-accent text-sidebar-foreground",
                          )}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-semibold">
            {profile?.initials ?? "—"}
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
              {profile?.fullName ?? "\u00A0"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/70 truncate">
              {profile?.role ?? (profile?.accountType === "buyer" ? "Buyer" : "Vendor")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
