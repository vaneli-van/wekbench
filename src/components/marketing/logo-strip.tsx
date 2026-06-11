const companies = [
  "Meridian Bank",
  "Equator Logistics",
  "Sahel Health",
  "Atlas Manufacturing",
  "Coastal Telecoms",
];

export function LogoStrip() {
  return (
    <section className="border-y border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Trusted by vendors quoting the world&apos;s largest buyers
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {companies.map((c) => (
            <span
              key={c}
              className="text-base font-semibold tracking-tight text-muted-foreground/70"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
