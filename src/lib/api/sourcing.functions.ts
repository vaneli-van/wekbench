import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nexarAdapter } from "@/lib/sourcing/nexar.server";
import { routeItems } from "@/lib/sourcing/router.server";
import { classifyItem } from "@/lib/sourcing/classify";
import { priceAtQty } from "@/lib/sourcing/pricing";

/**
 * Phase 1 verification endpoint: look up a part on Nexar by MPN (exact match),
 * falling back to fuzzy search if there's no exact hit. Returns the normalized
 * shape every provider adapter produces. Auth-gated; secrets stay server-side.
 */
export const lookupNexar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        mpn: z.string().min(1),
        currency: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().int().min(1).max(10).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let parts = await nexarAdapter.matchByMpn({
      mpn: data.mpn,
      currency: data.currency,
      limit: data.limit ?? 1,
    });
    let mode: "exact" | "search" = "exact";
    if (parts.length === 0) {
      parts = await nexarAdapter.search({
        query: data.mpn,
        currency: data.currency,
        country: data.country,
        limit: data.limit ?? 5,
      });
      mode = "search";
    }
    return { mode, count: parts.length, parts };
  });

/**
 * Phase 3 verification: classify line items (deterministic, no AI), route each
 * to the providers enabled for its category, fan out in parallel, cache offers,
 * and return a per-item routing summary. Auth-gated; resolves the caller's
 * workspace for scoping and caching.
 */
export const routePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              description: z.string().optional(),
              brand: z.string().optional(),
              model: z.string().optional(),
              mpn: z.string().optional(),
              qty: z.number().optional(),
            }),
          )
          .min(1)
          .max(20),
        currency: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: ws } = await context.supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!ws) throw new Error("No workspace found for this user");
    return routeItems(data.items, {
      supabase: context.supabase,
      workspaceId: ws.id,
      currency: data.currency,
    });
  });

/**
 * Source live offers for one quote line: classify it, route + fetch + cache via
 * the router, then return the cached offers (with the unit price at this line's
 * quantity) for the offer-comparison drawer. Best (cheapest) offer first.
 */
export const priceQuoteLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ lineItemId: z.string().uuid(), currency: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: line } = await supabase
      .from("quote_line_items")
      .select("id, description, brand, model, mpn, qty, workspace_id")
      .eq("id", data.lineItemId)
      .maybeSingle();
    if (!line) throw new Error("Line item not found");

    const classified = classifyItem({
      description: line.description,
      brand: line.brand,
      model: line.model,
      mpn: line.mpn,
    });
    const identifier = classified.mpn ?? (line.description ?? "").trim();
    const qty = Number(line.qty) || 1;

    // Fetch + cache offers across the providers for this category.
    await routeItems(
      [
        {
          description: line.description,
          brand: line.brand,
          model: line.model,
          mpn: line.mpn ?? undefined,
          qty,
        },
      ],
      { supabase, workspaceId: line.workspace_id, currency: data.currency },
    );

    const { data: rows } = await supabase
      .from("provider_offers")
      .select(
        "id, distributor_name, stock_qty, moq, lead_time_days, price_breaks, currency, buy_url, sourcing_providers(key, name)",
      )
      .eq("workspace_id", line.workspace_id)
      .eq("identifier", identifier);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offers = ((rows ?? []) as any[])
      .map((r) => {
        const at = priceAtQty(r.price_breaks, qty);
        const prov = Array.isArray(r.sourcing_providers) ? r.sourcing_providers[0] : r.sourcing_providers;
        return {
          offerId: r.id as string,
          provider: prov?.name ?? prov?.key ?? "",
          distributor: r.distributor_name as string | null,
          stockQty: r.stock_qty as number | null,
          moq: r.moq as number | null,
          leadTimeDays: r.lead_time_days as number | null,
          unitCost: at?.price ?? null,
          currency: at?.currency ?? r.currency ?? null,
          buyUrl: r.buy_url as string | null,
        };
      })
      .filter((o) => o.unitCost != null)
      .sort((a, b) => (a.unitCost as number) - (b.unitCost as number));

    return {
      identifier,
      category: classified.category,
      qty,
      offers,
      suggestedOfferId: offers[0]?.offerId ?? null,
    };
  });
