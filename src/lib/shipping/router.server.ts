// Deterministic shipping router. SERVER ONLY.
//
// Load enabled shipping providers for the requested mode -> fan out to their
// adapters IN PARALLEL -> cache the normalized rates in shipping_rate_cache with
// a freshness window -> return merged, sorted rates plus a per-provider summary.
//
// No model calls — pure lookup + fan-out.
import { getShippingAdapter } from "./registry.server";
import type { ShippingMode, ShippingRate, ShippingRateInput } from "./types";

const DEFAULT_FRESHNESS_HOURS = 6;

export type ShippingProviderOutcome = {
  slug: string;
  name: string;
  status: "ok" | "cached" | "error" | "no_adapter";
  rateCount: number;
  error?: string;
};

type RouteCtx = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  workspaceId: string;
  freshnessHours?: number;
};

type ProviderRow = { id: string; slug: string; name: string; mode: string };

/** Tiny stable hash (djb2) over the request, for the cache key. */
function hashRequest(slug: string, input: ShippingRateInput): string {
  const s = JSON.stringify({
    slug,
    o: input.origin,
    d: input.destination,
    p: input.parcel,
    f: input.freight,
    c: input.currency,
  });
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

async function loadProviders(ctx: RouteCtx, mode: ShippingMode): Promise<ProviderRow[]> {
  const { data: providers } = await ctx.supabase
    .from("shipping_providers")
    .select("id, slug, name, mode, is_active, priority")
    .eq("is_active", true)
    .eq("mode", mode)
    .order("priority", { ascending: true });
  const all = (providers ?? []) as Array<ProviderRow & { is_active: boolean }>;

  const { data: wp } = await ctx.supabase
    .from("workspace_shipping_providers")
    .select("provider_id, enabled")
    .eq("workspace_id", ctx.workspaceId);
  const cfg = (wp ?? []) as Array<{ provider_id: string; enabled: boolean }>;

  // No per-workspace config yet -> default to all active providers for the mode.
  if (cfg.length === 0) return all;
  const enabled = new Set(cfg.filter((r) => r.enabled).map((r) => r.provider_id));
  return all.filter((p) => enabled.has(p.id));
}

async function getFreshCached(
  ctx: RouteCtx,
  slug: string,
  requestHash: string,
): Promise<ShippingRate[] | null> {
  const hours = ctx.freshnessHours ?? DEFAULT_FRESHNESS_HOURS;
  const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data } = await ctx.supabase
    .from("shipping_rate_cache")
    .select("response, fetched_at")
    .eq("workspace_id", ctx.workspaceId)
    .eq("provider_slug", slug)
    .eq("request_hash", requestHash)
    .gte("fetched_at", cutoff)
    .maybeSingle();
  if (!data || !Array.isArray(data.response) || data.response.length === 0) return null;
  return data.response as ShippingRate[];
}

async function cacheRates(
  ctx: RouteCtx,
  slug: string,
  requestHash: string,
  rates: ShippingRate[],
): Promise<void> {
  await ctx.supabase
    .from("shipping_rate_cache")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(
      {
        workspace_id: ctx.workspaceId,
        provider_slug: slug,
        request_hash: requestHash,
        response: rates,
        fetched_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      { onConflict: "workspace_id,provider_slug,request_hash" },
    );
}

export async function routeShipping(
  input: ShippingRateInput,
  ctx: RouteCtx,
  mode: ShippingMode = "courier",
): Promise<{ rates: ShippingRate[]; providers: ShippingProviderOutcome[] }> {
  const providers = await loadProviders(ctx, mode);

  const results = await Promise.all(
    providers.map(async (p): Promise<{ outcome: ShippingProviderOutcome; rates: ShippingRate[] }> => {
      const base = { slug: p.slug, name: p.name };
      const adapter = getShippingAdapter(p.slug);
      if (!adapter) return { outcome: { ...base, status: "no_adapter", rateCount: 0 }, rates: [] };

      const requestHash = hashRequest(p.slug, input);
      try {
        const cached = await getFreshCached(ctx, p.slug, requestHash);
        if (cached) return { outcome: { ...base, status: "cached", rateCount: cached.length }, rates: cached };

        const rates = await adapter.getRates(input);
        await cacheRates(ctx, p.slug, requestHash, rates);
        return { outcome: { ...base, status: "ok", rateCount: rates.length }, rates };
      } catch (e) {
        return {
          outcome: { ...base, status: "error", rateCount: 0, error: e instanceof Error ? e.message : "Lookup failed" },
          rates: [],
        };
      }
    }),
  );

  const rates = results.flatMap((r) => r.rates).sort((a, b) => a.amount - b.amount);
  return { rates, providers: results.map((r) => r.outcome) };
}
