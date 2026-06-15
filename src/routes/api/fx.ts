import { createFileRoute } from "@tanstack/react-router";

// Free, no-key FX source that includes the Ghana Cedi (GHS).
// We fetch USD-based rates and express each currency as its value in GHS.
const UPSTREAM = "https://open.er-api.com/v6/latest/USD";
const CODES = ["USD", "EUR", "GBP", "CNY", "ZAR", "AED"] as const;

// Indicative fallback (only used if the live source is unreachable).
const FALLBACK_PER_UNIT_GHS: Record<string, number> = {
  USD: 15.5,
  EUR: 16.8,
  GBP: 19.7,
  CNY: 2.15,
  ZAR: 0.85,
  AED: 4.22,
};

type Rate = { code: string; perUnitInGhs: number; perGhs: number };

function fallbackResponse() {
  const rates: Rate[] = CODES.map((code) => ({
    code,
    perUnitInGhs: FALLBACK_PER_UNIT_GHS[code],
    perGhs: 1 / FALLBACK_PER_UNIT_GHS[code],
  }));
  return Response.json({ base: "GHS", updated: new Date().toISOString(), live: false, rates });
}

export const Route = createFileRoute("/api/fx")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch(UPSTREAM, { headers: { Accept: "application/json" } });
          if (!res.ok) return fallbackResponse();
          const json = (await res.json()) as {
            result?: string;
            rates?: Record<string, number>;
            time_last_update_utc?: string;
          };
          const r = json.rates ?? {};
          const ghsPerUsd = Number(r.GHS);
          if (json.result !== "success" || !ghsPerUsd) return fallbackResponse();

          const rates: Rate[] = [];
          for (const code of CODES) {
            const perUsd = Number(r[code]); // units of `code` per 1 USD
            if (!perUsd) continue;
            const perUnitInGhs = ghsPerUsd / perUsd; // GHS per 1 unit of `code`
            rates.push({ code, perUnitInGhs, perGhs: 1 / perUnitInGhs });
          }
          if (rates.length === 0) return fallbackResponse();

          return Response.json({
            base: "GHS",
            updated: json.time_last_update_utc ?? new Date().toISOString(),
            live: true,
            rates,
          });
        } catch {
          return fallbackResponse();
        }
      },
    },
  },
});
