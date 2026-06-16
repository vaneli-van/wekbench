# Dishrack (Odoo) workflow review → wekbench feature ideas

A walk through the Dishrack Odoo instance — sales orders, quotations, invoicing,
catalogue and payment terms — to find proven patterns worth adding to wekbench.
Everything below is from the live Dishrack data (read-only).

## What Dishrack's workflow actually looks like

**The lifecycle is a clean state machine.** Every deal is one `sale.order` record
that moves through states:

`draft` (quotation) → `sent` (quotation emailed to customer) → `sale` (confirmed
order) → invoiced / delivered → `done`; plus `cancel`.

In the live data: most orders are `sale` (confirmed, "to invoice"), a handful sit
in `draft` (open quotations), two are `sent` (quotation sent, awaiting customer),
one `cancel`. So **quotations and orders are the same object at different stages** —
not separate lists. wekbench already mirrors this idea with its quote stage
pipeline, which is good.

**Each order carries three independent status flags**, and this is the part
wekbench is thinnest on:

- `state` — where the deal is (quote / confirmed / done).
- `invoice_status` — `to invoice` / `invoiced` / `nothing to invoice`.
- `delivery_status` — `pending` / `partial` / `full`.

Because invoicing and delivery are tracked *separately and at the line level*
(`qty_delivered`, `qty_invoiced` per line), Odoo can answer "what's confirmed but
not yet invoiced?" and "what's invoiced but not delivered?" — the two queues a
trading business lives by.

**Quotation-specific fields** on every order:

- `validity_date` — the quote expiry (wekbench has this: `valid_until`).
- `commitment_date` — the delivery date promised to the customer.
- `require_signature` — the customer **e-signs the quote online** to confirm it.
- `require_payment` — optional online down-payment to confirm.
- `client_order_ref` — the **customer's PO number** (e.g. "P00074"). Every
  confirmed Dishrack order has one. wekbench has no field for this today.

**Line items** carry `product_id` (from a real catalogue), `product_uom_qty`,
`price_unit`, `discount` (per-line %), `price_subtotal`, `price_tax`, plus the
`qty_delivered` / `qty_invoiced` running counters.

**Catalogue:** 426 products in `product.template`, each with a category
(`Goods / Ingredient`, `Services`, …), a `list_price`, and a `type`
(stockable / consumable / service). Quotes are built by picking catalogue items,
not free-typing — fast and consistent.

**Payment terms** are a real engine, not a text field. Dishrack has 10 defined:
Immediate, 15 / 21 / 30 / 45 Days, End of Following Month, "30% Now, Balance 60
Days", "2/7 Net 30", "90 days on the 10th", etc. The term drives the invoice
**due date**, and invoices then track `payment_state` (paid / partial / not paid)
and `amount_residual` (outstanding balance).

**Sales teams / salesperson** (`team_id`, `user_id`) tag every order for
attribution and reporting.

## Feature-by-feature: what to borrow

| Odoo capability | What it does | wekbench today | Recommendation |
|---|---|---|---|
| Quotation e-sign / accept link | Customer opens a link, reviews the quote, accepts & signs online → order auto-created | Quotes are internal; no buyer-facing accept link | **Add a public quote link** (reuse the public order-tracking token pattern) where the buyer accepts/e-signs; acceptance auto-creates the order |
| Customer PO reference | `client_order_ref` stores the buyer's PO number on the order | No field | **Add a "Buyer PO ref" field** to quotes/orders — small, high value for B2B |
| Separate invoice & delivery status | `invoice_status` + `delivery_status`, tracked per line via qty counters | Single `status` per order | **Add invoice_status + delivery_status** (derived) and per-line delivered/invoiced quantities |
| "To invoice" queue | Lists confirmed orders awaiting invoicing | Not surfaced | Dashboard tile + filtered list: confirmed, not yet invoiced |
| Payment terms engine | Named terms drive invoice due dates | Terms are free text; invoices basic | **Add a payment-terms list** + invoice due dates |
| Payment status & AR aging | `payment_state`, `amount_residual`, due dates → receivables aging | Invoices have status but no payment tracking / aging | **Add payment status + outstanding balance + an AR aging view** (0–30 / 31–60 / 61–90 / 90+) |
| Product catalogue with categories | 426 products, categorised, with list prices | Sourcing/supplier side exists; no buyer-facing catalogue | **Add a Products/Catalogue module** (name, category, list price, unit) to speed quote building |
| Commitment date | Promised delivery date on the order | Lead time / expected delivery exists | Minor — surface a single "promised date" on quote & order |
| Salesperson / team | Attribution for reporting | `assignee` on quotes | Add salesperson + optional team; power "sales by rep" reporting |
| Tags / labels | Lightweight categorisation of orders | None | Optional: tags on quotes/orders for filtering |
| Quotation templates | Reusable quote line sets | None (Dishrack doesn't use them either) | Low priority; nice-to-have reusable templates |

## The dashboard angle

Odoo's sales/invoicing dashboards revolve around the queues the status flags make
possible. wekbench's dashboard now has revenue-by-year and top-buyers (good); the
natural additions, all powered by the status work above:

- **To-invoice** — value of confirmed orders not yet invoiced.
- **Receivables outstanding** + **overdue** — sum of unpaid invoice balances, and
  how much is past due (AR aging).
- **Delivery pending** — confirmed orders not yet fully delivered.

These three turn the dashboard from "what happened" (history) into "what needs
action" (operational), which is what Dishrack's team reads Odoo for daily.

## Suggested build order

1. **Buyer PO reference** on quotes/orders — tiny, immediately useful.
2. **Public quote acceptance + e-sign link** — buyer confirms online, order
   auto-creates. Reuses the public-token pattern already built for tracking.
   Highest "wow", moderate effort.
3. **Accounts Receivable** — payment terms → invoice due dates → payment status +
   outstanding + an AR aging view, with dashboard tiles. Biggest functional gap.
4. **Delivery & invoice status tracking** (to-invoice / delivery-pending queues).
5. **Product catalogue** with categories + price list to speed quoting.

Items 2 and 3 are the two that most change wekbench's value: a buyer-facing quote
acceptance flow, and real receivables/AR — both proven daily-use patterns in
Dishrack's Odoo.
