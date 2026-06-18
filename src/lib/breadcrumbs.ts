export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function generateBreadcrumbs(routeType: string, id?: string, label?: string): BreadcrumbItem[] {
  const base = [{ label: "Dashboard", href: "/dashboard" }];

  switch (routeType) {
    case "rfq":
      return [...base, { label: "My Wekbench", href: "/inbox" }, { label: `RFQ #${id}` }];
    case "quote":
      return [...base, { label: "Quotes", href: "/quotes" }, { label: `Quote #${id}` }];
    case "order":
      return [...base, { label: "Orders", href: "/orders" }, { label: `Order #${id}` }];
    case "invoice":
      return [...base, { label: "Invoices", href: "/invoices" }, { label: `Invoice #${id}` }];
    case "inbox":
      return [...base, { label: "My Wekbench" }];
    case "supplier":
      return [...base, { label: "Suppliers", href: "/suppliers" }, { label: label || `Supplier #${id}` }];
    case "buyer":
      return [...base, { label: "Buyers", href: "/buyers" }, { label: label || `Buyer #${id}` }];
    default:
      return base;
  }
}
