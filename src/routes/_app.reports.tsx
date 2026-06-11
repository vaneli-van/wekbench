import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — wekbench" }] }),
  component: () => <PlaceholderPage title="Reports" description="Quote win-rates, margin, and pipeline analytics." />,
});
