// Adapter registry — maps sourcing_providers.key to an implemented adapter.
// SERVER ONLY (pulls in provider clients that read secrets).
//
// Providers seeded in the DB but without an adapter here (oemsecrets, it_source,
// industrial_manual, and future mcmaster / grainger) are simply absent — the
// router skips them gracefully or treats them as manual.
import type { SourcingAdapter } from "./types";
import { nexarAdapter } from "./nexar.server";

const ADAPTERS: Record<string, SourcingAdapter> = {
  [nexarAdapter.key]: nexarAdapter,
};

export function getAdapter(key: string): SourcingAdapter | null {
  return ADAPTERS[key] ?? null;
}
