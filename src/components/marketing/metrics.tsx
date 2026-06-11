const metrics = [
  { value: "8 sec", label: "to extract a full RFQ", sub: "vs ~2 hours by hand" },
  { value: "14×", label: "faster quote turnaround", sub: "from days to minutes" },
  { value: "61%", label: "average win rate", sub: "for teams quoting first" },
  { value: "100%", label: "of quotes audit-tracked", sub: "every version retained" },
];

export function Metrics() {
  return (
    <section id="results" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">The results</p>
          <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Speed that turns into revenue
          </h2>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-1 bg-card p-6 text-center">
              <dt className="text-4xl font-semibold tracking-tight text-foreground">{m.value}</dt>
              <dd className="text-sm font-medium text-foreground">{m.label}</dd>
              <dd className="text-xs text-muted-foreground">{m.sub}</dd>
            </div>
          ))}
        </dl>

        <figure className="mx-auto mt-14 max-w-3xl text-center">
          <blockquote className="text-balance text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
            &ldquo;We used to lose deals simply because we replied too late. With wekbench we&apos;re
            first in with a clean quote — and we&apos;re winning a lot more of them.&rdquo;
          </blockquote>
          <figcaption className="mt-5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Samuel Adeyemi</span> · Vendor Sales Lead,
            Western Premium
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
