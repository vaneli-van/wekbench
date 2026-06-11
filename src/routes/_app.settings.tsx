import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — wekbench" }] }),
  component: () => <PlaceholderPage title="Settings" description="Workspace, team, branding, margins, and FX defaults." />,
});
