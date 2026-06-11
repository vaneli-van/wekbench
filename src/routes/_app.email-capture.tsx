import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/email-capture")({
  head: () => ({ meta: [{ title: "Email Capture — wekbench" }] }),
  component: () => <PlaceholderPage title="Email Capture" description="Forwarding address and capture rules for incoming RFQs." />,
});
