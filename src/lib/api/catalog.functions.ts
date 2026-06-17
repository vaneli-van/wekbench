import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";
import { convertAmount } from "@/lib/fx.server";
import { recomputeQuoteTotals } from "./quotes.functions";

const DEFAULT_MARGIN_PCT = 18;

/** Search the workspace catalogue (for the quote builder picker). */
export const searchCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("catalog_items")
      .select("id, sku, brand, model, category, unit, description, unit_price, currency")
      .order("description", { ascending: true })
      .limit(50);
    const term = (data.query ?? "").trim();
    if (term) {
      const safe = term.replace(/[%,()]/g, " ");
      q = q.or(
        `description.ilike.%${safe}%,brand.ilike.%${safe}%,model.ilike.%${safe}%,sku.ilike.%${safe}%,category.ilike.%${safe}%`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

/** Add a quote line item pre-filled from a catalogue item (FX-converted to quote currency). */
export const addQuoteLineFromCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quoteId: z.string().uuid(),
        catalogItemId: z.string().uuid(),
        qty: z.number().positive().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const wsId = await resolveWorkspaceId(supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");

    const { data: item } = await supabase
      .from("catalog_items")
      .select("id, description, brand, model, unit, unit_price, currency")
      .eq("id", data.catalogItemId)
      .maybeSingle();
    if (!item) throw new Error("Catalog item not found");

    const { data: quote } = await supabase
      .from("quotes")
      .select("currency")
      .eq("id", data.quoteId)
      .maybeSingle();
    const targetCurrency = (quote?.currency && String(quote.currency).trim()) || "GHS";

    const srcCurrency = item.currency || targetCurrency;
    let unitCost = Number(item.unit_price ?? 0);
    let fxRate = 1;
    if (item.unit_price != null) {
      const conv = await convertAmount(Number(item.unit_price), srcCurrency, targetCurrency);
      if (conv) {
        unitCost = Number(conv.amount.toFixed(4));
        fxRate = conv.rate;
      }
    }
    const unitPrice = Number((unitCost * (1 + DEFAULT_MARGIN_PCT / 100)).toFixed(4));

    const { data: maxRow } = await supabase
      .from("quote_line_items")
      .select("line_no")
      .eq("quote_id", data.quoteId)
      .order("line_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNo = (maxRow?.line_no ?? 0) + 1;

    const { error } = await supabase
      .from("quote_line_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        quote_id: data.quoteId,
        workspace_id: wsId,
        line_no: nextNo,
        description: item.description,
        brand: item.brand,
        model: item.model,
        unit: item.unit,
        qty: data.qty ?? 1,
        unit_cost: unitCost,
        unit_price: unitPrice,
        margin_pct: DEFAULT_MARGIN_PCT,
        source: "catalog",
        catalog_item_id: item.id,
        source_currency: srcCurrency,
        source_unit_cost: item.unit_price,
        fx_rate: fxRate,
        price_fetched_at: new Date().toISOString(),
      } as any);
    if (error) throw new Error(error.message);

    if (!quote?.currency) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("quotes").update({ currency: targetCurrency } as any).eq("id", data.quoteId);
    }
    await recomputeQuoteTotals(supabase, data.quoteId);
    return { ok: true };
  });
