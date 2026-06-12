import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Menu,
  LayoutDashboard,
  Inbox,
  AtSign,
  FileText,
  Package,
  ReceiptText,
  FolderArchive,
  Building2,
  Factory,
  BarChart3,
  Plug,
  Settings,
  LogOut,
  User as UserIcon,
  Search as SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const mobileNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "In Toolbox", href: "/inbox", icon: Inbox },
  { name: "Email Capture", href: "/email-capture", icon: AtSign },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Product Search", href: "/product-search", icon: SearchIcon },
  { name: "Orders", href: "/orders", icon: Package },
  { name: "Invoices", href: "/invoices", icon: ReceiptText },
  { name: "Documents", href: "/documents", icon: FolderArchive },
  { name: "Buyers", href: "/buyers", icon: Building2 },
  { name: "Suppliers / OEMs", href: "/suppliers", icon: Factory },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "Settings", href: "/settings", icon: Settings },
];

const titleMap: Record<string, string> = {
  "/dashboard": "Command Center",
  "/inbox": "In Toolbox",
  "/email-capture": "Email Capture",
  "/quotes": "Quotes",
  "/product-search": "Product Search",
  "/orders": "Orders",
  "/invoices": "Invoices",
  "/documents": "Documents",
  "/buyers": "Buyers",
  "/suppliers": "Suppliers / OEMs",
  "/reports": "Reports",
  "/integrations": "Integrations",
  "/settings": "Settings",
};

function IconButton({
  children,
  label,
  badge,
}: {
  children: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
          {badge}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function Topbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const title =
    titleMap[pathname] ??
    (pathname.startsWith("/rfq")
      ? "RFQ Detail"
      : pathname.startsWith("/orders/")
      ? "Order Detail"
      : "wekbench");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden rounded-md">
            <Menu className="size-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-64 bg-sidebar text-sidebar-foreground border-sidebar-border p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
            <Wordmark size="md" />
          </div>
          <nav className="p-2">
            <ul className="flex flex-col gap-0.5">
              {mobileNav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>

      <h1 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        <IconButton label="Notifications" badge={5}>
          <Bell className="size-[1.125rem]" />
        </IconButton>
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.full_name) setFullName(data.full_name);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const initials = (fullName ?? user?.email ?? "?")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ml-1 flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-semibold transition-colors hover:bg-secondary/80"
          aria-label="Account menu"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{fullName ?? "Your account"}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <UserIcon className="mr-2 size-4" />
            Profile & settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
