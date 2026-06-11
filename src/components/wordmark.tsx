import { cn } from "@/lib/utils";

const heights = { sm: 20, md: 24, lg: 30, xl: 40 } as const;

export function Wordmark({
  className,
  size = "sm",
}: {
  className?: string;
  size?: keyof typeof heights;
}) {
  const height = heights[size];
  return (
    <img
      src="/wekbench-logo.png"
      alt="wekbench"
      className={cn("select-none w-auto", className)}
      style={{ height }}
    />
  );
}
