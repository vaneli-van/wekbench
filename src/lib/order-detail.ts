import { orders, type Order } from "./data"

export type SupplierLineStatus = "ordered" | "shipped" | "received" | "cancelled"

export interface OrderLineItem {
  id: string
  description: string
  qty: number
  supplier: string
  unitCost: string
  total: string
  lineStatus: SupplierLineStatus
  deliveryDate: string
}

export interface SupplierOrder {
  id: string
  supplier: string
  poSent: string
  expectedShip: string
  tracking: string
  lastUpdate: string
  status: SupplierLineStatus
}

export type TimelineEventType =
  | "po"
  | "supplier"
  | "shipment"
  | "customs"
  | "delivery"
  | "delivered"
  | "note"
  | "invoice"

export interface TimelineEvent {
  id: string
  timestamp: string
  type: TimelineEventType
  actor: string
  action: string
  detail?: string
  tracking?: string
  document?: { name: string; type: string }
}

export interface OrderDocument {
  id: string
  name: string
  type: string
  size: string
  uploadedAt: string
}

export interface OrderComm {
  id: string
  kind: "buyer-email" | "internal-note"
  author: string
  at: string
  subject?: string
  body: string
}

export interface OrderDetail {
  shareToken: string
  buyerEmail: string
  buyerPhone: string
  poDate: string
  paymentTerms: string
  deliveryAddress: string
  lineItems: OrderLineItem[]
  supplierOrders: SupplierOrder[]
  timeline: TimelineEvent[]
  documents: OrderDocument[]
  comms: OrderComm[]
  audit: { id: string; at: string; actor: string; action: string }[]
}

export const orderDetails: Record<string, OrderDetail> = {
  "ORD-2026-0231": {
    shareToken: "trk_eq88231_a7f3",
    buyerEmail: "grace.mwangi@equatorlogistics.com",
    buyerPhone: "+254 711 204 880",
    poDate: "2026-06-09",
    paymentTerms: "30% advance, 70% on delivery",
    deliveryAddress: "Equator Logistics Ltd, Plot 14 Mombasa Road, Nairobi, Kenya",
    lineItems: [
      {
        id: "L-1",
        description: 'Rugged Android Tablet, 8" IP68, 4GB/64GB',
        qty: 30,
        supplier: "Dell EMEA",
        unitCost: "GH₵780,000",
        total: "GH₵23,400,000",
        lineStatus: "shipped",
        deliveryDate: "2026-06-22",
      },
      {
        id: "L-2",
        description: "Tablet rugged case + screen protector",
        qty: 30,
        supplier: "Targus Africa",
        unitCost: "GH₵42,000",
        total: "GH₵1,260,000",
        lineStatus: "ordered",
        deliveryDate: "2026-06-20",
      },
      {
        id: "L-3",
        description: "USB-C multiport charging dock (10-bay)",
        qty: 3,
        supplier: "Anker Distribution",
        unitCost: "GH₵880,000",
        total: "GH₵2,640,000",
        lineStatus: "ordered",
        deliveryDate: "2026-06-21",
      },
    ],
    supplierOrders: [
      {
        id: "SO-1",
        supplier: "Dell EMEA",
        poSent: "2026-06-09 10:12",
        expectedShip: "2026-06-14",
        tracking: "DHL-7741-22890-KE",
        lastUpdate: "2026-06-11 07:40 — Shipped from Rotterdam hub",
        status: "shipped",
      },
      {
        id: "SO-2",
        supplier: "Targus Africa",
        poSent: "2026-06-09 10:18",
        expectedShip: "2026-06-16",
        tracking: "—",
        lastUpdate: "2026-06-09 16:00 — Order acknowledged",
        status: "ordered",
      },
      {
        id: "SO-3",
        supplier: "Anker Distribution",
        poSent: "2026-06-09 10:25",
        expectedShip: "2026-06-17",
        tracking: "—",
        lastUpdate: "2026-06-10 09:15 — Awaiting stock confirmation",
        status: "ordered",
      },
    ],
    timeline: [
      {
        id: "T-1",
        timestamp: "2026-06-09 08:05",
        type: "po",
        actor: "System",
        action: "PO received from buyer",
        detail: "PO-EQ-88231 matched to quote QT-2026-0392",
        document: { name: "PO-EQ-88231.pdf", type: "Purchase Order" },
      },
      {
        id: "T-2",
        timestamp: "2026-06-09 10:25",
        type: "supplier",
        actor: "Samuel Adeyemi",
        action: "Supplier orders placed with Dell, Targus, Anker",
        detail: "3 supplier POs generated and emailed",
      },
      {
        id: "T-3",
        timestamp: "2026-06-11 07:40",
        type: "shipment",
        actor: "Dell EMEA",
        action: "Tablets shipped from Rotterdam hub",
        detail: "30 units via DHL Global Forwarding",
        tracking: "DHL-7741-22890-KE",
        document: { name: "Dell-waybill-22890.pdf", type: "Waybill" },
      },
    ],
    documents: [
      { id: "DOC-1", name: "PO-EQ-88231.pdf", type: "Purchase Order", size: "240 KB", uploadedAt: "2026-06-09 08:05" },
      { id: "DOC-2", name: "Supplier-PO-Dell.pdf", type: "Supplier PO", size: "188 KB", uploadedAt: "2026-06-09 10:25" },
      { id: "DOC-3", name: "Dell-waybill-22890.pdf", type: "Waybill", size: "96 KB", uploadedAt: "2026-06-11 07:42" },
    ],
    comms: [
      {
        id: "C-1",
        kind: "buyer-email",
        author: "Grace Mwangi",
        at: "2026-06-09 08:00",
        subject: "PO attached — 30 rugged tablets",
        body: "Hi team, please find our PO attached. We need delivery before end of June for the field rollout.",
      },
      {
        id: "C-2",
        kind: "internal-note",
        author: "Samuel Adeyemi",
        at: "2026-06-09 10:30",
        body: "Dell lead time confirmed at 5 days. Targus + Anker can consolidate at our Tema warehouse before final delivery.",
      },
    ],
    audit: [
      { id: "A-1", at: "2026-06-09 08:05", actor: "System", action: "Order created from PO-EQ-88231" },
      { id: "A-2", at: "2026-06-09 10:25", actor: "Samuel Adeyemi", action: "Placed 3 supplier orders" },
      { id: "A-3", at: "2026-06-11 07:40", actor: "System", action: "Shipment event ingested from DHL" },
    ],
  },
}

// Fallback detail so every order id renders something sensible.
export function getOrderDetail(order: Order): OrderDetail {
  const existing = orderDetails[order.id]
  if (existing) return existing
  const token = `trk_${order.poNumber.replace(/[^a-z0-9]/gi, "").toLowerCase()}`
  return {
    shareToken: token,
    buyerEmail: `${order.buyerContact.split(" ")[0].toLowerCase()}@example.com`,
    buyerPhone: "+234 800 000 0000",
    poDate: order.orderedAt.split(" ")[0],
    paymentTerms: "Net 30",
    deliveryAddress: `${order.buyer}, Lagos, Nigeria`,
    lineItems: [
      {
        id: "L-1",
        description: order.description,
        qty: 1,
        supplier: "Primary supplier",
        unitCost: order.value,
        total: order.value,
        lineStatus: order.status === "delivered" ? "received" : "ordered",
        deliveryDate: order.expectedDelivery,
      },
    ],
    supplierOrders: [
      {
        id: "SO-1",
        supplier: "Primary supplier",
        poSent: order.orderedAt,
        expectedShip: order.expectedDelivery,
        tracking: order.shipment.tracking,
        lastUpdate: `${order.orderedAt} — ${order.supplierStatus}`,
        status: order.status === "delivered" ? "received" : "shipped",
      },
    ],
    timeline: [
      {
        id: "T-1",
        timestamp: order.orderedAt,
        type: "po",
        actor: "System",
        action: "PO received from buyer",
        detail: `${order.poNumber} matched to quote ${order.quoteRef}`,
      },
    ],
    documents: [
      { id: "DOC-1", name: `${order.poNumber}.pdf`, type: "Purchase Order", size: "210 KB", uploadedAt: order.orderedAt },
    ],
    comms: [],
    audit: [{ id: "A-1", at: order.orderedAt, actor: "System", action: `Order created from ${order.poNumber}` }],
  }
}

export const supplierStatusMeta: Record<SupplierLineStatus, { label: string; status: string }> = {
  ordered: { label: "Ordered", status: "pending" },
  shipped: { label: "Shipped", status: "in-progress" },
  received: { label: "Received", status: "delivered" },
  cancelled: { label: "Cancelled", status: "rejected" },
}
