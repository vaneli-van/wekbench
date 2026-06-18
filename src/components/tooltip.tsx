import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, position = "top", className }: TooltipProps) {
  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={cn(
          "pointer-events-none absolute hidden group-hover:block z-50",
          "px-2 py-1 text-xs font-medium text-background bg-foreground rounded whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          positionClasses[position],
          className
        )}
      >
        {content}
      </div>
    </div>
  );
}
