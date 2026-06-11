import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/wordmark";

const groups = [
  {
    title: "Product",
    links: [
      { name: "How it works", href: "#how-it-works", external: false },
      { name: "Features", href: "#features", external: false },
      { name: "Results", href: "#results", external: false },
      { name: "Live demo", href: "/dashboard", external: false },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "#", external: false },
      { name: "Careers", href: "#", external: false },
      { name: "Contact", href: "#", external: false },
    ],
  },
  {
    title: "Account",
    links: [
      { name: "Sign in", href: "/signin", external: false },
      { name: "Get started", href: "/signup", external: false },
    ],
  },
];

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isRoute = href.startsWith("/");
  const className = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  if (isRoute) return <Link to={href} className={className}>{children}</Link>;
  return <a href={href} className={className}>{children}</a>;
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Link to="/" className="flex items-center gap-2.5">
              <Wordmark size="md" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The vendor-first procurement platform that turns RFQs into winning quotes in seconds.
            </p>
          </div>

          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-sm font-semibold text-foreground">{g.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {g.links.map((l) => (
                  <li key={l.name}>
                    <FooterLink href={l.href}>{l.name}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:text-left">
          wekbench · wekbench.com · {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
