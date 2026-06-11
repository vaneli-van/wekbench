import { orders, type Order } from "./data"
import { getOrderDetail } from "./order-detail"

/* ----------------------------- Seller / workspace ----------------------------- */
// Pre-filled from workspace settings (Section 2 + Section 6 of the form).
export const sellerProfile = {
  name: "Western Premium Ltd",
  addressLines: ["12 Liberation Road", "Airport Residential Area", "Accra, Ghana"],
  taxId: "TIN: C0012345678",
  email: "billing@westernpremium.africa",
  phone: "+233 30 274 1180",
  bank: {
    bankName: "Stanbic Bank Ghana",
    accountName: "Western Premium Ltd",
    accountNumber: "9040006712233",
    branch: "Accra Main",
    swift: "SBICGHAC",
  },
}

/* ----------------------------- Currencies ----------------------------- */
export const currencies: Record<string, { symbol: string; code: string; label: string }> = {
  GHS: { symbol: "GH₵", code: "GHS", label: "Ghana Cedi" },
  USD: { symbol: "$", code: "USD", label: "US Dollar" },
}

/* ----------------------------- Ghana tax setup ----------------------------- */
// NHIL + GETFund + COVID levies are charged on the taxable value; VAT is then
// charged on (value + levies). This mirrors the standard Ghana VAT computation.
export const taxConfig = {
  levies: [
    { id: "nhil", label: "NHIL", rate: 0.025 },
    { id: "getfund", label: "GETFund Levy", rate: 0.025 },
    { id: "covid", label: "COVID-19 Levy", rate: 0.01 },
  ],
  vat: { id: "vat", label: "VAT", rate: 0.15 },
}

export interface InvoiceLine {
  id: string
  description: string
  qty: number
  unitPrice: number
}

export interface RequiredDoc {
  id: string
  name: string
  required: boolean
  attached: boolean
  fileName?: string
}

export const requiredDocTemplate: Omit<RequiredDoc, "attached" | "fileName">[] = [
  { id: "po", name: "Purchase Order", required: true },
  { id: "delivery-note", name: "Delivery Note", required: true },
  { id: "waybill", name: "Waybill", required: true },
  { id: "warranty", name: "Warranty Document", required: true },
  { id: "datasheets", name: "Product Datasheets", required: true },
  { id: "pod", name: "Proof of Delivery", required: true },
  { id: "scr", name: "Service Completion Report", required: false },
]

  /* Parse "GH₵27,300,000" / "GH₵1,200.50" → 27300000 */
export function parseAmount(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

export function formatMoney(amount: number, currencyKey: string): string {
  const c = currencies[currencyKey] ?? currencies.GHS
  return `${c.symbol}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
}

export interface InvoiceTotals {
  subtotal: number
  levies: { id: string; label: string; rate: number; amount: number }[]
  leviesTotal: number
  vat: { label: string; rate: number; amount: number }
  total: number
}

export function computeTotals(lines: InvoiceLine[]): InvoiceTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)
  const levies = taxConfig.levies.map((lv) => ({
    id: lv.id,
    label: lv.label,
    rate: lv.rate,
    amount: subtotal * lv.rate,
  }))
  const leviesTotal = levies.reduce((s, l) => s + l.amount, 0)
  const vatBase = subtotal + leviesTotal
  const vatAmount = vatBase * taxConfig.vat.rate
  return {
    subtotal,
    levies,
    leviesTotal,
    vat: { label: taxConfig.vat.label, rate: taxConfig.vat.rate, amount: vatAmount },
    total: subtotal + leviesTotal + vatAmount,
  }
}

/* Add days to an ISO-ish date string and return YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const base = new Date(dateStr)
  if (Number.isNaN(base.getTime())) return dateStr
  base.setDate(base.getDate() + days)
  return base.toISOString().slice(0, 10)
}

export interface InvoicePrefill {
  invoiceNumber: string
  order: Order
  buyer: { name: string; address: string; taxId: string; contact: string; email: string }
  reference: string
  issueDate: string
  dueDate: string
  paymentTermsDays: number
  currencyKey: string
  lines: InvoiceLine[]
  /** "draft" until sent; sent invoices show the payment panel */
  status: string
  amountPaid?: number
  payments?: { id: string; date: string; method: string; amount: number; ref: string }[]
}

const today = "2026-06-12"

/* Build an invoice prefilled from a linked order. */
export function getInvoicePrefill(orderId: string): InvoicePrefill | null {
  const order = orders.find((o) => o.id === orderId)
  if (!order) return null
  const detail = getOrderDetail(order)
  const lines: InvoiceLine[] = detail.lineItems.map((li) => ({
    id: li.id,
    description: li.description,
    qty: li.qty,
    unitPrice: parseAmount(li.unitCost),
  }))

  // Map order.invoiceStatus → invoice lifecycle status.
  const statusMap: Record<string, string> = {
    pending: "draft",
    uploaded: "sent",
    accepted: "delivered", // treated as "Paid"
    rejected: "amended",
  }
  const status = statusMap[order.invoiceStatus] ?? "draft"

  const totals = computeTotals(lines)
  const isPaid = status === "delivered"
  const isSent = status !== "draft"

  return {
    invoiceNumber: `INV-${order.id.replace("ORD-", "")}`,
    order,
    buyer: {
      name: order.buyer,
      address: detail.deliveryAddress,
      taxId: "TIN: " + order.poNumber.replace(/\W/g, "").slice(0, 10).toUpperCase(),
      contact: order.buyerContact,
      email: detail.buyerEmail,
    },
    reference: order.poNumber,
    issueDate: today,
    dueDate: addDays(today, 30),
    paymentTermsDays: 30,
    currencyKey: "GHS",
    lines,
    status,
    amountPaid: isPaid ? totals.total : isSent ? Math.round(totals.total * 0.3) : 0,
    payments: isPaid
      ? [
          { id: "P-1", date: "2026-06-10", method: "Bank transfer", ref: "TRF-88231-A", amount: Math.round(totals.total * 0.3) },
          { id: "P-2", date: "2026-06-18", method: "Bank transfer", ref: "TRF-88231-B", amount: totals.total - Math.round(totals.total * 0.3) },
        ]
      : isSent
        ? [{ id: "P-1", date: "2026-06-10", method: "Bank transfer", ref: "TRF-4417-A", amount: Math.round(totals.total * 0.3) }]
        : [],
  }
}

export const statusLabelForInvoice: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  delivered: "Paid",
  amended: "Overdue",
}
