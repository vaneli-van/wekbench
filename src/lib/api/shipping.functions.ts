import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { convertAmount } from "@/lib/fx.server";
import { routeShipping } from "@/lib/shipping/router.server";
import type { ShippingRateInput } from "@/lib/shipping/types";
import { resolveWorkspaceId } from "./workspace.functions";
import { recomputeQuoteTotals } from "./quotes.functions";

const addressSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(2),
  zip: z.string().optional(),
});

const parcelSchema = z.object({
  weightKg: z.number().positive(),
  lengthCm: z.number().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
  description: z.string().optional(),
  valueAmount: z.number().optional(),
  valueCurrency: z.string().optional(),
});

/** Fan out to enabled courier providers and return merged, sorted rates. */
export const getShippingRates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        origin: addressSchema,
        destination: addressSchema,
        parcel: parcelSchema,
        currency: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const input: ShippingRateInput = {
      origin: data.origin,
      destination: data.destination,
      parcel: data.parcel,
      currency: data.currency || "GHS",
    };
    const { rates, providers } = await routeShipping(input, {
      supabase: context.supabase,
      workspaceId: wsId,
    });
    return { rates, providers };
  });

/** Attach a chosen rate to a quote: store provenance + write a freight line. */
export const applyShipmentToQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        quoteId: z.string().uuid(),
        providerSlug: z.string().optional(),
        carrierName: z.string().min(1),
        carrierLogo: z.string().optional().nullable(),
        service: z.string().optional().nullable(),
        amount: z.number(), // carrier's amount in its currency
        currency: z.string().min(1), // carrier's currency
        etaText: z.string().optional().nullable(),
        etaMinutes: z.number().optional().nullable(),
        includesInsurance: z.boolean().optional().nullable(),
        bookable: z.boolean().optional(),
        rateRef: z.string().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const wsId = await resolveWorkspaceId(supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");

    const { data: quote } = await supabase
      .from("quotes")
      .select("currency")
      .eq("id", data.quoteId)
      .maybeSingle();
    const targetCurrency = (quote?.currency && String(quote.currency).trim()) || "GHS";

    const conv = await convertAmount(data.amount, data.currency, targetCurrency);
    const converted = conv ? Number(conv.amount.toFixed(2)) : data.amount;
    const fxRate = conv?.rate ?? 1;

    // One shipment per quote — replace any prior one.
    await supabase.from("quote_shipments").delete().eq("quote_id", data.quoteId);
    const { error: shipErr } = await supabase
      .from("quote_shipments")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: wsId,
        quote_id: data.quoteId,
        provider_slug: data.providerSlug ?? null,
        mode: "courier",
        carrier_name: data.carrierName,
        carrier_logo: data.carrierLogo ?? null,
        service: data.service ?? null,
        amount: converted,
        currency: targetCurrency,
        source_amount: data.amount,
        source_currency: data.currency,
        fx_rate: fxRate,
        eta_text: data.etaText ?? null,
        eta_minutes: data.etaMinutes ?? null,
        includes_insurance: data.includesInsurance ?? null,
        bookable: data.bookable ?? true,
        rate_ref: data.rateRef ?? null,
      } as any);
    if (shipErr) throw new Error(shipErr.message);

    // Replace any existing shipping line, then add a fresh one so it flows
    // into the quote totals and PDF.
    await supabase
      .from("quote_line_items")
      .delete()
      .eq("quote_id", data.quoteId)
      .eq("line_type", "shipping");
    const { data: maxRow } = await supabase
      .from("quote_line_items")
      .select("line_no")
      .eq("quote_id", data.quoteId)
      .order("line_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNo = (maxRow?.line_no ?? 0) + 1;
    const desc = [data.carrierName, data.service].filter(Boolean).join(" · ");
    const { error: liErr } = await supabase
      .from("quote_line_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        quote_id: data.quoteId,
        workspace_id: wsId,
        line_no: nextNo,
        line_type: "shipping",
        section: "Shipping",
        description: desc || "Shipping",
        qty: 1,
        unit_cost: converted,
        unit_price: converted,
        margin_pct: 0,
        source: "shipping",
        source_currency: data.currency,
        source_unit_cost: data.amount,
        fx_rate: fxRate,
        price_fetched_at: new Date().toISOString(),
      } as any);
    if (liErr) throw new Error(liErr.message);

    // If the quote had no currency, lock it to the conversion target.
    if (!quote?.currency) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from("quotes").update({ currency: targetCurrency } as any).eq("id", data.quoteId);
    }
    await recomputeQuoteTotals(supabase, data.quoteId);
    return { ok: true, amount: converted, currency: targetCurrency, carrier: data.carrierName };
  });

/** The shipment currently attached to a quote (if any). */
export const listQuoteShipments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quoteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("quote_shipments")
      .select(
        "id, provider_slug, mode, carrier_name, carrier_logo, service, amount, currency, source_amount, source_currency, fx_rate, eta_text, includes_insurance, bookable, rate_ref, created_at",
      )
      .eq("quote_id", data.quoteId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { shipments: rows ?? [] };
  });

/** Remove the attached shipment and its freight line. */
export const deleteQuoteShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quoteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await supabase.from("quote_shipments").delete().eq("quote_id", data.quoteId);
    await supabase
      .from("quote_line_items")
      .delete()
      .eq("quote_id", data.quoteId)
      .eq("line_type", "shipping");
    await recomputeQuoteTotals(supabase, data.quoteId);
    return { ok: true };
  });
