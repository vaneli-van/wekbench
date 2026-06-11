import { Ship, Plane, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { shippingRates } from "@/lib/data"
import { cn } from "@/lib/utils"

const trendConf = {
  up: { icon: TrendingUp, cls: "text-destructive" },
  down: { icon: TrendingDown, cls: "text-success" },
  flat: { icon: Minus, cls: "text-muted-foreground" },
}

export function ShippingRatesCard() {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-md bg-accent/10 text-accent">
          <Ship className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Shipping Line Rates</h2>
          <p className="text-xs text-muted-foreground">Indicative freight into Ghana</p>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {shippingRates.map((r) => {
          const Trend = trendConf[r.trend].icon
          const ModeIcon = r.mode === "Air" ? Plane : Ship
          return (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-md border border-border bg-background/60 p-2.5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <ModeIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.lane}</p>
                <p className="text-xs text-muted-foreground">
                  {r.mode} · {r.transitDays}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  ${r.rate.toLocaleString()}
                </p>
                <div className={cn("flex items-center justify-end gap-1 text-[11px]", trendConf[r.trend].cls)}>
                  <Trend className="size-3" />
                  {r.changePct}% <span className="text-muted-foreground">{r.unit}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
