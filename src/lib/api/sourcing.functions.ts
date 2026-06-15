import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nexarAdapter } from "@/lib/sourcing/nexar.server";
import { routeItems } from "@/lib/sourcing/router.server";

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
