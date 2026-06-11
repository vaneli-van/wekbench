import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/quotes")({
  head: () => ({ meta: [{ title: "Quotes — wekbench" }] }),
  component: () => <PlaceholderPage title="Quotes" description="All quotes you've sent, in every state." />,
});
