import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
  showLabel?: boolean;
}

export function CopyButton({
  text,
  label = "Copy",
  size = "sm",
  variant = "outline",
  className,
  showLabel = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(text, "Copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      onClick={handleCopy}
      size={size}
      variant={variant}
      className={cn("gap-1.5 transition-all", copied && "text-success", className)}
    >
      {copied ? (
        <>
          <Check className="size-4" />
          {showLabel && "Copied"}
        </>
      ) : (
        <>
          <Copy className="size-4" />
          {showLabel && label}
        </>
      )}
    </Button>
  );
}
