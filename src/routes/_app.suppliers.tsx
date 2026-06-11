import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers / OEMs — wekbench" }] }),
  component: () => <PlaceholderPage title="Suppliers / OEMs" description="Connected suppliers, distributors, and OEMs." />,
});
