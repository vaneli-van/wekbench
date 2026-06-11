import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_app/product-search")({
  head: () => ({ meta: [{ title: "Product Search — wekbench" }] }),
  component: () => <PlaceholderPage title="Product Search" description="Find products across your catalog and connected OEMs." />,
});
