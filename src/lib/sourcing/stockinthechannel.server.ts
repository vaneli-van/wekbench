// Stock in the Channel (SITC) Catalogue API sourcing adapter. SERVER ONLY.
//
// Auth: OAuth 2.0 client credentials. Get a Bearer token from the token endpoint,
// cache it (valid 60 min), reuse until near expiry.
//   Required env: SITC_CLIENT_ID, SITC_CLIENT_SECRET
//
// Data: GraphQL `products` query returns paginated IT products with stock + cost
// + sell price. We map each product to one NormalizedOffer (the SITC best cost).
import process from "node:process";

import type { NormalizedPart, SourcingAdapter, SourcingMatchInput, SourcingSearchInput } from "./types";

const TOKEN_URL = "https://accounts.stockinthechannel.co.uk/connect/token";
const GRAPHQL_URL = "https://catalogues.stockinthechannel.co.uk/api/graphql/";
const CURRENCY = "GBP"; // SITC is a UK platform; cost/price are GBP.

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const clientId = process.env.SITC_CLIENT_ID;
  const clientSecret = process.env.SITC_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Stock in the Channel credentials missing. Set SITC_CLIENT_ID and SITC_CLIENT_SECRET in the server environment.",
    );
  }
  // Reuse cached token until 60s before expiry.
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "catalogue",
    }).toString(),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`SITC auth failed (${res.status})${t ? `: ${t.slice(0, 160)}` : ""}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json()) as any;
  const token = json?.access_token;
  if (!token) throw new Error("SITC auth returned no access_token");
  const expiresIn = Number(json?.expires_in ?? 3600);
  tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function queryProducts(term: string, limit: number): Promise<NormalizedPart[]> {
  const token = await getToken();
  const pageSize = Math.max(1, Math.min(limit || 10, 50));
  // Inline GraphQL request; JSON.stringify produces a safe GraphQL string literal.
  const gql =
    `query { products(request: { page: 1, pageSize: ${pageSize}, query: ${JSON.stringify(term)} }) ` +
    `{ count data { id sku brand title shortDescription imageUrl totalStock selectedCost calculatedPrice } } }`;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(`SITC search failed (${res.status})`);
  if (json?.errors?.length) throw new Error(`SITC: ${json.errors[0]?.message ?? "GraphQL error"}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (json?.data?.products?.data ?? []) as any[];
  return rows.map((p) => {
    const cost = num(p.selectedCost);
    return {
      externalPartId: p.id != null ? String(p.id) : null,
      mpn: p.sku ?? null,
      manufacturer: p.brand ?? null,
      lifecycleStatus: null,
      datasheetUrl: null,
      imageUrl: p.imageUrl ?? null,
      offers: [
        {
          distributorName: "Stock in the Channel",
          distributorExternalId: null,
          distributorSku: p.sku ?? null,
          stockQty: num(p.totalStock),
          moq: null,
          orderMultiple: null,
          packaging: null,
          leadTimeDays: null,
          priceBreaks: cost != null && cost > 0 ? [{ quantity: 1, price: cost, currency: CURRENCY }] : [],
          buyUrl: null,
          isAuthorised: null,
        },
      ],
    } satisfies NormalizedPart;
  });
}

export const stockInTheChannelAdapter: SourcingAdapter = {
  key: "stockinthechannel",
  kind: "api",
  categories: ["it_hardware"],
  async matchByMpn(input: SourcingMatchInput): Promise<NormalizedPart[]> {
    if (!input.mpn) return [];
    return queryProducts(input.mpn, input.limit ?? 10);
  },
  async search(input: SourcingSearchInput): Promise<NormalizedPart[]> {
    if (!input.query) return [];
    return queryProducts(input.query, input.limit ?? 10);
  },
};
