// Deterministic sourcing router. SERVER ONLY.
//
// For each line item: classify (no AI) -> find enabled providers for that
// category -> fan out to their adapters IN PARALLEL -> cache results in
// provider_offers with a freshness window -> return a per-item summary.
//
// Routing is pure lookup; the only "intelligence" is the deterministic
// classifier. No model calls happen here.
import { classifyItem, type ClassifyInput } from "./classify";
import { getAdapter } from "./registry.server";
import type { NormalizedOffer, NormalizedPart } from "./types";
import { getEntitlement } from "@/lib/api/workspace.functions";

const DEFAULT_FRESHNESS_HOURS = 6;

export type RouteItemInput = ClassifyInput & { qty?: number };

export type ProviderOutcome = {
  providerKey: string;
  providerName: string;
  status: "ok" | "cached" | "error" | "no_adapter" | "manual";
  offerCount: number;
  bestPrice?: { price: number; currency: string; distributor: string } | null;
  error?: string;
};

export type ItemRouting = {
  label: string;
  category: string;
  mpn?: string;
  providers: ProviderOutcome[];
};

type ProviderRow = {
  id: string;
  key: string;
  name: string;
  kind: string;
  categories: string[];
  preferred: boolean;
};

type RouteCtx = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  workspaceId: string;
  currency?: string;
  freshnessHours?: number;
};

function bestPriceOf(offers: NormalizedOffer[]): ProviderOutcome["bestPrice"] {
  let best: ProviderOutcome["bestPrice"] = null;
  for (const o of offers) {
    for (const pb of o.priceBreaks) {
      if (best == null || pb.price < best.price) {
        best = { price: pb.price, currency: pb.currency, distributor: o.distributorName };
      }
    }
  }
  return best;
}

async function loadEnabledProviders(ctx: RouteCtx): Promise<ProviderRow[]> {
  const { data: providers } = await ctx.supabase
    .from("sourcing_providers")
    .select("id, key, name, kind, categories, is_active, priority")
    .eq("is_active", true)
    .order("priority", { ascending: true });
  const all = (providers ?? []) as Array<Omit<ProviderRow, "preferred"> & { is_active: boolean }>;

  const { data: wp } = await ctx.supabase
    .from("workspace_providers")
    .select("provider_id, enabled, preferred")
    .eq("workspace_id", ctx.workspaceId);
  const cfg = (wp ?? []) as Array<{ provider_id: string; enabled: boolean; preferred: boolean }>;

  if (cfg.length === 0) {
    // Workspace not configured yet — default to all active providers.
    return all.map((p) => ({ ...p, preferred: false }));
  }
  const enabled = new Set(cfg.filter((r) => r.enabled).map((r) => r.provider_id));
  const preferred = new Set(cfg.filter((r) => r.preferred).map((r) => r.provider_id));
  return all
    .filter((p) => enabled.has(p.id))
    .map((p) => ({ ...p, preferred: preferred.has(p.id) }));
}

async function getFreshCached(
  ctx: RouteCtx,
  providerId: string,
  identifier: string,
): Promise<NormalizedOffer[] | null> {
  const hours = ctx.freshnessHours ?? DEFAULT_FRESHNESS_HOURS;
  const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data } = await ctx.supabase
    .from("provider_offers")
    .select(
      "distributor_name, distributor_external_id, distributor_sku, stock_qty, moq, order_multiple, packaging, lead_time_days, price_breaks, buy_url, is_authorised",
    )
    .eq("workspace_id", ctx.workspaceId)
    .eq("provider_id", providerId)
    .eq("identifier", identifier)
    .gte("fetched_at", cutoff);
  if (!data || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    distributorName: r.distributor_name ?? "Unknown",
    distributorExternalId: r.distributor_external_id,
    distributorSku: r.distributor_sku,
    stockQty: r.stock_qty,
    moq: r.moq,
    orderMultiple: r.order_multiple,
    packaging: r.packaging,
    leadTimeDays: r.lead_time_days,
    priceBreaks: Array.isArray(r.price_breaks) ? r.price_breaks : [],
    buyUrl: r.buy_url,
    isAuthorised: r.is_authorised,
  }));
}

async function cacheOffers(
  ctx: RouteCtx,
  providerId: string,
  identifier: string,
  parts: NormalizedPart[],
): Promise<void> {
  const rows = parts.flatMap((part) =>
    part.offers.map((o) => ({
      workspace_id: ctx.workspaceId,
      provider_id: providerId,
      identifier,
      external_part_id: part.externalPartId ?? null,
      manufacturer: part.manufacturer ?? null,
      image_url: part.imageUrl ?? null,
      datasheet_url: part.datasheetUrl ?? null,
      distributor_name: o.distributorName,
      distributor_external_id: o.distributorExternalId ?? null,
      distributor_sku: o.distributorSku ?? null,
      stock_qty: o.stockQty ?? null,
      moq: o.moq ?? null,
      order_multiple: o.orderMultiple ?? null,
      packaging: o.packaging ?? null,
      lead_time_days: o.leadTimeDays ?? null,
      price_breaks: o.priceBreaks,
      currency: o.priceBreaks[0]?.currency ?? null,
      buy_url: o.buyUrl ?? null,
      is_authorised: o.isAuthorised ?? null,
      fetched_at: new Date().toISOString(),
    })),
  );
  // Replace any prior cache for this (workspace, provider, identifier).
  await ctx.supabase
    .from("provider_offers")
    .delete()
    .eq("workspace_id", ctx.workspaceId)
    .eq("provider_id", providerId)
    .eq("identifier", identifier);
  if (rows.length > 0) {
    await ctx.supabase.from("provider_offers").insert(rows);
  }
}

async function runProvider(
  ctx: RouteCtx,
  provider: ProviderRow,
  classified: { mpn?: string; manufacturer?: string },
  item: RouteItemInput,
): Promise<ProviderOutcome> {
  const base = { providerKey: provider.key, providerName: provider.name };
  const adapter = getAdapter(provider.key);

  // Non-API providers (manual / catalog) and providers without an adapter yet.
  if (!adapter || provider.kind !== "api") {
    return {
      ...base,
      status: provider.kind === "manual" ? "manual" : "no_adapter",
      offerCount: 0,
    };
  }

  const identifier = classified.mpn ?? (item.description ?? "").trim();
  if (!identifier) {
    return { ...base, status: "error", offerCount: 0, error: "No MPN or description to look up" };
  }

  try {
    // Cache first (protects API quotas).
    const cached = await getFreshCached(ctx, provider.id, identifier);
    if (cached) {
      return { ...base, status: "cached", offerCount: cached.length, bestPrice: bestPriceOf(cached) };
    }

    const parts = classified.mpn
      ? await adapter.matchByMpn({
          mpn: classified.mpn,
          manufacturer: classified.manufacturer,
          qty: item.qty,
          currency: ctx.currency,
        })
      : await adapter.search({
          query: identifier,
          qty: item.qty,
          currency: ctx.currency,
        });

    await cacheOffers(ctx, provider.id, identifier, parts);
    const offers = parts.flatMap((p) => p.offers);
    return { ...base, status: "ok", offerCount: offers.length, bestPrice: bestPriceOf(offers) };
  } catch (e) {
    return {
      ...base,
      status: "error",
      offerCount: 0,
      error: e instanceof Error ? e.message : "Lookup failed",
    };
  }
}

export async function routeItems(
  items: RouteItemInput[],
  ctx: RouteCtx,
): Promise<{ items: ItemRouting[] }> {
  const providers = await loadEnabledProviders(ctx);
  // Freemium gate: Starter sources from a single basic provider; Pro (or in-trial)
  // gets the full multi-provider fan-out.
  const ent = await getEntitlement(ctx.supabase, ctx.workspaceId);

  const results = await Promise.all(
    items.map(async (item) => {
      const classified = classifyItem(item);
      let forCategory = providers.filter((p) => p.categories.includes(classified.category));
      if (!ent.isPro && forCategory.length > 1) {
        // Keep one provider — the workspace's preferred one if set, else highest priority.
        forCategory = [...forCategory]
          .sort((a, b) => Number(b.preferred) - Number(a.preferred))
          .slice(0, 1);
      }
      // Fan out to this category's providers in parallel.
      const outcomes = await Promise.all(
        forCategory.map((p) => runProvider(ctx, p, classified, item)),
      );
      const label = item.mpn || item.description || item.model || "(unnamed)";
      return {
        label,
        category: classified.category,
        mpn: classified.mpn,
        providers: outcomes,
      } satisfies ItemRouting;
    }),
  );

  return { items: results };
}
