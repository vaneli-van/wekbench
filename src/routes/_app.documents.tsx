import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/documents")({
  head: () => ({ meta: [{ title: "Documents — wekbench" }] }),
  component: () => <PlaceholderPage title="Documents" description="All RFQ, quote, PO, and invoice files in one place." />,
});
