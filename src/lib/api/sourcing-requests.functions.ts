/**
 * Buyer side (self-serve concierge): sourcing requests.
 * A buyer lists what they need; priceSourcingRequest runs the existing sourcing router
 * per line and converts each best offer into the buyer's local currency, so they see
 * landed cost to their country. Reuses routeItems + convertAmount — no new pricing plumbing.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";
import { convertAmount } from "@/lib/fx.server";

async function wsId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<string> {
  const id = await resolveWorkspaceId(supabase, userId);
  if (!id) throw new Error("No workspace");
  return id;
}

const itemInput = z.object({
  description: z.string().max(2000).optional(),
  brand: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  mpn: z.string().max(255).optional(),
  qty: z.number().min(0).optional(),
  unit: z.string().max(64).optional(),
});

export const createSourcingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        destinationCountry: z.string().max(120).optional(),
        destinationCity: z.string().max(120).optional(),
        currency: z.string().max(8).optional(),
        notes: z.string().max(2000).optional(),
        items: z.array(itemInput).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const { data: req, error } = await context.supabase
      .from("sourcing_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id,
        title: data.title,
        destination_country: data.destinationCountry ?? null,
        destination_city: data.destinationCity ?? null,
        currency: data.currency ?? "GHS",
        notes: data.notes ?? null,
        status: "draft",
      } as any)
      .select("id")
      .single();
    if (error || !req) throw new Error(error?.message ?? "Could not create request");

    const rows = data.items.map((it, idx) => ({
      request_id: req.id,
      workspace_id,
      line_no: idx + 1,
      description: it.description ?? null,
      brand: it.brand ?? null,
      model: it.model ?? null,
      mpn: it.mpn ?? null,
      qty: it.qty ?? 1,
      unit: it.unit ?? null,
    }));
    const { error: liErr } = await context.supabase.from("sourcing_request_items").insert(rows as never);
    if (liErr) throw new Error(liErr.message);

    try {
      const { emitProductEvent } = await import("@/lib/telemetry.server");
      await emitProductEvent(context.supabase, {
        workspaceId: workspace_id,
        userId: context.userId,
        event: "sourcing_request_created",
        props: { lines: rows.length },
      });
    } catch {
      /* best-effort */
    }
    return { id: req.id as string };
  });

/** Run the sourcing router per line and store best offer + landed (local-currency) price. */
export const priceSourcingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const { data: req } = await context.supabase
      .from("sourcing_requests")
      .select("id, currency, workspace_id")
      .eq("id", data.id)
      .single();
    if (!req) throw new Error("Request not found");
    const { data: items } = await context.supabase
      .from("sourcing_request_items")
      .select("id, line_no, description, brand, model, mpn, qty")
      .eq("request_id", data.id)
      .order("line_no");
    const lines = items ?? [];
    if (lines.length === 0) return { priced: 0, landedSubtotal: 0, currency: req.currency };

    const { routeItems } = await import("@/lib/sourcing/router.server");
    const routed = await routeItems(
      lines.map((li) => ({
        description: li.description,
        brand: li.brand,
        model: li.model,
        mpn: li.mpn,
        qty: Number(li.qty ?? 1),
      })),
      { supabase: context.supabase, workspaceId: req.workspace_id, currency: req.currency },
    );

    let priced = 0;
    let landedSubtotal = 0;
    for (let i = 0; i < lines.length; i++) {
      const li = lines[i];
      const r = routed.items[i];
      // pick the cheapest offer across this line's providers
      let best: { price: number; currency: string; distributor: string } | null = null;
      let offerCount = 0;
      for (const p of r?.providers ?? []) {
        offerCount += p.offerCount ?? 0;
        if (p.bestPrice && (best == null || p.bestPrice.price < best.price)) best = p.bestPrice;
      }
      let converted: number | null = null;
      let rate: number | null = null;
      if (best) {
        const c = await convertAmount(best.price, best.currency, req.currency);
        if (c) {
          converted = c.amount;
          rate = c.rate;
        }
      }
      if (best) {
        priced++;
        landedSubtotal += (converted ?? 0) * Number(li.qty ?? 1);
      }
      await context.supabase
        .from("sourcing_request_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          category: r?.category ?? null,
          best_distributor: best?.distributor ?? null,
          best_price: best?.price ?? null,
          best_currency: best?.currency ?? null,
          converted_unit_price: converted,
          fx_rate: rate,
          offer_count: offerCount,
          item_status: best ? "priced" : "no_offer",
          priced_at: new Date().toISOString(),
        } as any)
        .eq("id", li.id);
    }

    await context.supabase
      .from("sourcing_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: "priced", updated_at: new Date().toISOString() } as any)
      .eq("id", data.id);

    try {
      const { emitProductEvent } = await import("@/lib/telemetry.server");
      await emitProductEvent(context.supabase, {
        workspaceId: workspace_id,
        userId: context.userId,
        event: "sourcing_request_priced",
        props: { lines: lines.length, priced, landed_subtotal: Math.round(landedSubtotal) },
      });
    } catch {
      /* best-effort */
    }
    return { priced, total: lines.length, landedSubtotal, currency: req.currency };
  });

export const getSourcingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: request, error } = await context.supabase
      .from("sourcing_requests")
      .select("id, title, destination_country, destination_city, currency, status, notes, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !request) throw new Error("Request not found");
    const { data: items } = await context.supabase
      .from("sourcing_request_items")
      .select(
        "id, line_no, description, brand, model, mpn, qty, unit, category, best_distributor, best_price, best_currency, converted_unit_price, fx_rate, offer_count, item_status",
      )
      .eq("request_id", data.id)
      .order("line_no");
    return { request, items: items ?? [] };
  });

export const listSourcingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sourcing_requests")
      .select("id, title, destination_country, currency, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });
