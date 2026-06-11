import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { week: "Wk 1", quotes: 6 },
  { week: "Wk 2", quotes: 9 },
  { week: "Wk 3", quotes: 7 },
  { week: "Wk 4", quotes: 12 },
  { week: "Wk 5", quotes: 10 },
]

const config = {
  quotes: { label: "Quotes sent", color: "hsl(var(--primary))" },
}

export function QuotesPerWeekChart() {
  return (
    <ChartContainer config={config} className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="quotes"
            stroke="var(--color-quotes)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-quotes)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
