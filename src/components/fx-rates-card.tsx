import useSWR from "swr"
import { TrendingUp, RefreshCw, CircleDot } from "lucide-react"
import { cn } from "@/lib/utils"

type FxRate = { code: string; perGhs: number; perUnitInGhs: number }
type FxResponse = { base: string; updated: string; live: boolean; rates: FxRate[] }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const flagFor: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "Pound Sterling",
  CNY: "Chinese Yuan",
  ZAR: "South African Rand",
  AED: "UAE Dirham",
}

export function FxRatesCard() {
  const { data, isLoading, mutate, isValidating } = useSWR<FxResponse>("/api/fx", fetcher, {
    revalidateOnFocus: false,
  })

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">FX Rates — Ghana Cedi</h2>
            <p className="text-xs text-muted-foreground">1 unit of currency in GHS (₵)</p>
          </div>
        </div>
        <button
          onClick={() => mutate()}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Refresh rates"
        >
          <RefreshCw className={cn("size-4", isValidating && "animate-spin")} />
        </button>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </li>
            ))
          : data?.rates.slice(0, 6).map((rate) => (
              <li key={rate.code} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-10 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground">
                    {rate.code}
                  </span>
                  <span className="text-sm text-muted-foreground">{flagFor[rate.code]}</span>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  ₵{rate.perUnitInGhs.toFixed(rate.perUnitInGhs < 1 ? 4 : 2)}
                </span>
              </li>
            ))}
      </ul>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CircleDot className={cn("size-3", data?.live ? "text-success" : "text-warning")} />
        {data?.live ? "Live rate" : "Indicative rate"} · updated{" "}
        {data?.updated ? new Date(data.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
      </div>
    </section>
  )
}
