import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface RichEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function RichEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: RichEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex justify-center mb-4">
        <div className="size-16 flex items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      
      <div className="flex gap-3">
        {action && (
          <Button asChild={!!action.href} onClick={action.onClick}>
            {action.href ? (
              <a href={action.href}>{action.label}</a>
            ) : (
              <span>{action.label}</span>
            )}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" asChild={!!secondaryAction.href} onClick={secondaryAction.onClick}>
            {secondaryAction.href ? (
              <a href={secondaryAction.href}>{secondaryAction.label}</a>
            ) : (
              <span>{secondaryAction.label}</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
