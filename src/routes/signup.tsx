import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Eye, EyeOff, Loader2, Mail, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create your account — wekbench" }] }),
  component: SignUpPage,
});

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "live.com",
  "proton.me",
  "protonmail.com",
]);

const VALUE_PROPS = [
  "Quote inbound RFQs in minutes, not days",
  "Auto-extract line items from PDFs, Excel & email",
  "Win more deals with faster, branded quotes",
];

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

function SignUpPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPersonalEmail = useMemo(() => {
    const domain = email.split("@")[1]?.toLowerCase().trim();
    return domain ? FREE_EMAIL_DOMAINS.has(domain) : false;
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: fullName },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/onboarding" });
    } else {
      toast.success("Check your inbox to confirm your email, then sign in.");
      navigate({ to: "/signin" });
    }
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
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Free to start. No card required.</p>

            <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

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
                {isPersonalEmail && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    <span>Looks like a personal address. Use your work email to unlock team features.</span>
                  </p>
                )}
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
              </div>

              <Button type="submit" className="mt-1 w-full gap-1.5" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Create account
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
