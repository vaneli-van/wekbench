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
        <SignInPanel />
      </div>
    </div>
  );
}

const SIGNIN_VALUE_PROPS = [
  "Track pending quotes and order deadlines in real-time",
  "Capture inbound RFQs, PDFs, Excel — all in one inbox",
  "Close more deals with faster response times",
];

function SignInPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-secondary/20 via-muted/10 to-muted/30">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute right-0 top-0 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 size-80 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>
      <div className="relative flex h-full flex-col justify-between px-12 py-16">
        <div />

        <div className="flex flex-col gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              Back to work
            </p>
            <h2 className="mt-4 max-w-md text-4xl font-bold leading-tight tracking-tight text-foreground text-balance">
              Close deals faster with wekbench
            </h2>
          </div>

          <ul className="flex flex-col gap-4">
            {SIGNIN_VALUE_PROPS.map((prop) => (
              <li key={prop} className="flex max-w-sm items-start gap-3">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="size-3.5 stroke-[3]" />
                </span>
                <span className="text-sm leading-relaxed text-foreground/90">{prop}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex max-w-sm items-center gap-3 rounded-lg border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex -space-x-2">
            {["bg-primary/90", "bg-foreground/60", "bg-primary/60"].map((tone, i) => (
              <span
                key={i}
                className={cn("size-8 rounded-full ring-2 ring-background/80", tone)}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Trusted by procurement teams across Africa and beyond.
          </p>
        </div>
      </div>
    </div>
  );
}
