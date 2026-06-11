import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — wekbench" }] }),
  component: () => <PlaceholderPage title="Integrations" description="Connect ERP, accounting, freight, and OEM APIs." />,
});
