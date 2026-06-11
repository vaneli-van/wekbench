import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/catalog")({
  head: () => ({ meta: [{ title: "Catalog — wekbench" }] }),
  component: () => <PlaceholderPage title="Catalog" description="Browse and manage the products you sell." />,
});
