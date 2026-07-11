/**
 * Server-only: Zonos Landed Cost client.
 * Calls the Zonos GraphQL API to get real duties + taxes + fees for an import, replacing
 * our flat % estimate when ZONOS_API_KEY is configured. FAILS SAFE — any error / missing
 * key returns null, and the caller falls back to the % estimate. The app never breaks if
 * Zonos is down, unconfigured, or the account isn't approved.
 *
 * NOTE: the GraphQL below follows Zonos' documented landed-cost workflow shape
 * (calculationMethod + endUse + items + shipTo). Validate the exact field names against
 * your account's Zonos Postman collection once you have a key — because we fail safe,
 * a schema mismatch just falls back to the estimate rather than erroring.
 */
import process from "node:process";

const ZONOS_ENDPOINT = "https://api.zonos.com/graphql";

export type ZonosItemInput = {
  amount: number; // unit value in `currency`
  quantity: number;
  description?: string | null;
  hsCode?: string | null;
  countryOfOrigin?: string | null; // ISO-2, e.g. "US"
};

export type ZonosLandedCostInput = {
  items: ZonosItemInput[];
  destinationCountry: string; // ISO-2, e.g. "GH"
  originCountry?: string; // ISO-2 default "US"
  currency: string; // e.g. "USD"
  freight?: number; // shipment/freight amount in `currency`, optional
  forResale?: boolean;
};

export type ZonosLandedCostResult = {
  duties: number;
  taxes: number;
  fees: number;
  currency: string;
};

export function zonosConfigured(): boolean {
  return !!process.env.ZONOS_API_KEY;
}

// Sum a Zonos "amountSubtotals" list (["duties"|"taxes"|"fees"|...] with amounts),
// tolerating a few shapes so a minor schema drift still parses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readSubtotals(node: any): ZonosLandedCostResult | null {
  if (!node) return null;
  const currency = node.currency || node.currencyCode || "USD";
  const acc = { duties: 0, taxes: 0, fees: 0 };
  let matched = false;
  const subtotals = node.amountSubtotals || node.subtotals;
  if (Array.isArray(subtotals)) {
    for (const s of subtotals) {
      const t = String(s.type || s.name || "").toLowerCase();
      const amt = Number(s.amount ?? s.value ?? 0);
      if (!Number.isFinite(amt)) continue;
      if (t.includes("dut")) { acc.duties += amt; matched = true; }
      else if (t.includes("tax") || t.includes("vat")) { acc.taxes += amt; matched = true; }
      else if (t.includes("fee")) { acc.fees += amt; matched = true; }
    }
  }
  // Fallback: explicit arrays/objects
  const sumList = (v: unknown): number =>
    Array.isArray(v) ? v.reduce((s, x) => s + Number((x as { amount?: number }).amount ?? 0), 0) : Number((v as { amount?: number })?.amount ?? v ?? 0);
  if (!matched) {
    if (node.duties != null) { acc.duties = sumList(node.duties); matched = true; }
    if (node.taxes != null) { acc.taxes = sumList(node.taxes); matched = true; }
    if (node.fees != null) { acc.fees = sumList(node.fees); matched = true; }
  }
  if (!matched) return null;
  return { duties: acc.duties, taxes: acc.taxes, fees: acc.fees, currency };
}

export async function computeZonosLandedCost(
  input: ZonosLandedCostInput,
): Promise<ZonosLandedCostResult | null> {
  const token = process.env.ZONOS_API_KEY;
  if (!token) return null;
  if (!input.items.length) return null;

  const query = `mutation LandedCost($input: LandedCostCalculateWorkflowInput!) {
    landedCostCalculateWorkflow(input: $input) {
      id
      currency
      amountSubtotals { type amount currency }
    }
  }`;

  const variables = {
    input: {
      calculationMethod: "DDP",
      endUse: input.forResale ? "FOR_RESALE" : "NOT_FOR_RESALE",
      currencyCode: input.currency,
      shipToCountry: input.destinationCountry,
      shipFromCountry: input.originCountry ?? "US",
      shipmentRating: input.freight != null ? { amount: input.freight, currencyCode: input.currency } : undefined,
      items: input.items.map((it, i) => ({
        id: String(i + 1),
        amount: it.amount,
        currencyCode: input.currency,
        quantity: it.quantity,
        description: it.description ?? "General goods",
        hsCode: it.hsCode ?? undefined,
        countryOfOrigin: it.countryOfOrigin ?? input.originCountry ?? "US",
      })),
    },
  };

  try {
    const res = await fetch(ZONOS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        credentialToken: token,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      console.error("[zonos] HTTP", res.status);
      return null;
    }
    const json = (await res.json()) as { data?: { landedCostCalculateWorkflow?: unknown }; errors?: unknown };
    if (json.errors) {
      console.error("[zonos] GraphQL errors", JSON.stringify(json.errors).slice(0, 500));
      return null;
    }
    return readSubtotals(json.data?.landedCostCalculateWorkflow);
  } catch (e) {
    console.error("[zonos] request failed", e);
    return null;
  }
}
