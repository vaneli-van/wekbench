import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, Mail, PenLine, TrendingUp, Truck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Demo — Wekbench" }] }),
  component: DemoPage,
});

function DemoPage() {
  const [tourStep, setTourStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <Wordmark size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Hero section */}
      <section className="border-b border-border px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            See wekbench in action
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Explore how wekbench helps vendors and buyers connect, quote, and deliver in seconds.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => {
                setTourStep(0);
                setShowTour(true);
              }}
              size="lg"
              className="gap-1.5"
            >
              Take a guided tour <ArrowRight className="size-4" />
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/signup">Start for free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Demo screens */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold text-foreground">Explore the app</h2>
          <p className="mt-2 text-muted-foreground">Click any screen to dive deeper</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_SCREENS.map((screen, i) => (
              <button
                key={i}
                onClick={() => {
                  setTourStep(i);
                  setShowTour(true);
                }}
                className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {screen.icon}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{screen.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{screen.description}</p>
                </div>
                <div className="mt-auto pt-2">
                  <span className="text-xs font-medium text-primary">View screen →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tour modal */}
      {showTour && (
        <TourModal
          step={tourStep}
          onStep={setTourStep}
          onClose={() => setShowTour(false)}
        />
      )}
    </div>
  );
}

const DEMO_SCREENS = [
  { icon: <Inbox className="size-5" />, title: "Dashboard", description: "Overview of pending RFQs and quotes" },
  { icon: <Mail className="size-5" />, title: "Inbox", description: "Capture and classify incoming requests" },
  { icon: <PenLine className="size-5" />, title: "Quotes", description: "Build and manage vendor quotes" },
  { icon: <Truck className="size-5" />, title: "Orders", description: "Track the full order lifecycle" },
];

const TOUR_STEPS = [
  {
    title: "Capture RFQs",
    description: "Wekbench automatically extracts request details from PDFs, emails, and Excel files. AI-powered confidence scoring helps you verify accuracy.",
    content: (
      <DemoDashboard />
    ),
  },
  {
    title: "Build Quotes",
    description: "Price requests from connected suppliers in seconds. Apply margins, FX buffers, and your terms with one click.",
    content: (
      <DemoQuoteBuilder />
    ),
  },
  {
    title: "Track Pipeline",
    description: "Kanban-style dashboard shows your full sales pipeline — drafted, submitted, reviewing, won, or lost quotes at a glance.",
    content: (
      <DemoPipeline />
    ),
  },
  {
    title: "Manage Orders",
    description: "From quote to invoice to delivery: track every order milestone with full visibility and real-time status updates.",
    content: (
      <DemoOrders />
    ),
  },
];

interface TourModalProps {
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
}

function TourModal({ step, onStep, onClose }: TourModalProps) {
  const tourData = TOUR_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="mx-auto max-w-3xl rounded-lg bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{tourData.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tourData.description}</p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{tourData.content}</div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => onStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                )}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onStep(Math.max(0, step - 1))}
              variant="outline"
              size="sm"
              disabled={step === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              onClick={() => onStep(Math.min(TOUR_STEPS.length - 1, step + 1))}
              size="sm"
              disabled={step === TOUR_STEPS.length - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* CTA */}
        {step === TOUR_STEPS.length - 1 && (
          <div className="border-t border-border bg-muted/40 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Ready to get started?</p>
              <Button asChild>
                <Link to="/signup">Start free workspace</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock demo screens
function DemoDashboard() {
  return (
    <div className="space-y-4 rounded-lg bg-muted/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "RFQs Pending", value: "23", color: "bg-primary/10 text-primary" },
          { label: "This week", value: "₵450K", color: "bg-success/10 text-success" },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-md p-3", stat.color)}>
            <p className="text-xs font-medium opacity-75">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">Recent activity</p>
        <div className="mt-3 space-y-2">
          {["RFQ extracted from Gmail", "Quote submitted to buyer", "Order confirmed"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoQuoteBuilder() {
  return (
    <div className="space-y-3 rounded-lg bg-muted/50 p-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">Requested items</p>
        <div className="mt-2 space-y-2">
          {[
            { item: "Dell Latitude 5440", qty: 25, supplier: "$892 each" },
            { item: "Cisco Switch", qty: 12, supplier: "$1,240 each" },
          ].map((line) => (
            <div key={line.item} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{line.item} × {line.qty}</span>
              <span className="text-muted-foreground">{line.supplier}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-xs font-medium text-primary">Apply 15% margin + 2% FX buffer</span>
        <span className="text-sm font-semibold text-primary">₵65,432</span>
      </div>
    </div>
  );
}

function DemoPipeline() {
  const columns = [
    { title: "Drafted", count: 8 },
    { title: "Submitted", count: 5 },
    { title: "Won", count: 12 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {columns.map((col) => (
        <div key={col.title} className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">{col.title}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{col.count}</p>
          <p className="mt-1 text-xs text-muted-foreground">quotes</p>
        </div>
      ))}
    </div>
  );
}

function DemoOrders() {
  return (
    <div className="space-y-3 rounded-lg bg-muted/50 p-4">
      {["ORD-2026-0425", "ORD-2026-0424", "ORD-2026-0423"].map((order) => (
        <div key={order} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <div>
            <p className="text-sm font-medium text-foreground">{order}</p>
            <p className="text-xs text-muted-foreground">In transit</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">₵28,500</p>
            <p className="text-xs text-success">On time</p>
          </div>
        </div>
      ))}
    </div>
  );
}
