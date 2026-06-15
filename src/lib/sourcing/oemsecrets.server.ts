// OEMsecrets sourcing adapter. SERVER ONLY — never import from client code.
//
// Auth: a single API key passed as the `apiKey` query param (apply at
// oemsecrets.com/api; approval required). No token exchange.
//
// Required env (set server-side, never committed):
//   OEMSECRETS_API_KEY
//
// The partsearch endpoint returns a `stock` array where each entry is already a
// per-distributor offer, with `prices` keyed by currency.
import process from "node:process";

import type { NormalizedOffer, NormalizedPart, SourcingAdapter } from "./types";

const SEARCH_URL = "https://oemsecretsapi.com/partsearch";

function getApiKey(): string {
  const key = process.env.OEMSECRETS_API_KEY;
  if (!key) {
    throw new Error("OEMsecrets credentials missing. Set OEMSECRETS_API_KEY in the server environment.");
  }
  return key;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StockEntry = Record<string, any>;

function priceBreaksFrom(entry: StockEntry, preferred?: string) {
  const prices = entry.prices ?? {};
  let arr = preferred ? prices[preferred] : undefined;
  if (!arr || arr.length === 0) {
    const firstKey = Object.keys(prices)[0];
    arr = firstKey ? prices[firstKey] : [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Array.isArray(arr) ? arr : []).map((p: any) => ({
    quantity: num(p.unit_break ?? p.quantity ?? p.break) ?? 0,
    price: num(p.unit_price ?? p.price) ?? 0,
    currency: p.currency ?? preferred ?? "USD",
  })).filter((pb) => pb.price > 0);
}

function leadDaysFrom(entry: StockEntry): number | null {
  const weeks = num(entry.lead_time_weeks);
  if (weeks != null) return Math.round(weeks * 7);
  const days = num(entry.lead_time_days);
  if (days != null) return days;
  // Try to parse a string like "10 weeks" / "12 days".
  const lt = String(entry.lead_time ?? "").toLowerCase();
  const m = lt.match(/(\d+)\s*(week|day)/);
  if (m) return m[2] === "week" ? Number(m[1]) * 7 : Number(m[1]);
  return null;
}

function offerFrom(entry: StockEntry, preferred?: string): NormalizedOffer {
  return {
    distributorName:
      entry.distributor?.distributor_name ?? entry.distributor_name ?? "Unknown",
    distributorExternalId: entry.distributor?.distributor_id ?? null,
    distributorSku: entry.sku ?? entry.part_number ?? entry.source_part_number ?? null,
    stockQty: num(entry.quantity_in_stock ?? entry.stock ?? entry.in_stock),
    moq: num(entry.moq ?? entry.min_order_qty ?? entry.minimum_order_quantity),
    orderMultiple: num(entry.order_multiple ?? entry.multiple),
    packaging: entry.packaging ?? null,
    leadTimeDays: leadDaysFrom(entry),
    priceBreaks: priceBreaksFrom(entry, preferred),
    buyUrl: entry.part_url ?? entry.buy_now_url ?? entry.url ?? null,
    isAuthorised: entry.distributor?.authorised ?? null,
  };
}

async function fetchParts(
  term: string,
  currency?: string,
  country?: string,
): Promise<NormalizedPart[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("apiKey", getApiKey());
  url.searchParams.set("searchTerm", term);
  if (currency) url.searchParams.set("currency", currency);
  if (country) url.searchParams.set("countryCode", country);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OEMsecrets request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as StockEntry;
  if (json?.error) throw new Error(`OEMsecrets error: ${String(json.error).slice(0, 200)}`);

  const stock: StockEntry[] = json.stock ?? json.results ?? [];

  // Group per-distributor entries into parts keyed by manufacturer|mpn.
  const byPart = new Map<string, NormalizedPart>();
  for (const entry of stock) {
    const mpn = entry.mpn ?? entry.part_number ?? entry.source_part_number ?? "";
    const manufacturer = entry.manufacturer ?? entry.manufacturer_name ?? null;
    const key = `${manufacturer ?? ""}|${mpn}`;
    let part = byPart.get(key);
    if (!part) {
      part = {
        externalPartId: null,
        mpn: mpn || null,
        manufacturer,
        lifecycleStatus: entry.lifecycle_status ?? null,
        datasheetUrl: entry.datasheet?.url ?? entry.datasheet_url ?? null,
        imageUrl: entry.image_url ?? entry.photo ?? entry.image ?? entry.thumbnail ?? null,
        offers: [],
      };
      byPart.set(key, part);
    }
    part.offers.push(offerFrom(entry, currency));
  }
  return [...byPart.values()];
}

export const oemsecretsAdapter: SourcingAdapter = {
  key: "oemsecrets",
  kind: "api",
  categories: ["electronic_component"],

  async matchByMpn(input) {
    return fetchParts(input.mpn, input.currency, input.country);
  },

  async search(input) {
    return fetchParts(input.query, input.currency, input.country);
  },
};
