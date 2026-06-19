import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/lib/breadcrumbs";

interface BreadcrumbsDisplayProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbsDisplay({ items }: BreadcrumbsDisplayProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {idx > 0 && <ChevronRight className="size-4 text-muted-foreground" />}
          {item.href ? (
            <Link to={item.href} className="text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
