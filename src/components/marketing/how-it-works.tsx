import { Mailbox, ScanText, Calculator, Send } from "lucide-react";

const steps = [
  {
    icon: Mailbox,
    title: "Capture the RFQ",
    body: "Forward an email or drop a PDF, Excel, or scanned doc into your Wekbench. Nothing to copy and paste.",
  },
  {
    icon: ScanText,
    title: "Extract line items",
    body: "AI reads every line — brand, spec, and quantity — and matches each to your catalog with a confidence score.",
  },
  {
    icon: Calculator,
    title: "Price automatically",
    body: "Landed cost, your margin defaults, and live FX rates are applied so the numbers are ready the moment items are matched.",
  },
  {
    icon: Send,
    title: "Send a branded quote",
    body: "Review, tweak if needed, and send a polished quote with your logo and terms — all within minutes of the request.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">How it works</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From inbox to quote without the busywork
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            The four steps your team used to do by hand, now handled end to end.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative flex flex-col rounded-xl border border-border bg-card p-6"
              >
                <span className="absolute right-5 top-5 text-sm font-semibold tabular-nums text-muted-foreground/40">
                  0{i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
