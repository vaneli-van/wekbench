import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart, Cell, Pie, PieChart } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

const rfqVolume = [
  { month: "Jan", rfqs: 28, quotes: 22 },
  { month: "Feb", rfqs: 34, quotes: 27 },
  { month: "Mar", rfqs: 41, quotes: 33 },
  { month: "Apr", rfqs: 38, quotes: 31 },
  { month: "May", rfqs: 47, quotes: 39 },
  { month: "Jun", rfqs: 52, quotes: 44 },
]

const cycleTime = [
  { month: "Jan", hours: 9.2 },
  { month: "Feb", hours: 8.1 },
  { month: "Mar", hours: 7.4 },
  { month: "Apr", hours: 6.8 },
  { month: "May", hours: 5.9 },
  { month: "Jun", hours: 5.2 },
]

const sectorMix = [
  { sector: "Financial Services", value: 34, fill: "hsl(var(--chart-1))" },
  { sector: "Healthcare", value: 24, fill: "hsl(var(--chart-2))" },
  { sector: "Manufacturing", value: 21, fill: "hsl(var(--chart-3))" },
  { sector: "Logistics", value: 13, fill: "hsl(var(--chart-4))" },
  { sector: "Telecom", value: 8, fill: "hsl(var(--chart-5))" },
]

const kpis = [
  { label: "Win rate", value: "62%", change: "+4.2%", up: true },
  { label: "Avg. cycle time", value: "5.2h", change: "-1.6h", up: true },
  { label: "Avg. margin", value: "18.4%", change: "+0.9%", up: true },
  { label: "Quote-to-order", value: "71%", change: "-2.1%", up: false },
]

function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Reports & Analytics"
        description="Operational performance across the RFQ-to-order lifecycle. Last 6 months."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                k.up ? "text-success" : "text-destructive"
              }`}
            >
              {k.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {k.change} vs last period
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">RFQ volume vs quotes issued</h3>
          <p className="text-sm text-muted-foreground">Monthly inbound RFQs and quotes generated</p>
          <ChartContainer
            className="mt-4 h-64 w-full"
            config={{
              rfqs: { label: "RFQs", color: "hsl(var(--chart-1))" },
              quotes: { label: "Quotes", color: "hsl(var(--chart-2))" },
            }}
          >
            <BarChart data={rfqVolume}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="rfqs" fill="var(--color-rfqs)" radius={4} />
              <Bar dataKey="quotes" fill="var(--color-quotes)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Average RFQ-to-quote cycle time</h3>
          <p className="text-sm text-muted-foreground">Hours from receipt to quote sent</p>
          <ChartContainer
            className="mt-4 h-64 w-full"
            config={{ hours: { label: "Hours", color: "hsl(var(--chart-1))" } }}
          >
            <LineChart data={cycleTime}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="hours"
                stroke="var(--color-hours)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold">RFQ volume by sector</h3>
          <p className="text-sm text-muted-foreground">Share of total RFQ value over the period</p>
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
            <ChartContainer
              className="h-56 w-56"
              config={{ value: { label: "Share" } }}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="sector" />} />
                <Pie data={sectorMix} dataKey="value" nameKey="sector" innerRadius={50} strokeWidth={2}>
                  {sectorMix.map((s) => (
                    <Cell key={s.sector} fill={s.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-2">
              {sectorMix.map((s) => (
                <div key={s.sector} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-sm" style={{ backgroundColor: s.fill }} aria-hidden />
                    {s.sector}
                  </span>
                  <span className="font-medium tabular-nums">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}


export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});
