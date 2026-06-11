import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — wekbench" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4 py-12">
      <Wordmark size="lg" />
      <div className="mt-8 w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Let&apos;s set up your workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Walk through margins, FX, branding, and capture in 5 quick steps.
        </p>
        <div className="mt-6 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={
                "h-1.5 rounded-full " + (s === 1 ? "bg-primary" : "bg-border")
              }
            />
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg"><Link to="/dashboard">Skip and explore</Link></Button>
        </div>
      </div>
    </div>
  );
}
