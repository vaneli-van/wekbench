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

## To come back to (not yet built)

1. **Payment-terms presets** — Dishrack's Odoo has a named-terms engine (Net 15/30/45,
   "30% now balance 60 days", "2/7 Net 30", End of Following Month). We have a free-text
   `terms` field + manual due date; add a presets list that auto-computes the due date.
2. **Auto-overdue** — currently overdue is computed for display. Consider a scheduled
   job (or the existing scheduled-tasks feature) to flip stored status to `overdue` and
   feed alerts.
3. **Dashboard AR tile** — surface Receivables outstanding + overdue on the main
   dashboard (the data is already in `getDashboardStats`-adjacent queries; just wire it).
4. **Payment reminders / statements** — email overdue reminders and customer statements
   (reuses the Resend email helper from the quote-acceptance work).
5. **Invoice PDF** — real downloadable invoice (currently a "coming soon" toast);
   pair with the acknowledgement-style clean print approach.
6. **Backfill invoices for imported orders** — the 103 imported WP orders have no
   invoices yet (they were inserted directly). Use the existing **Sync from orders**
   button on /invoices, or auto-generate, so AR has live data to age.
7. **Credit notes / write-offs** and **per-line payment allocation** — later, if needed.
8. **Buyer-level AR** — a "statement" view per buyer (all their open invoices + aging),
   tying into the Buyers page.
