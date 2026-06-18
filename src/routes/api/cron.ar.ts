import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

import { sendEmail, escapeHtml } from "@/lib/email.server";

// Scheduled Accounts-Receivable jobs. Hit this on a daily schedule
// (Cloudflare Cron Trigger, Supabase scheduled function, or any external cron).
//
//   GET/POST /api/cron/ar?key=<CRON_SECRET>
//
// Required server env:
//   CRON_SECRET                 — shared secret; the request must supply it
//   SUPABASE_URL                — already configured
//   SUPABASE_SERVICE_ROLE_KEY   — service role (bypasses RLS for this system job)
//   RESEND_API_KEY / EMAIL_FROM — for the reminder emails (optional; skipped if absent)
//
// Jobs run each call:
//   1. Auto-overdue: flip sent/partial invoices past their due date to `overdue`.
//   2. Reminder cadence: email the billing contact for invoices due today or
//      overdue by ~7/14/30 days, throttled to once every 6 days per invoice.

const REMINDER_DAYS = new Set([0, 7, 14, 30]);
const THROTTLE_DAYS = 6;
const MAX_PER_RUN = 50;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reminderHtml(inv: any, seller: string, amount: string, daysOverdue: number): string {
  const overdueLine =
    daysOverdue > 0
      ? `<p style="margin:0 0 12px;color:#b3261e">This invoice is <strong>${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue</strong> (due ${escapeHtml(inv.due_date)}).</p>`
      : `<p style="margin:0 0 12px">Due on <strong>${escapeHtml(inv.due_date)}</strong>.</p>`;
  return (
    `<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6">` +
    `<p style="margin:0 0 8px">Dear ${escapeHtml(inv.buyer_company ?? inv.buyer_name ?? "Accounts team")},</p>` +
    `<p style="margin:0 0 12px">A reminder regarding invoice <strong>${escapeHtml(inv.invoice_number)}</strong> with an outstanding balance of <strong>${escapeHtml(amount)}</strong>.</p>` +
    overdueLine +
    `<p style="margin:0 0 12px">We'd appreciate settlement at your earliest convenience. If payment is already in progress, please disregard this note.</p>` +
    (seller ? `<p style="margin:14px 0 0">Kind regards,<br>${escapeHtml(seller)}</p>` : "") +
    `</div>`
  );
}

async function runArJobs(): Promise<Response> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 500 },
    );
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // 1. Auto-overdue.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: overdueRows } = await (supabase as any)
    .from("invoices")
    .update({ status: "overdue" })
    .in("status", ["sent", "partial"])
    .lt("due_date", todayStr)
    .gt("total", 0)
    .select("id, total, amount_paid");
  // Only those with a real outstanding balance should stay overdue; revert the rest.
  let markedOverdue = 0;
  for (const r of overdueRows ?? []) {
    const out = Number(r.total ?? 0) - Number(r.amount_paid ?? 0);
    if (out > 0) markedOverdue += 1;
    else {
      // Fully paid but mis-flagged — set back to paid.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("invoices").update({ status: "paid" }).eq("id", r.id);
    }
  }

  // 2. Reminder cadence.
  const throttleCutoff = new Date(today.getTime() - THROTTLE_DAYS * 86_400_000).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates } = await (supabase as any)
    .from("invoices")
    .select(
      "id, invoice_number, buyer_name, buyer_company, buyer_email, billing_email, currency, total, amount_paid, due_date, reminder_sent_at, reminder_count, orders(buyer_id, buyers(billing_email, email)), workspaces(name, plan, plan_trial_ends_at)",
    )
    .in("status", ["sent", "partial", "overdue"])
    .not("due_date", "is", null);

  let sent = 0;
  const skipped: Array<{ invoice: string; reason: string }> = [];
  for (const inv of (candidates ?? []).slice(0, 500)) {
    if (sent >= MAX_PER_RUN) break;
    const outstanding = Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0);
    if (outstanding <= 0) continue;
    // AR collections (automated reminders) are a Pro feature — skip Starter workspaces.
    const ws = inv.workspaces;
    const wsInTrial = ws?.plan_trial_ends_at && new Date(ws.plan_trial_ends_at).getTime() > Date.now();
    const wsIsPro = ws?.plan === "pro" || !!wsInTrial;
    if (!wsIsPro) {
      skipped.push({ invoice: inv.invoice_number, reason: "starter plan" });
      continue;
    }
    const due = new Date(`${inv.due_date}T00:00:00Z`);
    const daysOverdue = daysBetween(today, due);
    if (!REMINDER_DAYS.has(daysOverdue)) continue;
    if (inv.reminder_sent_at && inv.reminder_sent_at > throttleCutoff) continue;

    const buyer = inv.orders?.buyers;
    const recipient = inv.billing_email || buyer?.billing_email || buyer?.email || inv.buyer_email || null;
    if (!recipient) {
      skipped.push({ invoice: inv.invoice_number, reason: "no recipient" });
      continue;
    }
    const cur = inv.currency ?? "GHS";
    const amount = `${cur} ${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const seller = inv.workspaces?.name ?? "";
    const res = await sendEmail({
      to: recipient,
      subject: `Payment reminder — invoice ${inv.invoice_number} (${amount} outstanding)`,
      html: reminderHtml(inv, seller, amount, daysOverdue),
    });
    if (res.sent) {
      sent += 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("invoices")
        .update({ reminder_sent_at: new Date().toISOString(), reminder_count: Number(inv.reminder_count ?? 0) + 1 })
        .eq("id", inv.id);
    } else {
      skipped.push({ invoice: inv.invoice_number, reason: res.skipped ?? res.error ?? "send failed" });
      if (res.skipped) break; // email not configured — no point continuing
    }
  }

  return Response.json({ ok: true, markedOverdue, remindersSent: sent, skipped });
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const u = new URL(request.url);
  const key = u.searchParams.get("key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return key === secret;
}

export const Route = createFileRoute("/api/cron/ar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        return runArJobs();
      },
      POST: async ({ request }) => {
        if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        return runArJobs();
      },
    },
  },
});
