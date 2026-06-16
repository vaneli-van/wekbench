// Shipping adapter registry — maps shipping_providers.slug to an implementation.
// SERVER ONLY (pulls in provider clients that read secrets).
//
// Providers seeded in the DB but without an adapter here (e.g. a future
// freightos freight adapter) are simply absent — the router skips them.
import type { ShippingAdapter } from "./types";
import { terminalAfricaAdapter } from "./terminal.server";

const ADAPTERS: Record<string, ShippingAdapter> = {
  [terminalAfricaAdapter.slug]: terminalAfricaAdapter,
};

export function getShippingAdapter(slug: string): ShippingAdapter | null {
  return ADAPTERS[slug] ?? null;
}
