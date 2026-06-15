import { createFileRoute } from "@tanstack/react-router";

import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Hero } from "@/components/marketing/hero";
import { LogoStrip } from "@/components/marketing/logo-strip";
import { ProcurementNetwork } from "@/components/marketing/procurement-network";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Features } from "@/components/marketing/features";
import { Metrics } from "@/components/marketing/metrics";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wekbench — Respond to RFQs in seconds" },
      {
        name: "description",
        content:
          "Vendor-first procurement platform. Manage the full RFQ-to-Quote-to-Order workflow for enterprise buyers.",
      },
      { property: "og:title", content: "Wekbench — Respond to RFQs in seconds" },
      {
        property: "og:description",
        content: "End-to-end B2B procurement. From inbox to quote in seconds.",
      },
    ],
  }),
  component: MarketingPage,
});

function MarketingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main>
        <Hero />
        <LogoStrip />
        <ProcurementNetwork />
        <HowItWorks />
        <Features />
        <Metrics />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
