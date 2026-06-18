import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Check, FileText, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";

const extracted = [
  { item: "Dell Latitude 5440 Laptop", qty: 25, match: 98 },
  { item: "Cisco Catalyst 1000 Switch", qty: 12, match: 94 },
  { item: "APC Smart-UPS 10kVA", qty: 8, match: 89 },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            End-to-end B2B procurement
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Respond to RFQs in seconds, not days.
          </h1>
          <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            Wekbench is your trusted procurement partner. Register as a vendor or buyer, raise a
            request, and we run it end to end — sourcing from connected OEMs and distributors,
            pricing instantly, and managing the purchase all the way to delivery.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-1.5">
              <Link to="/signup">
                Start free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/demo">View live demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required · Sample workspace included
          </p>
        </div>

        <div className="relative">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="size-2.5 rounded-full bg-destructive/30" />
              <span className="size-2.5 rounded-full bg-warning/40" />
              <span className="size-2.5 rounded-full bg-success/40" />
              <span className="ml-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" />
                Meridian-RFQ-2026-0418.pdf
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="size-3" />
                Extracted
              </span>
            </div>

            <div className="space-y-2.5 p-4">
              {extracted.map((row) => (
                <div
                  key={row.item}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                    <Check className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {row.item}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">×{row.qty}</span>
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                    {row.match}%
                  </span>
                </div>
              ))}

              <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-primary" />
                  <span className="font-medium text-foreground">Quote drafted</span>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">8.2s</span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-7 -left-5 hidden rounded-lg border border-border bg-card px-4 py-3 shadow-md lg:block">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">14×</p>
            <p className="text-xs text-muted-foreground">faster turnaround</p>
          </div>
        </div>
      </div>
    </section>
  );
}
