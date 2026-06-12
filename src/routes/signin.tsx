import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in — wekbench" }] }),
  component: SignInPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}

function SignInPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-1 overflow-y-auto bg-background lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center gap-2.5">
          <Wordmark size="md" />
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-10">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Sign in to your workspace
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Continue to your vendor dashboard</p>

            <form
              className="mt-8 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/dashboard" });
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <a
                    href="#"
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              <Button type="submit" className="mt-1 w-full">
                Sign in
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full gap-2 bg-transparent">
              <GoogleIcon className="size-4" />
              Sign in with Google
            </Button>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              New to wekbench?{" "}
              <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          wekbench · wekbench.com · 2026
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-border bg-muted/40 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-transparent to-muted/50" />
        <DashboardPreview />
      </div>
    </div>
  );
}

function DashboardPreview() {
  const rows = [
    { w: "62%", pill: "won" },
    { w: "48%", pill: "review" },
    { w: "71%", pill: "won" },
    { w: "55%", pill: "draft" },
    { w: "64%", pill: "review" },
    { w: "50%", pill: "won" },
    { w: "58%", pill: "draft" },
  ] as const;

  const pillTone: Record<string, string> = {
    won: "bg-foreground/80 text-background",
    review: "bg-foreground/10 text-foreground/70 ring-1 ring-foreground/15",
    draft: "bg-foreground/[0.06] text-foreground/45 ring-1 ring-foreground/10",
  };
  const pillText: Record<string, string> = { won: "Won", review: "Review", draft: "Draft" };

  const bars = [38, 52, 44, 66, 58, 72, 64, 80, 70, 86, 78, 92];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute inset-0 z-10 bg-gradient-to-tl from-muted/70 via-transparent to-transparent" />

      <div className="absolute left-20 top-20 w-[135%] origin-top-left scale-[0.95] opacity-[0.78]">
        <div className="flex h-[660px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/10">
          <div className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-secondary/50 p-3">
            <div className="mb-4 flex items-center gap-2">
              <div className="size-7 rounded-md bg-primary/80" />
              <div className="flex flex-col gap-1">
                <div className="h-2.5 w-16 rounded bg-foreground/25" />
                <div className="h-1.5 w-12 rounded bg-foreground/10" />
              </div>
            </div>
            <div className="mb-3 h-8 w-full rounded-md bg-foreground/[0.06] ring-1 ring-foreground/5" />
            {[
              { w: "40%", active: false },
              { w: "52%", active: true },
              { w: "36%", active: false },
              { w: "48%", active: false },
              { w: "44%", active: false },
              { w: "30%", active: false },
              { w: "50%", active: false },
            ].map((item, i) => (
              <div
                key={i}
                className={cn("flex items-center gap-2 rounded-md px-2 py-2", item.active && "bg-foreground/[0.07]")}
              >
                <div className={cn("size-3.5 rounded", item.active ? "bg-foreground/35" : "bg-foreground/15")} />
                <div
                  className={cn("h-2.5 rounded", item.active ? "bg-foreground/30" : "bg-foreground/15")}
                  style={{ width: item.w }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="h-3.5 w-36 rounded bg-foreground/25" />
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-md bg-foreground/[0.08]" />
                <div className="size-7 rounded-full bg-foreground/15" />
              </div>
            </div>

            <div className="flex-1 p-5">
              <div className="mb-4 grid grid-cols-4 gap-3">
                {[
                  { w: "70%" },
                  { w: "55%" },
                  { w: "62%" },
                  { w: "48%" },
                ].map((kpi, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="mb-2 h-2 rounded bg-foreground/15" style={{ width: kpi.w }} />
                    <div className="h-4 w-10 rounded bg-foreground/30" />
                  </div>
                ))}
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="col-span-2 rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="h-2.5 w-28 rounded bg-foreground/20" />
                    <div className="h-2 w-12 rounded bg-foreground/10" />
                  </div>
                  <div className="flex h-24 items-end gap-1.5">
                    {bars.map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-foreground/15" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-3 h-2.5 w-20 rounded bg-foreground/20" />
                  <div className="flex flex-col gap-2.5">
                    {["72%", "54%", "38%"].map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-foreground/30" />
                        <div className="h-2 flex-1 rounded bg-foreground/10" />
                        <div className="h-2 rounded bg-foreground/20" style={{ width: w === "72%" ? 18 : 14 }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <div className="h-2.5 w-24 rounded bg-foreground/20" />
                  <div className="h-6 w-20 rounded-md bg-foreground/[0.08]" />
                </div>
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b border-border px-4 py-2.5 last:border-0"
                  >
                    <div className="size-3.5 rounded bg-foreground/10" />
                    <div className="size-5 rounded-full bg-foreground/15" />
                    <div className="h-2.5 rounded bg-foreground/15" style={{ width: row.w }} />
                    <div className="ml-auto h-2.5 w-12 rounded bg-foreground/10" />
                    <span
                      className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold", pillTone[row.pill])}
                    >
                      {pillText[row.pill]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
