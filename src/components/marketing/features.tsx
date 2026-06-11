import { Layers, TrendingUp, Globe, ShieldCheck, FileSpreadsheet, Workflow } from "lucide-react";

const features = [
  { icon: Layers, title: "Catalog-aware matching", body: "Every extracted item is matched to your products and OEM price lists, so quotes reflect what you actually sell." },
  { icon: Globe, title: "Live FX & landed cost", body: "Real-time rates with your own buffer, plus duties and freight baked in — no spreadsheet gymnastics." },
  { icon: TrendingUp, title: "Margin you control", body: "Set default margins once and override per quote. See your profit before you hit send." },
  { icon: Workflow, title: "RFQ-to-order pipeline", body: "Track every request from quote to PO to invoice to delivery in one connected workflow." },
  { icon: FileSpreadsheet, title: "Any format in", body: "PDFs, Excel sheets, scanned images, or plain email text — wekbench reads them all." },
  { icon: ShieldCheck, title: "Audit-ready records", body: "Versioned quotes and documents keep a clean trail for buyers, finance, and compliance." },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Built for vendors</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything you need to win the quote
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Purpose-built for the way procurement vendors and distributors actually work.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6">
                <span className="flex size-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
