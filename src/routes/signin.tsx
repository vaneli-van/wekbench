import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Check, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in — Wekbench" }] }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "That email and password don't match. Try again."
        : error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="fixed inset-0 z-50 grid grid-cols-1 overflow-y-auto bg-background lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link to="/" className="flex items-center gap-2.5">
          <Wordmark size="md" />
        </Link>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-10">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Sign in to your workspace
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Continue to your vendor dashboard</p>

            <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  <Link
                    to="/reset-password"
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" className="mt-1 w-full gap-1.5" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Continue with work email
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full gap-2 bg-transparent"
              title="Microsoft sign-in is coming soon"
            >
              <MicrosoftIcon className="size-4" />
              Continue with Microsoft
              <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Soon
              </span>
            </Button>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              New to Wekbench?{" "}
              <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          Wekbench · wekbench.com · 2026
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-border bg-muted/40 lg:block">
        <SignInPanel />
      </div>
    </div>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
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
              Close deals faster with Wekbench
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
            Trusted by procurement teams worldwide.
          </p>
        </div>
      </div>
    </div>
  );
}
