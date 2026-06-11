import { createFileRoute } from "@tanstack/react-router";
import { notFound } from "@tanstack/react-router"
import { InvoiceGenerator } from "@/components/invoice-generator"
import { getInvoicePrefill } from "@/lib/invoice"
import { orders } from "@/lib/data"

function InvoiceDetailPage() {
  const { id } = Route.useParams();

  // Accept either an order id (ORD-2026-0231), an invoice number (INV-2026-0231),
  // or "new" (defaults to the first order awaiting invoicing).
  let orderId = id
  if (id.startsWith("INV-")) orderId = `ORD-${id.replace("INV-", "")}`
  if (id === "new") orderId = orders[0].id

  const prefill = getInvoicePrefill(orderId)
  if (!prefill) throw notFound()

  return <InvoiceGenerator prefill={prefill} />
}


export const Route = createFileRoute("/_app/invoices/$id")({
  component: InvoiceDetailPage,
});
