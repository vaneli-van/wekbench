import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — wekbench" }] }),
  component: () => <PlaceholderPage title="Command Center" description="Your sales command center: KPIs, pipeline, and what's new overnight." />,
});
