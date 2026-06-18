// Stock in the Channel sourcing adapter. SERVER ONLY.
//
// Backed by our own `sitc_catalogue` table (a cloud-hosted copy of SITC's catalogue
// feed, refreshed by the scheduled FTP→Supabase sync — scripts/sync-sitc.mjs). We query
// that table instead of the live OAuth GraphQL API, so no per-call key/quota is needed
// and lookups are fast. Each product's 1st–5th cheapest distributors become offers.
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

import type { NormalizedOffer, NormalizedPart, SourcingAdapter, SourcingMatchInput, SourcingSearchInput } from "./types";

const CURRENCY = "GBP"; // SITC is a UK platform; price/cost are GBP.

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SITC catalogue lookup needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server env.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Strip characters that would break a PostgREST ilike/or filter.
function sanitize(q: string): string {
  return q.replace(/[,%()*]/g, " ").trim();
}

const SELECT = "sitc_id, sku, brand, name, stock, price, image_url, distributors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): NormalizedPart {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dists: any[] = Array.isArray(r.distributors) ? r.distributors : [];
  const offers: NormalizedOffer[] = dists.length
    ? dists.map((d) => {
        const price = num(d.price);
        return {
          distributorName: d.name ?? "Stock in the Channel",
          distributorExternalId: d.id != null ? String(d.id) : null,
          distributorSku: d.sku ?? r.sku ?? null,
          stockQty: num(d.stock),
          moq: null,
          orderMultiple: null,
          packaging: null,
          leadTimeDays: null,
          priceBreaks: price != null && price > 0 ? [{ quantity: 1, price, currency: CURRENCY }] : [],
          buyUrl: null,
          isAuthorised: null,
        } satisfies NormalizedOffer;
      })
    : [
        {
          distributorName: "Stock in the Channel",
          distributorExternalId: null,
          distributorSku: r.sku ?? null,
          stockQty: num(r.stock),
          moq: null,
          orderMultiple: null,
          packaging: null,
          leadTimeDays: null,
          priceBreaks: num(r.price) != null && num(r.price)! > 0 ? [{ quantity: 1, price: num(r.price)!, currency: CURRENCY }] : [],
          buyUrl: null,
          isAuthorised: null,
        },
      ];
  return {
    externalPartId: r.sitc_id != null ? String(r.sitc_id) : null,
    mpn: r.sku ?? null,
    manufacturer: r.brand ?? null,
    lifecycleStatus: null,
    datasheetUrl: null,
    imageUrl: r.image_url ?? null,
    offers,
  } satisfies NormalizedPart;
}

export const stockInTheChannelAdapter: SourcingAdapter = {
  key: "stockinthechannel",
  kind: "api",
  categories: ["it_hardware"],
  async matchByMpn(input: SourcingMatchInput): Promise<NormalizedPart[]> {
    if (!input.mpn) return [];
    const sku = sanitize(input.mpn);
    if (!sku) return [];
    const { data } = await client().from("sitc_catalogue").select(SELECT).ilike("sku", sku).limit(input.limit ?? 10);
    return (data ?? []).map(mapRow);
  },
  async search(input: SourcingSearchInput): Promise<NormalizedPart[]> {
    const q = sanitize(input.query ?? "");
    if (!q) return [];
    const { data } = await client()
      .from("sitc_catalogue")
      .select(SELECT)
      .or(`sku.ilike.%${q}%,name.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(input.limit ?? 10);
    return (data ?? []).map(mapRow);
  },
};
