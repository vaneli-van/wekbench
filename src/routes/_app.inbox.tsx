import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({ meta: [{ title: "In Toolbox — wekbench" }] }),
  component: () => <PlaceholderPage title="In Toolbox" description="Captured RFQs across email, uploads, and integrations." />,
});
