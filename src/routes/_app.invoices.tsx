import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/invoices")({
  head: () => ({ meta: [{ title: "Invoices — wekbench" }] }),
  component: () => <PlaceholderPage title="Invoices" description="Issue, send, and track invoices." />,
});
