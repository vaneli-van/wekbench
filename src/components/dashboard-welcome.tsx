import { useEffect, useState } from "react"
import {
  Sparkles,
  X,
  ArrowRight,
  ArrowLeft,
  PlayCircle,
  Inbox,
  FileText,
  TrendingUp,
  Truck,
  Check,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Stored = { role?: "vendor" | "buyer"; company?: string; country?: string }

const TOUR_STEPS = [
  {
    icon: Inbox,
    title: "Capture every RFQ automatically",
    body: "Incoming RFQs land in your inbox the moment they arrive by email. wekbench reads the attachments and extracts line items, quantities, and deadlines for you.",
  },
  {
    icon: FileText,
    title: "Build winning quotes in minutes",
    body: "Turn an RFQ into a branded, priced quote with your margin and FX defaults applied. Send it before your competitors have finished reading the email.",
  },
  {
    icon: TrendingUp,
    title: "Track your pipeline at a glance",
    body: "See what's drafted, submitted, won, and lost — plus your win rate and top buyers — all on one dashboard.",
  },
  {
    icon: Truck,
    title: "Manage orders end to end",
    body: "Once a quote is won, follow the purchase order, invoice, and shipment through to delivery, with live updates shared to your buyer.",
  },
]

export function DashboardWelcome() {
  const [show, setShow] = useState(false)
  const [data, setData] = useState<Stored>({})
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)

  useEffect(() => {
    try {
      if (localStorage.getItem("wekbench:welcome") === "pending") {
        const raw = localStorage.getItem("wekbench:onboarding")
        setData(raw ? (JSON.parse(raw) as Stored) : {})
        setShow(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem("wekbench:welcome", "done")
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!show) return null

  const companyName = data.company?.trim() || "your team"

  return (
    <>
      <section
        aria-label="Welcome"
        className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground"
      >
        {/* Decorative radial rings */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 items-center justify-end pr-10 md:flex">
          <div className="relative flex size-64 items-center justify-center">
            <span className="absolute size-64 rounded-full bg-primary-foreground/5" />
            <span className="absolute size-48 rounded-full bg-primary-foreground/5" />
            <span className="absolute size-32 rounded-full bg-primary-foreground/10" />
            <span className="absolute size-16 rounded-full bg-primary-foreground/20" />
          </div>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss welcome"
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="relative max-w-2xl px-6 py-8 md:px-10 md:py-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            Getting started
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-balance md:text-3xl">
            Welcome to wekbench, {companyName}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-primary-foreground/85 text-pretty md:text-base">
            {data.role === "buyer"
              ? "Raise requests and get competitive quotes from a trusted supplier network — faster than ever. Here's a quick tour of what you can do."
              : "Quote faster, win more deals, and manage every order in one place. Here's a quick tour of what you can do."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                setTourStep(0)
                setTourOpen(true)
              }}
              variant="secondary"
              className="gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <PlayCircle className="size-4" />
              Take a tour
            </Button>
            <Button
              onClick={dismiss}
              variant="outline"
              className="gap-1.5 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Explore on my own
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <TourDialog
        open={tourOpen}
        step={tourStep}
        onStep={setTourStep}
        onOpenChange={setTourOpen}
        onFinish={() => {
          setTourOpen(false)
          dismiss()
        }}
      />
    </>
  )
}

function TourDialog({
  open,
  step,
  onStep,
  onOpenChange,
  onFinish,
}: {
  open: boolean
  step: number
  onStep: (n: number) => void
  onOpenChange: (o: boolean) => void
  onFinish: () => void
}) {
  const current = TOUR_STEPS[step]
  const Icon = current.icon
  const isLast = step === TOUR_STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <DialogHeader className="mt-2">
          <DialogTitle className="text-xl tracking-tight">{current.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{current.body}</DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="mt-2 flex items-center gap-2" role="tablist" aria-label="Tour progress">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" onClick={onFinish} className="text-muted-foreground">
                Skip
              </Button>
            )}
            <Button onClick={() => (isLast ? onFinish() : onStep(step + 1))} className="gap-1.5">
              {isLast ? (
                <>
                  Get started
                  <Check className="size-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
