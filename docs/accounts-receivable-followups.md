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

## Still to come back to

1. **Auto-overdue** — currently overdue is computed for display. Add a scheduled job
   (the scheduled-tasks feature) to flip stored status to `overdue` and trigger reminders.
2. **Automated reminder cadence** — scheduled reminders (e.g. at due, +7, +14 days)
   instead of manual send only.
3. **Customer statements** — a per-buyer statement (all open invoices + aging) emailed to
   the billing contact, tying into the Buyers page.
4. **Backfill invoices for imported orders** — the 103 imported WP orders have no invoices
   yet; use the **Sync from orders** button on /invoices so AR has live data.
5. **Credit notes / write-offs** and **per-line payment allocation** — later, if needed.
