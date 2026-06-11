import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  PartyPopper,
  PlayCircle,
  Store,
  ShoppingCart,
  FileText,
  Percent,
  Palette,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Wordmark } from "@/components/wordmark"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Role = "vendor" | "buyer"

const STEPS = [
  { id: 1, title: "Your role" },
  { id: 2, title: "Company" },
]

function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [role, setRole] = useState<Role | null>(null)
  const [company, setCompany] = useState("")
  const [country, setCountry] = useState("GH")

  const persist = () => {
    try {
      localStorage.setItem(
        "wekbench:onboarding",
        JSON.stringify({ role: role ?? "vendor", company: company.trim(), country }),
      )
      localStorage.setItem("wekbench:welcome", "pending")
    } catch {
      /* ignore storage errors */
    }
  }

  const next = () => {
    if (step >= STEPS.length) {
      persist()
      setDone(true)
    } else {
      setStep((s) => s + 1)
    }
  }
  const back = () => setStep((s) => Math.max(1, s - 1))
  const skip = () => {
    persist()
    navigate({ to: "/dashboard" })
  }

  if (done) {
    return <Confirmation role={role ?? "vendor"} onDashboard={() => navigate({ to: "/dashboard" })} />
  }

  const current = STEPS.find((s) => s.id === step)!
  const canContinue = step === 1 ? role !== null : company.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar: brand + progress + skip */}
      <header className="flex shrink-0 items-center gap-6 border-b border-border px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <Wordmark size="sm" />
        </div>

        {/* Step indicator */}
        <ol className="flex flex-1 items-center justify-center gap-2">
          {STEPS.map((s) => {
            const status = s.id < step ? "done" : s.id === step ? "current" : "upcoming"
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
            )
          })}
        </ol>

        <button
          onClick={skip}
          className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip for now
        </button>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-6 py-10">
          {step === 1 && <StepRole role={role} onSelect={setRole} />}
          {step === 2 && (
            <StepCompany
              role={role ?? "vendor"}
              company={company}
              country={country}
              onCompany={setCompany}
              onCountry={setCountry}
            />
          )}
        </div>
      </main>

      {/* Bottom bar */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border bg-card px-6 py-3.5">
        <Button variant="ghost" onClick={back} disabled={step === 1} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={next} disabled={!canContinue} className="gap-1.5">
          {step === STEPS.length ? "Enter workspace" : "Continue"}
          <ArrowRight className="size-4" />
        </Button>
      </footer>
    </div>
  )
}

/* ---------- Step 1: Role ---------- */
function StepRole({ role, onSelect }: { role: Role | null; onSelect: (r: Role) => void }) {
  const options: { id: Role; icon: typeof Store; title: string; body: string }[] = [
    {
      id: "vendor",
      icon: Store,
      title: "I'm a vendor",
      body: "I receive RFQs and need to quote fast, win deals, and manage orders.",
    },
    {
      id: "buyer",
      icon: ShoppingCart,
      title: "I'm a buyer",
      body: "I raise requests and want competitive quotes from a trusted supplier network.",
    },
  ]

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
          const Icon = opt.icon
          const selected = role === opt.id
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
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Step 2: Minimal company ---------- */
function StepCompany({
  role,
  company,
  country,
  onCompany,
  onCountry,
}: {
  role: Role
  company: string
  country: string
  onCompany: (v: string) => void
  onCountry: (v: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
        Tell us about your company
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
        Just the essentials to get you started. You can complete the rest anytime.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Company name</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => onCompany(e.target.value)}
            placeholder="e.g. Western Premium Ltd"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={onCountry}>
            <SelectTrigger id="country">
              <SelectValue />
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

      <p className="mt-6 rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
        {role === "vendor"
          ? "We'll set up your vendor workspace with a sample RFQ so you can see a quote come together right away."
          : "We'll set up your buyer workspace so you can raise your first request and reach our supplier network."}
      </p>
    </div>
  )
}

/* ---------- Confirmation ---------- */
function Confirmation({ role, onDashboard }: { role: Role; onDashboard: () => void }) {
  // What the user can do later, in-context — deferred from the old heavy wizard.
  const nextUp =
    role === "vendor"
      ? [
          { icon: FileText, label: "Upload your first RFQ" },
          { icon: Percent, label: "Set margin & FX defaults" },
          { icon: Palette, label: "Brand your quotes" },
          { icon: Users, label: "Invite your team" },
        ]
      : [
          { icon: FileText, label: "Raise your first request" },
          { icon: Store, label: "Browse the supplier network" },
          { icon: Percent, label: "Set budget preferences" },
          { icon: Users, label: "Invite your team" },
        ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PartyPopper className="size-7" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground text-balance">
        You&apos;re all set.
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
        Your workspace is ready with sample data so you can explore right away. Finish setting things
        up whenever you like — we&apos;ll guide you from inside the app.
      </p>

      <div className="mt-8 w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          A few things to do next
        </p>
        <ul className="flex flex-col gap-2.5">
          {nextUp.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.label} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex-1 text-sm text-foreground">{item.label}</span>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={onDashboard} size="lg" className="gap-1.5">
          Go to dashboard
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="outline" size="lg" className="gap-1.5">
          <PlayCircle className="size-4" />
          Watch 3-minute tour
        </Button>
      </div>
    </div>
  )
}


export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});
