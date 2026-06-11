import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  FileText,
  Inbox,
  Mail,
  PackageCheck,
  Plus,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — wekbench" }] }),
  component: DashboardPage,
});

const kpis = [
  { label: "Open RFQs", value: "24", change: "+6", trend: "up", hint: "vs last week", icon: Inbox },
  { label: "Quotes awaiting review", value: "11", change: "+3", trend: "up", hint: "from 7 suppliers", icon: FileText },
  { label: "Orders in flight", value: "38", change: "-2", trend: "down", hint: "5 delayed", icon: ShoppingCart },
  { label: "Avg. cycle time", value: "2.4d", change: "-0.6d", trend: "up", hint: "RFQ → PO", icon: Clock },
];

const pipeline = [
  { stage: "Captured", count: 42, value: "$182k", pct: 100, tone: "bg-info" },
  { stage: "Sourcing", count: 28, value: "$124k", pct: 72, tone: "bg-primary" },
  { stage: "Quoted", count: 19, value: "$96k", pct: 54, tone: "bg-accent" },
  { stage: "Awarded", count: 12, value: "$71k", pct: 38, tone: "bg-success" },
  { stage: "Delivered", count: 9, value: "$54k", pct: 26, tone: "bg-chart-5" },
];

const recent = [
  { id: "RFQ-2841", buyer: "Northwind Industrial", items: 14, value: "$28,400", status: "Quotes received", tone: "info", time: "8m" },
  { id: "RFQ-2840", buyer: "Pacific Mining Co.", items: 6, value: "$11,950", status: "Awaiting suppliers", tone: "warning", time: "27m" },
  { id: "RFQ-2839", buyer: "Helios Aerospace", items: 22, value: "$74,210", status: "Awarded", tone: "success", time: "1h" },
  { id: "RFQ-2838", buyer: "Brightwater Utilities", items: 3, value: "$4,120", status: "Quotes received", tone: "info", time: "2h" },
  { id: "RFQ-2837", buyer: "Cascade Robotics", items: 9, value: "$18,640", status: "Drafting", tone: "muted", time: "3h" },
];

const tasks = [
  { title: "Review 3 quotes for RFQ-2841", meta: "Northwind Industrial · $28.4k", priority: "High" },
  { title: "Approve PO for Helios Aerospace", meta: "RFQ-2839 · awarded to Acme Bearings", priority: "High" },
  { title: "Chase Pacific Mining for spec on item #4", meta: "RFQ-2840 · open 27m", priority: "Med" },
  { title: "Confirm delivery date with Forge Steel", meta: "PO-19022 · expected Fri", priority: "Med" },
];

const activity = [
  { who: "Acme Bearings", what: "submitted a quote for", target: "RFQ-2841", tone: "info", icon: FileText, time: "5m" },
  { who: "Forge Steel Co.", what: "shipped", target: "PO-19022", tone: "success", icon: PackageCheck, time: "42m" },
  { who: "wekbench", what: "captured 3 RFQs from", target: "purchasing@northwind.com", tone: "muted", icon: Mail, time: "1h" },
  { who: "Maria L.", what: "awarded", target: "RFQ-2839 → Acme Bearings", tone: "success", icon: Sparkles, time: "2h" },
  { who: "Pacific Mining", what: "uploaded a revised spec to", target: "RFQ-2840", tone: "warning", icon: Upload, time: "3h" },
];

function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Command Center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Good afternoon, Maria
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You have <span className="font-medium text-foreground">11 quotes</span> waiting on review and{" "}
            <span className="font-medium text-foreground">5 orders</span> running behind.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/email-capture"><Mail className="size-4" /> Capture from email</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/inbox"><Plus className="size-4" /> New RFQ</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const positive = k.trend === "up";
          return (
            <Card key={k.label} className="border-border/70">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {k.change}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{k.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/70">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Procurement pipeline</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Live volume across the last 30 days</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="size-3" /> +18% MoM
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipeline.map((p) => (
              <div key={p.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${p.tone}`} />
                    <span className="font-medium text-foreground">{p.stage}</span>
                    <span className="text-muted-foreground">· {p.count}</span>
                  </div>
                  <span className="font-medium tabular-nums text-foreground">{p.value}</span>
                </div>
                <Progress value={p.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Your task queue</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Sorted by urgency</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t.title}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.meta}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    t.priority === "High"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-warning/30 bg-warning/10 text-warning"
                  }
                >
                  {t.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent RFQs</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Latest activity from buyers and suppliers</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inbox">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y divide-border/70">
              {recent.map((r) => (
                <Link
                  to="/inbox"
                  key={r.id}
                  className="grid grid-cols-12 items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-foreground">{r.id}</p>
                    <p className="text-xs text-muted-foreground">{r.time} ago</p>
                  </div>
                  <div className="col-span-4 min-w-0">
                    <p className="truncate text-sm text-foreground">{r.buyer}</p>
                    <p className="text-xs text-muted-foreground">{r.items} line items</p>
                  </div>
                  <div className="col-span-2 text-sm font-medium tabular-nums text-foreground">{r.value}</div>
                  <div className="col-span-3 flex justify-end">
                    <Badge
                      variant="outline"
                      className={
                        r.tone === "success"
                          ? "border-success/30 bg-success/10 text-success"
                          : r.tone === "warning"
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : r.tone === "info"
                              ? "border-info/30 bg-info/10 text-info"
                              : "border-border bg-muted text-muted-foreground"
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Across your workspace</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                      a.tone === "success"
                        ? "bg-success/10 text-success"
                        : a.tone === "warning"
                          ? "bg-warning/10 text-warning"
                          : a.tone === "info"
                            ? "bg-info/10 text-info"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{a.who}</span>{" "}
                      <span className="text-muted-foreground">{a.what}</span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.time} ago</p>
                  </div>
                </div>
              );
            })}
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              4 teammates active now
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
