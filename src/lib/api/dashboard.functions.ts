import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

const PIPELINE_STAGES = [
  "drafted",
  "submitted",
  "clarification",
  "reviewing",
  "won",
  "lost",
  "expired",
] as const;

const EMPTY = {
  kpis: {
    openRfqs: 0,
    rfqsLast24h: 0,
    quotesAwaiting: 0,
    totalQuotes: 0,
    wonThisMonth: 0,
    wonThisMonthCount: 0,
    ordersInTransit: 0,
    overdue: 0,
  },
  pipeline: [] as Array<{ stage: string; count: number; value: number }>,
  topBuyers: [] as Array<{ company: string; value: number }>,
  ordersByYear: [] as Array<{ year: string; count: number; total: number }>,
  currency: "GHS",
};

/** Real dashboard metrics for the current workspace — KPIs, pipeline, top buyers, revenue by year. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const wsId = await resolveWorkspaceId(supabase, context.userId);
    if (!wsId) return EMPTY;

    const [{ data: rfqs }, { data: quotes }, { data: orders }] = await Promise.all([
      supabase.from("rfqs").select("id, status, created_at").eq("workspace_id", wsId),
      supabase.from("quotes").select("id, status, stage, total, currency").eq("workspace_id", wsId),
      supabase
        .from("orders")
        .select("buyer_company, buyer_name, value, currency, status, ordered_at, expected_delivery")
        .eq("workspace_id", wsId),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const R = (rfqs ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Q = (quotes ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const O = (orders ?? []) as any[];

    const now = Date.now();
    const dayAgo = now - 86_400_000;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    const currency = O[0]?.currency ?? Q[0]?.currency ?? "GHS";

    // KPIs
    const openRfqs = R.filter((r) => r.status === "open").length;
    const rfqsLast24h = R.filter((r) => r.created_at && +new Date(r.created_at) >= dayAgo).length;
    const quotesAwaiting = Q.filter((q) => q.status === "sent").length;
    const totalQuotes = Q.length;

    let wonThisMonth = 0;
    let wonThisMonthCount = 0;
    let ordersInTransit = 0;
    let overdue = 0;
    for (const o of O) {
      const t = o.ordered_at ? +new Date(o.ordered_at) : NaN;
      if (!Number.isNaN(t) && t >= monthStartMs) {
        wonThisMonth += Number(o.value ?? 0);
        wonThisMonthCount += 1;
      }
      if (o.status === "shipped" || o.status === "in_transit") ordersInTransit += 1;
      if (
        o.expected_delivery &&
        +new Date(o.expected_delivery) < now &&
        o.status !== "delivered" &&
        o.status !== "cancelled"
      ) {
        overdue += 1;
      }
    }

    // Quote pipeline by stage
    const stageCount: Record<string, number> = {};
    const stageValue: Record<string, number> = {};
    for (const q of Q) {
      const s = q.stage ?? "drafted";
      stageCount[s] = (stageCount[s] ?? 0) + 1;
      stageValue[s] = (stageValue[s] ?? 0) + Number(q.total ?? 0);
    }
    const pipeline = PIPELINE_STAGES.filter((s) => stageCount[s]).map((s) => ({
      stage: s,
      count: stageCount[s] ?? 0,
      value: stageValue[s] ?? 0,
    }));

    // Top buyers by order value
    const buyerValue: Record<string, number> = {};
    for (const o of O) {
      const name = o.buyer_company || o.buyer_name || "—";
      buyerValue[name] = (buyerValue[name] ?? 0) + Number(o.value ?? 0);
    }
    const topBuyers = Object.entries(buyerValue)
      .map(([company, value]) => ({ company, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Revenue by year
    const yearCount: Record<string, number> = {};
    const yearTotal: Record<string, number> = {};
    for (const o of O) {
      const d = o.ordered_at ? new Date(o.ordered_at) : null;
      const y = d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()) : "Undated";
      yearCount[y] = (yearCount[y] ?? 0) + 1;
      yearTotal[y] = (yearTotal[y] ?? 0) + Number(o.value ?? 0);
    }
    const ordersByYear = Object.keys(yearTotal)
      .sort((a, b) => (a === "Undated" ? 1 : b === "Undated" ? -1 : Number(b) - Number(a)))
      .map((year) => ({ year, count: yearCount[year], total: yearTotal[year] }));

    return {
      kpis: {
        openRfqs,
        rfqsLast24h,
        quotesAwaiting,
        totalQuotes,
        wonThisMonth,
        wonThisMonthCount,
        ordersInTransit,
        overdue,
      },
      pipeline,
      topBuyers,
      ordersByYear,
      currency,
    };
  });
