import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/buyers")({
  head: () => ({ meta: [{ title: "Buyers — wekbench" }] }),
  component: () => <PlaceholderPage title="Buyers" description="Your buyer directory and account history." />,
});
