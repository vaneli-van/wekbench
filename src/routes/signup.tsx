import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create your account — wekbench" }] }),
  component: SignUpPage,
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

const VALUE_PROPS = [
  "Quote inbound RFQs in minutes, not days",
  "Auto-extract line items from PDFs, Excel & email",
  "Win more deals with faster, branded quotes",
];

function SignUpPage() {
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
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Free to start. No card required.</p>

            <form
              className="mt-8 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/onboarding" });
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" type="text" autoComplete="name" placeholder="Ama Mensah" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    minLength={8}
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
              </div>

              <Button type="submit" className="mt-1 w-full">
                Create account
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full gap-2 bg-transparent">
              <GoogleIcon className="size-4" />
              Sign up with Google
            </Button>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              By creating an account you agree to our{" "}
              <a href="#" className="underline-offset-4 hover:underline">Terms</a> and{" "}
              <a href="#" className="underline-offset-4 hover:underline">Privacy Policy</a>.
            </p>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="font-medium text-foreground underline-offset-4 hover:underline">
                Sign in
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
        <div className="relative flex h-full flex-col justify-center px-16">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            The procurement workspace
          </p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance">
            Turn every inbound RFQ into a winning quote
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {VALUE_PROPS.map((prop) => (
              <li key={prop} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm leading-relaxed text-foreground">{prop}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-3 rounded-lg border border-border bg-card/60 p-4">
            <div className="flex -space-x-2">
              {["bg-primary/80", "bg-foreground/70", "bg-primary/50"].map((tone, i) => (
                <span key={i} className={cn("size-7 rounded-full ring-2 ring-card", tone)} aria-hidden="true" />
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Join vendors quoting the world's largest buyers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
