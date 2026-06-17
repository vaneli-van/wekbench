# Accounts Receivable — what's done & what to revisit

_"Don't forget for us to come back to this." — tracking the AR follow-ups._

## Shipped in this pass

- **Payment tracking** on invoices: `amount_paid`, `paid_at`, a new `partial` status,
  and an `invoice_payments` ledger (amount, date, method, reference, note).
- **Record / remove payments** on the invoice detail page; status auto-updates
  (sent → partial → paid) and outstanding recomputes from the ledger.
- **Receivables aging** on the invoices list: Outstanding, Overdue, Paid-this-month,
  Draft cards, plus an aging bar + breakdown (Current / 1–30 / 31–60 / 61–90 / 90+).
- **Per-invoice** due date, outstanding, and an overdue badge (computed from due date,
  not a stored flag — so it's always live).
- Server: `recordPayment`, `deletePayment`, `updateInvoice` (terms/due/status),
  `listInvoices` returns aging + outstanding + overdue.

## Also shipped since

- **Payment-terms presets** — Due on receipt / Net 15/30/45/60 / End of following month,
  picked on the invoice; auto-computes the due date.
- **Dashboard AR tile** — Receivables (outstanding + overdue + bar) on the main dashboard.
- **Invoice PDF** — clean, itemised, standalone print/save-as-PDF.
- **Payment reminders** — `sendInvoiceReminder` emails the **billing / AP contact**
  (per-buyer `billing_email`, overridable per invoice, buyer email last resort), tracks
  `reminder_sent_at` / `reminder_count`. Reuses the Resend helper (needs RESEND_API_KEY).

## Scheduled jobs (auto-overdue + reminder cadence)

A single secured endpoint runs both daily: **`GET /api/cron/ar?key=<CRON_SECRET>`**
(`src/routes/api/cron.ar.ts`).

- **Auto-overdue** — flips `sent`/`partial` invoices past their due date to `overdue`.
- **Reminder cadence** — emails the billing contact for invoices **due today** or
  **overdue by ~7 / 14 / 30 days**, throttled to once every 6 days per invoice,
  capped at 50 sends per run. Recipient resolution is the same billing-first order
  as the manual reminder.

### Setup (one-time, by the user)
1. Add server secrets in Lovable Cloud → Secrets:
   - `CRON_SECRET` — any long random string (the endpoint requires it).
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (lets the system job run across
     the workspace, bypassing RLS). Treat as highly sensitive.
   - `RESEND_API_KEY` + `EMAIL_FROM` — already needed for any email to send.
2. Schedule a daily request to
   `https://<your-app>/api/cron/ar?key=<CRON_SECRET>` — via a Cloudflare Cron
   Trigger, a Supabase scheduled function, or a free external scheduler
   (e.g. cron-job.org). Once a day, early morning, is plenty.

Without the secrets the endpoint returns 401 / "not configured" and changes nothing,
so it's safe to deploy before wiring the schedule.

## Still to come back to

1. **Customer statements** — a per-buyer statement (all open invoices + aging) emailed to
   the billing contact, tying into the Buyers page.
2. **Backfill invoices for imported orders** — the 103 imported WP orders have no invoices
   yet; use the **Sync from orders** button on /invoices so AR has live data.
3. **Credit notes / write-offs** and **per-line payment allocation** — later, if needed.
4. **Reminder log** — a per-invoice history of reminders sent (currently only the last
   sent timestamp + count are stored).
