// Nexar (Octopart) sourcing adapter. SERVER ONLY — never import from client code.
//
// Auth: OAuth2 client-credentials. Token endpoint returns a 24h token which we
// cache in-memory (best-effort per isolate). Env is read INSIDE functions because
// on Cloudflare Workers env binds at request time, not module load.
//
// Required env (set server-side, never committed):
//   NEXAR_CLIENT_ID
//   NEXAR_CLIENT_SECRET
//   NEXAR_SCOPE        (optional, defaults to "supply.domain")
import process from "node:process";

import type {
  NormalizedOffer,
  NormalizedPart,
  NormalizedPriceBreak,
  SourcingAdapter,
  SourcingMatchInput,
  SourcingSearchInput,
} from "./types";

const TOKEN_URL = "https://identity.nexar.com/connect/token";
const GRAPHQL_URL = "https://api.nexar.com/graphql/";

// Best-effort in-memory token cache (per warm isolate).
let cachedToken: { value: string; expiresAt: number } | null = null;

function getCreds() {
  const clientId = process.env.NEXAR_CLIENT_ID;
  const clientSecret = process.env.NEXAR_CLIENT_SECRET;
  const scope = process.env.NEXAR_SCOPE || "supply.domain";
  if (!clientId || !clientSecret) {
    throw new Error(
      "Nexar credentials missing. Set NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET in the server environment.",
    );
  }
  return { clientId, clientSecret, scope };
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }
  const { clientId, clientSecret, scope } = getCreds();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Nexar token request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Nexar token response had no access_token");
  const ttlMs = (json.expires_in ?? 86_400) * 1000;
  cachedToken = { value: json.access_token, expiresAt: now + ttlMs };
  return json.access_token;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getToken();
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Nexar GraphQL request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Nexar GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("Nexar GraphQL returned no data");
  return json.data;
}

// ---- GraphQL shapes (only the fields we request) ----
type NexarPrice = {
  quantity: number | null;
  price: number | null;
  currency: string | null;
  convertedPrice: number | null;
  convertedCurrency: string | null;
};
type NexarOffer = {
  sku: string | null;
  inventoryLevel: number | null;
  moq: number | null;
  orderMultiple: number | null;
  packaging: string | null;
  factoryLeadDays: number | null;
  clickUrl: string | null;
  prices: NexarPrice[] | null;
};
type NexarSeller = {
  company: { id: string | null; name: string | null } | null;
  offers: NexarOffer[] | null;
};
type NexarPart = {
  id: string | null;
  mpn: string | null;
  manufacturer: { name: string | null } | null;
  octopartUrl: string | null;
  sellers: NexarSeller[] | null;
};

const PART_FIELDS = `
  id
  mpn
  manufacturer { name }
  octopartUrl
  sellers {
    company { id name }
    offers {
      sku
      inventoryLevel
      moq
      orderMultiple
      packaging
      factoryLeadDays
      clickUrl
      prices { quantity price currency convertedPrice convertedCurrency }
    }
  }
`;

const MULTI_MATCH = `
query NexarMatch($queries: [SupPartMatchQuery!]!, $currency: String) {
  supMultiMatch(queries: $queries, currency: $currency) {
    parts {
${PART_FIELDS}
    }
  }
}`;

const SEARCH_MPN = `
query NexarSearch($q: String!, $limit: Int, $currency: String, $country: String) {
  supSearchMpn(q: $q, limit: $limit, currency: $currency, country: $country) {
    results {
      part {
${PART_FIELDS}
      }
    }
  }
}`;

function normalizePart(p: NexarPart | null): NormalizedPart | null {
  if (!p) return null;
  const offers: NormalizedOffer[] = [];
  for (const seller of p.sellers ?? []) {
    const distributorName = seller.company?.name ?? "Unknown";
    for (const o of seller.offers ?? []) {
      const priceBreaks: NormalizedPriceBreak[] = (o.prices ?? [])
        .filter((pr) => pr.price != null && pr.quantity != null)
        .map((pr) => ({
          quantity: Number(pr.quantity),
          price: Number(pr.price),
          currency: pr.currency ?? "USD",
          convertedPrice: pr.convertedPrice,
          convertedCurrency: pr.convertedCurrency,
        }));
      offers.push({
        distributorName,
        distributorExternalId: seller.company?.id ?? null,
        distributorSku: o.sku,
        stockQty: o.inventoryLevel,
        moq: o.moq,
        orderMultiple: o.orderMultiple,
        packaging: o.packaging,
        leadTimeDays: o.factoryLeadDays,
        priceBreaks,
        buyUrl: o.clickUrl,
        isAuthorised: null, // Nexar does not flag authorization directly here
      });
    }
  }
  return {
    externalPartId: p.id,
    mpn: p.mpn,
    manufacturer: p.manufacturer?.name ?? null,
    lifecycleStatus: null,
    datasheetUrl: p.octopartUrl, // link out; richer datasheet field added later
    offers,
  };
}

export const nexarAdapter: SourcingAdapter = {
  key: "nexar",
  kind: "api",
  categories: ["electronic_component"],

  async matchByMpn(input: SourcingMatchInput): Promise<NormalizedPart[]> {
    const data = await gql<{ supMultiMatch: Array<{ parts: NexarPart[] | null }> | null }>(
      MULTI_MATCH,
      {
        queries: [{ mpn: input.mpn, limit: input.limit ?? 1 }],
        currency: input.currency ?? "USD",
      },
    );
    const parts: NexarPart[] = [];
    for (const group of data.supMultiMatch ?? []) {
      for (const part of group.parts ?? []) parts.push(part);
    }
    return parts.map(normalizePart).filter((p): p is NormalizedPart => p !== null);
  },

  async search(input: SourcingSearchInput): Promise<NormalizedPart[]> {
    const data = await gql<{
      supSearchMpn: { results: Array<{ part: NexarPart | null }> | null } | null;
    }>(SEARCH_MPN, {
      q: input.query,
      limit: input.limit ?? 5,
      currency: input.currency ?? "USD",
      country: input.country ?? "US",
    });
    const parts = (data.supSearchMpn?.results ?? []).map((r) => r.part);
    return parts.map(normalizePart).filter((p): p is NormalizedPart => p !== null);
  },
};
