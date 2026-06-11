import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/orders")({
  head: () => ({ meta: [{ title: "Orders — wekbench" }] }),
  component: () => <PlaceholderPage title="Orders" description="Active and historical purchase orders." />,
});
