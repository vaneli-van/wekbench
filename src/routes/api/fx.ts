import { createFileRoute } from "@tanstack/react-router";

// Free, no-key, CDN-hosted FX source (fast & reliable from Cloudflare Workers).
// Includes the Ghana Cedi (GHS). Rates are USD-based; we express each currency
// as its value in GHS.
const PRIMARY = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
const SECONDARY = "https://latest.currency-api.pages.dev/v1/currencies/usd.json";
const CODES = ["USD", "EUR", "GBP", "CNY", "ZAR", "AED"] as const;

const FALLBACK_PER_UNIT_GHS: Record<string, number> = {
  USD: 15.5,
  EUR: 16.8,
  GBP: 19.7,
  CNY: 2.15,
  ZAR: 0.85,
  AED: 4.22,
};

type Rate = { code: string; perUnitInGhs: number; perGhs: number };

function indicative() {
  const rates: Rate[] = CODES.map((code) => ({
    code,
    perUnitInGhs: FALLBACK_PER_UNIT_GHS[code],
    perGhs: 1 / FALLBACK_PER_UNIT_GHS[code],
  }));
  return Response.json({ base: "GHS", updated: new Date().toISOString(), live: false, rates });
}

// Fetch with a hard timeout so a slow/blocked upstream can never hang the route.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJson(url: string): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/api/fx")({
  server: {
    handlers: {
      GET: async () => {
        const json = (await fetchJson(PRIMARY)) ?? (await fetchJson(SECONDARY));
        const usd = json?.usd;
        const ghsPerUsd = usd ? Number(usd.ghs) : 0;
        if (!usd || !ghsPerUsd) return indicative();

        const rates: Rate[] = [];
        for (const code of CODES) {
          const perUsd = Number(usd[code.toLowerCase()]); // units of `code` per 1 USD
          if (!perUsd) continue;
          const perUnitInGhs = ghsPerUsd / perUsd; // GHS per 1 unit of `code`
          rates.push({ code, perUnitInGhs, perGhs: 1 / perUnitInGhs });
        }
        if (rates.length === 0) return indicative();

        return Response.json({
          base: "GHS",
          updated: new Date().toISOString(),
          live: true,
          rates,
        });
      },
    },
  },
});
