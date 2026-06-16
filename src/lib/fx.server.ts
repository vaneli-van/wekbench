// Server-side FX conversion using the same free CDN source as /api/fx.
// SERVER ONLY. Rates are USD-based; cached in-memory per isolate.
const PRIMARY = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
const SECONDARY = "https://latest.currency-api.pages.dev/v1/currencies/usd.json";
const TTL_MS = 60 * 60 * 1000; // 1h

let cache: { at: number; usd: Record<string, number> } | null = null;

async function getUsdRates(): Promise<Record<string, number> | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.usd;
  for (const url of [PRIMARY, SECONDARY]) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = (await res.json()) as { usd?: Record<string, number> };
      if (json?.usd) {
        cache = { at: Date.now(), usd: json.usd };
        return json.usd;
      }
    } catch {
      // try next
    }
  }
  return cache?.usd ?? null;
}

/**
 * Convert an amount between currencies. Returns the converted amount and the
 * applied rate (target per source). Returns rate 1 when currencies match, and
 * null only if rates are unavailable for an actual cross-currency conversion.
 */
export async function convertAmount(
  amount: number,
  from: string | null | undefined,
  to: string | null | undefined,
): Promise<{ amount: number; rate: number } | null> {
  const f = (from || "USD").trim().toLowerCase();
  const t = (to || "USD").trim().toLowerCase();
  if (f === t) return { amount, rate: 1 };
  const usd = await getUsdRates();
  if (!usd) return null;
  const fu = Number(usd[f]);
  const tu = Number(usd[t]);
  if (!fu || !tu) return null;
  const rate = tu / fu; // target units per 1 source unit
  return { amount: amount * rate, rate };
}
