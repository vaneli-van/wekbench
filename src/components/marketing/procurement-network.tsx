import { Building2, Network, PackageCheck, Truck } from "lucide-react";

const journey = [
  {
    icon: Building2,
    step: "01",
    title: "Register as a vendor or buyer",
    body: "Set up your business profile once. Vendors list what they sell; buyers tell us what they need to procure.",
  },
  {
    icon: Network,
    step: "02",
    title: "Submit an RFQ or RFP",
    body: "Raise a request in a few clicks. wekbench routes it across our connected network of OEMs and distributors.",
  },
  {
    icon: PackageCheck,
    step: "03",
    title: "Source & purchase in one place",
    body: "Compare quotes, approve, and issue the purchase order without leaving the platform or juggling vendor portals.",
  },
  {
    icon: Truck,
    step: "04",
    title: "Delivered, start to finish",
    body: "We coordinate fulfillment and logistics so the order arrives — with full tracking and an audit trail the whole way.",
  },
];

const partners = ["OEMs", "Distributors", "Wholesalers", "Logistics", "Customs", "Finance"];

export function ProcurementNetwork() {
  return (
    <section id="platform" className="scroll-mt-20 border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">End-to-end procurement</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Your trusted partner from request to delivery
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Think of the simplicity of buying online — but for business. wekbench plugs into a network of OEMs and
            distributors through partnerships and APIs, so any purchase you need to make is handled from the very
            first request all the way to the doorstep.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Building2 className="size-6" />
                </span>
                <span className="text-sm font-semibold text-foreground">You</span>
                <span className="text-xs text-muted-foreground">Vendor or buyer</span>
              </div>

              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex size-16 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Network className="size-7" />
                </span>
                <span className="text-sm font-semibold text-foreground">wekbench</span>
                <span className="text-xs text-muted-foreground">Procurement hub</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-2">
                {partners.map((p) => (
                  <span
                    key={p}
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-center text-xs font-medium text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {journey.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="relative flex flex-col rounded-xl border border-border bg-card p-6">
                <span className="absolute right-5 top-5 text-sm font-semibold tabular-nums text-muted-foreground/40">
                  {s.step}
                </span>
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
