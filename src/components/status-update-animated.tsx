import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { notifyStatusChange } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface StatusUpdateAnimatedProps {
  currentStatus: string;
  newStatus: string;
  onUpdate: (status: string) => Promise<void>;
  disabled?: boolean;
}

export function StatusUpdateAnimated({
  currentStatus,
  newStatus,
  onUpdate,
  disabled = false,
}: StatusUpdateAnimatedProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      await onUpdate(newStatus);
      setIsAnimating(true);
      notifyStatusChange(currentStatus, newStatus);
      setTimeout(() => setIsAnimating(false), 1000);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isPending}
      className={cn(
        "transition-all duration-300",
        isAnimating && "animate-pulse-glow"
      )}
    >
      {isAnimating && <CheckCircle2 className="mr-2 size-4 animate-bounce" />}
      Update to {newStatus}
    </Button>
  );
}
