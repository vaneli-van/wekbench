import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { PricePoint } from "@/lib/catalog"

export function PricingHistoryChart({ data, currency }: { data: PricePoint[]; currency: string }) {
  // pivot into { date, [supplier]: price }
  const suppliers = Array.from(new Set(data.map((d) => d.supplier)))
  const byDate = new Map<string, Record<string, number | string>>()
  for (const p of data) {
    if (!byDate.has(p.date)) byDate.set(p.date, { date: p.date })
    byDate.get(p.date)![p.supplier] = p.price
  }
  const chartData = Array.from(byDate.values())

  const strokes = ["var(--color-foreground)", "var(--color-muted-foreground)"]

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted-foreground)"
            tickLine={false}
            width={52}
            tickFormatter={(v) => `${currency === "USD" ? "$" : ""}${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {suppliers.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={strokes[i % strokes.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
              strokeDasharray={i === 1 ? "4 3" : undefined}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
