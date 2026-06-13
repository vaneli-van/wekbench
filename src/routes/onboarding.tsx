import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  PartyPopper,
  Loader2,
  Sparkles,
  FileText,
  Store,
  ShoppingCart,
  Users,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Welcome to wekbench" }] }),
  component: OnboardingPage,
});

type AccountType = "vendor" | "buyer";
type DemoChoice = "demo" | "fresh";
type VendorType = "distributor" | "system_integrator" | "vendor";
type RoleOption =
  | "Procurement Manager"
  | "Sales Manager"
  | "Bid/Quotation Officer"
  | "Account Manager"
  | "Finance"
  | "Operations"
  | "Founder / Owner"
  | "Other";

// Step list is computed at render time based on accountType; vendors get an extra step.

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<RoleOption | "">("");
  const [country, setCountry] = useState("");
  const [demoChoice, setDemoChoice] = useState<DemoChoice | null>(null);

  // Redirect away if not signed in
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/signin", replace: true });
  }, [loading, user, navigate]);

  // Prefill from existing profile if user is mid-onboarding
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.company_name) setCompany(profile.company_name);
        if (profile.role) setRole(profile.role as RoleOption);
      }
      const { data: ws } = await supabase
        .from("workspaces")
        .select("account_type, country, onboarding_completed_at")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (ws) {
        if (ws.account_type) setAccountType(ws.account_type as AccountType);
        if (ws.country) setCountry(ws.country);
        if (ws.onboarding_completed_at) {
          navigate({ to: "/dashboard", replace: true });
        }
      }
    })();
  }, [user, navigate]);

  // Clear role when user changes account type mid-flow
  const initialAccountTypeRef = useRef<AccountType | null>(null);
  useEffect(() => {
    if (initialAccountTypeRef.current !== null && initialAccountTypeRef.current !== accountType) {
      setRole("");
    }
    if (accountType !== null) {
      initialAccountTypeRef.current = accountType;
    }
  }, [accountType]);

  const canContinue =
    step === 1 ? accountType !== null
    : step === 2 ? fullName.trim().length > 0 && company.trim().length > 0 && role !== "" && country !== ""
    : demoChoice !== null;

  const handleNext = async () => {
    if (step < STEPS.length) {
      setStep((s) => s + 1);
      return;
    }
    // Final step — persist everything
    if (!user) return;
    setSaving(true);
    try {
      const [profileResult, workspaceResult] = await Promise.all([
        supabase
          .from("profiles")
          .update({ full_name: fullName.trim(), company_name: company.trim(), role })
          .eq("id", user.id),
        supabase
          .from("workspaces")
          .update({
            name: company.trim(),
            account_type: accountType ?? "vendor",
            country,
            seeded_demo: demoChoice === "demo",
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq("owner_id", user.id),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (workspaceResult.error) throw workspaceResult.error;
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (done) {
    return (
      <Confirmation
        accountType={accountType ?? "vendor"}
        seeded={demoChoice === "demo"}
        onDashboard={() => navigate({ to: "/dashboard" })}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-6 border-b border-border px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <Wordmark size="sm" />
        </div>
        <ol className="flex flex-1 items-center justify-center gap-2">
          {STEPS.map((s) => {
            const status = s.id < step ? "done" : s.id === step ? "current" : "upcoming";
            return (
              <li key={s.id} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                      status === "done" && "bg-primary text-primary-foreground",
                      status === "current" && "bg-primary/10 text-primary ring-2 ring-primary/30",
                      status === "upcoming" && "bg-secondary text-muted-foreground",
                    )}
                  >
                    {status === "done" ? <Check className="size-3.5" /> : s.id}
                  </span>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:inline",
                      status === "current" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.title}
                  </span>
                </div>
                {s.id < STEPS.length && (
                  <span className={cn("h-px w-8", s.id < step ? "bg-primary" : "bg-border")} />
                )}
              </li>
            );
          })}
        </ol>
        <span className="w-16 shrink-0" />
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-6 py-10">
          {step === 1 && <StepRole accountType={accountType} onSelect={setAccountType} />}
          {step === 2 && (
            <StepProfile
              fullName={fullName}
              company={company}
              role={role}
              country={country}
              accountType={accountType ?? "vendor"}
              onFullName={setFullName}
              onCompany={setCompany}
              onRole={setRole}
              onCountry={setCountry}
            />
          )}
          {step === 3 && (
            <StepDemoChoice
              choice={demoChoice}
              accountType={accountType ?? "vendor"}
              onSelect={setDemoChoice}
            />
          )}
        </div>
      </main>

      <footer className="flex shrink-0 items-center justify-between border-t border-border bg-card px-6 py-3.5">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || saving}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canContinue || saving} className="gap-1.5">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : step === STEPS.length ? (
            "Enter workspace"
          ) : (
            "Continue"
          )}
          {!saving && <ArrowRight className="size-4" />}
        </Button>
      </footer>
    </div>
  );
}

function StepRole({
  accountType,
  onSelect,
}: {
  accountType: AccountType | null;
  onSelect: (t: AccountType) => void;
}) {
  const options: { id: AccountType; icon: typeof Store; title: string; body: string }[] = [
    {
      id: "vendor",
      icon: Store,
      title: "I'm a vendor / supplier",
      body: "I receive RFQs and need to quote fast, win deals, and manage orders.",
    },
    {
      id: "buyer",
      icon: ShoppingCart,
      title: "I'm a buyer / procurement",
      body: "I raise requests and want competitive quotes from a trusted supplier network.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
        How will you use wekbench?
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        This tailors your workspace. You can change it later in settings.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = accountType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={cn(
                "flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                {opt.title}
                {selected && <Check className="size-4 text-primary" />}
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{opt.body}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepProfile({
  fullName,
  company,
  role,
  country,
  accountType,
  onFullName,
  onCompany,
  onRole,
  onCountry,
}: {
  fullName: string;
  company: string;
  role: RoleOption | "";
  country: string;
  accountType: AccountType;
  onFullName: (v: string) => void;
  onCompany: (v: string) => void;
  onRole: (v: RoleOption) => void;
  onCountry: (v: string) => void;
}) {
  const vendorRoles: RoleOption[] = [
    "Sales Manager",
    "Bid/Quotation Officer",
    "Account Manager",
    "Finance",
    "Operations",
    "Founder / Owner",
    "Other",
  ];
  const buyerRoles: RoleOption[] = [
    "Procurement Manager",
    "Finance",
    "Operations",
    "Founder / Owner",
    "Other",
  ];
  const roleOptions = accountType === "vendor" ? vendorRoles : buyerRoles;

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
        Tell us about you
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
        Just the essentials. You can edit everything from Settings later.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => onFullName(e.target.value)}
            placeholder="Jane Doe"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Company name</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => onCompany(e.target.value)}
            placeholder="e.g. Western Premium Ltd"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Your role</Label>
          <Select value={role} onValueChange={(v) => onRole(v as RoleOption)}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Pick a role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={onCountry}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GH">Ghana</SelectItem>
              <SelectItem value="NG">Nigeria</SelectItem>
              <SelectItem value="CI">Côte d&apos;Ivoire</SelectItem>
              <SelectItem value="SN">Senegal</SelectItem>
              <SelectItem value="KE">Kenya</SelectItem>
              <SelectItem value="ZA">South Africa</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
              <SelectItem value="US">United States</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepDemoChoice({
  choice,
  accountType,
  onSelect,
}: {
  choice: DemoChoice | null;
  accountType: AccountType;
  onSelect: (c: DemoChoice) => void;
}) {
  const options: {
    id: DemoChoice;
    icon: typeof Sparkles;
    title: string;
    body: string;
    bullets: string[];
  }[] = [
    {
      id: "demo",
      icon: Sparkles,
      title: "Start with sample data",
      body: "Explore every screen instantly with a fully populated workspace.",
      bullets: [
        accountType === "vendor"
          ? "Sample RFQs, quotes, and orders in motion"
          : "Sample suppliers, requests, and open POs",
        "Ready-made buyers and supplier profiles",
        "You can clear it from Settings anytime",
      ],
    },
    {
      id: "fresh",
      icon: FileText,
      title: "Start fresh",
      body: "An empty workspace, ready for your real data on day one.",
      bullets: [
        "Guided empty states on every screen",
        "Add your own suppliers, buyers, and RFQs",
        "Load sample data later from Settings",
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
        How do you want to start?
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        Either way, you'll land on your dashboard next.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = choice === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={cn(
                "flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                {opt.title}
                {selected && <Check className="size-4 text-primary" />}
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{opt.body}</span>
              <ul className="mt-1 flex flex-col gap-1.5 text-xs text-muted-foreground">
                {opt.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Confirmation({
  accountType,
  seeded,
  onDashboard,
}: {
  accountType: AccountType;
  seeded: boolean;
  onDashboard: () => void;
}) {
  const nextUp = seeded
    ? [
        { icon: FileText, label: "Explore the sample inbox" },
        { icon: Percent, label: "Set your margin & FX defaults" },
        { icon: Users, label: "Invite your team" },
      ]
    : accountType === "vendor"
    ? [
        { icon: FileText, label: "Upload your first RFQ" },
        { icon: Store, label: "Add your supplier catalog" },
        { icon: Users, label: "Invite your team" },
      ]
    : [
        { icon: FileText, label: "Raise your first request" },
        { icon: Store, label: "Browse the supplier network" },
        { icon: Users, label: "Invite your team" },
      ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PartyPopper className="size-7" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground text-balance">
        You&apos;re all set.
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        {seeded
          ? "Your workspace is loaded with sample data so you can explore right away."
          : "Your workspace is ready. Start adding your own data whenever you like."}
      </p>

      <div className="mt-8 w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          A few things to do next
        </p>
        <ul className="flex flex-col gap-2.5">
          {nextUp.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </li>
            );
          })}
        </ul>
      </div>

      <Button onClick={onDashboard} size="lg" className="mt-8 gap-1.5">
        Go to dashboard
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
