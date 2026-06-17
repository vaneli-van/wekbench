import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  Sparkles,
  PieChart,
  Plus,
  X,
  ArrowRight,
  Check,
  Inbox,
  FileText,
  Mail,
  TrendingUp,
  Truck,
  Settings as SettingsIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useProfile } from "@/hooks/use-profile"

const STORAGE_KEY = "wekbench:tutorials:v1"

type TutorialId = string
type Tutorial = {
  id: TutorialId
  category: string
  eyebrow: string
  title: string
  description: string
  cta: { label: string; to: string }
  chips: { label: string; to: string }[]
  illustration: () => React.ReactElement
}

const TABS = [
  { id: "for-you", label: "For You" },
  { id: "rfqs", label: "RFQs" },
  { id: "quotes", label: "Quotes" },
  { id: "orders", label: "Orders" },
  { id: "custom", label: "Custom" },
] as const

type TabId = (typeof TABS)[number]["id"]

const TUTORIALS: Record<TabId, Tutorial> = {
  "for-you": {
    id: "for-you-capture",
    category: "Email Capture",
    eyebrow: "Quick start tutorial",
    title:
      "Connect your inbox and let Wekbench turn every incoming RFQ into a ready-to-quote draft",
    description: "",
    cta: { label: "Start building", to: "/email-capture" },
    chips: [
      { label: "Forward an RFQ", to: "/email-capture" },
      { label: "Auto-extract line items", to: "/inbox" },
      { label: "Show more", to: "/settings" },
    ],
    illustration: InboxIllustration,
  },
  rfqs: {
    id: "rfqs-triage",
    category: "RFQ Triage",
    eyebrow: "Quick start tutorial",
    title:
      "Review incoming RFQs, set deadlines, and assign owners so nothing slips through the cracks",
    description: "",
    cta: { label: "Open inbox", to: "/inbox" },
    chips: [
      { label: "Set due dates", to: "/inbox" },
      { label: "Assign owners", to: "/inbox" },
    ],
    illustration: RfqIllustration,
  },
  quotes: {
    id: "quotes-build",
    category: "Quote Builder",
    eyebrow: "Quick start tutorial",
    title:
      "Build branded, priced quotes with your margin and FX defaults — send them in minutes",
    description: "",
    cta: { label: "Create a quote", to: "/quotes" },
    chips: [
      { label: "Apply margin presets", to: "/settings" },
      { label: "Send via email", to: "/quotes" },
    ],
    illustration: QuoteIllustration,
  },
  orders: {
    id: "orders-track",
    category: "Order Tracking",
    eyebrow: "Quick start tutorial",
    title:
      "Follow each won quote through PO, invoice, and shipment with live status updates",
    description: "",
    cta: { label: "View orders", to: "/orders" },
    chips: [
      { label: "Mark shipped", to: "/orders" },
      { label: "Share tracking", to: "/orders" },
    ],
    illustration: OrdersIllustration,
  },
  custom: {
    id: "custom-setup",
    category: "Workspace Setup",
    eyebrow: "Quick start tutorial",
    title:
      "Tailor Wekbench to your team — currencies, vendor type, branding and notification rules",
    description: "",
    cta: { label: "Open settings", to: "/settings" },
    chips: [
      { label: "Set vendor type", to: "/settings" },
      { label: "Brand your quotes", to: "/settings" },
    ],
    illustration: CustomIllustration,
  },
}

export function GettingStartedTutorials() {
  const { data: profile } = useProfile()
  const [dismissed, setDismissed] = useState<boolean>(true)
  const [tab, setTab] = useState<TabId>("for-you")

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "done")
    } catch {
      setDismissed(false)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done")
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  const tutorial = useMemo(() => TUTORIALS[tab], [tab])

  if (dismissed) return null

  const firstName = profile?.firstName?.toLowerCase() || "there"
  const Illustration = tutorial.illustration

  return (
    <section
      aria-label="Getting started with Wekbench"
      className="relative mb-6 rounded-2xl border border-border bg-card p-6 md:p-8"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss getting started"
        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Ahoy, {firstName}</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Get started with Wekbench
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link to="/settings">
              <PieChart className="size-4" />
              My Tutorials
            </Link>
          </Button>
          <Button size="icon" className="size-9" onClick={dismiss} aria-label="Dismiss">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border">
        <div className="-mb-px flex flex-wrap gap-1">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Featured tutorial */}
      <div className="mt-6 grid grid-cols-1 gap-6 rounded-xl border border-border bg-background p-6 md:grid-cols-[1fr_280px] md:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            {tutorial.eyebrow}
          </span>
          <p className="mt-3 text-sm text-muted-foreground">{tutorial.category}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl text-pretty">
            {tutorial.title}
          </h3>

          <div className="mt-5">
            <Button asChild className="gap-1.5">
              <Link to={tutorial.cta.to}>
                {tutorial.cta.label}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {tutorial.chips.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success transition-colors hover:bg-success/15"
              >
                <Check className="size-3" />
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center">
          <Illustration />
        </div>
      </div>
    </section>
  )
}

/* ---------- Illustrations (semantic-token based, no hardcoded colors) ---------- */

function IllustrationFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex size-56 items-center justify-center">
      <span className="absolute size-56 rounded-full bg-primary/5" />
      <span className="absolute size-40 rounded-full bg-primary/10" />
      {children}
    </div>
  )
}

function InboxIllustration() {
  return (
    <IllustrationFrame>
      <div className="relative flex size-28 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <Mail className="size-12 text-primary" />
      </div>
    </IllustrationFrame>
  )
}
function RfqIllustration() {
  return (
    <IllustrationFrame>
      <div className="relative flex size-28 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <Inbox className="size-12 text-primary" />
      </div>
    </IllustrationFrame>
  )
}
function QuoteIllustration() {
  return (
    <IllustrationFrame>
      <div className="relative flex size-28 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <FileText className="size-12 text-primary" />
      </div>
    </IllustrationFrame>
  )
}
function OrdersIllustration() {
  return (
    <IllustrationFrame>
      <div className="relative flex size-28 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <Truck className="size-12 text-primary" />
      </div>
    </IllustrationFrame>
  )
}
function CustomIllustration() {
  return (
    <IllustrationFrame>
      <div className="relative flex size-28 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <SettingsIcon className="size-12 text-primary" />
      </div>
    </IllustrationFrame>
  )
}

// Keep TrendingUp import used to avoid lint complaints if added in future.
void TrendingUp
