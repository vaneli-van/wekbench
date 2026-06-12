// Shared mock procurement data for the Wekbench demo journey.
// All data is realistic (no lorem ipsum) and centered on the
// "25 Dell laptops" RFQ-to-Quote-to-Order demo.

export type Status =
  | "new"
  | "in-review"
  | "matching"
  | "pricing"
  | "quoted"
  | "awaiting-approval"
  | "approved"
  | "sent"
  | "amended"
  | "po-received"
  | "in-progress"
  | "delivered"
  | "ignored"

export const statusLabels: Record<string, string> = {
  new: "New",
  "in-review": "In Review",
  matching: "Matching",
  pricing: "Pricing",
  quoted: "Quoted",
  "awaiting-approval": "Awaiting Approval",
  approved: "Approved",
  sent: "Sent",
  amended: "Amended",
  "po-received": "PO Received",
  "in-progress": "In Progress",
  delivered: "Delivered",
  ignored: "Ignored",
  open: "Open",
  draft: "Draft",
  missing: "Missing",
  uploaded: "Uploaded",
  accepted: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
}

// Status badge variant mapping — standardised on five variants only.
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error"

export const statusTone: Record<string, BadgeTone> = {
  new: "info",
  "in-review": "warning",
  matching: "info",
  pricing: "info",
  quoted: "info",
  "awaiting-approval": "warning",
  approved: "success",
  sent: "success",
  amended: "warning",
  "po-received": "info",
  "in-progress": "info",
  delivered: "success",
  ignored: "neutral",
  open: "info",
  draft: "neutral",
  missing: "error",
  uploaded: "info",
  accepted: "success",
  rejected: "error",
  pending: "warning",
}

export interface InboxEmail {
  id: string
  sender: string
  senderEmail: string
  buyerCompany: string
  subject: string
  preview: string
  receivedAt: string
  receivedRelative: string
  attachments: { name: string; size: string; type: string }[]
  detectedRef: string | null
  type: "rfq" | "amendment" | "po" | "general"
  status: "new" | "processed" | "ignored"
  unread: boolean
}

export const inboxEmails: InboxEmail[] = [
  {
    id: "EM-1042",
    sender: "Adaeze Okafor",
    senderEmail: "a.okafor@meridianbank.com",
    buyerCompany: "Meridian Bank Plc",
    subject: "RFQ: 25 x Dell Latitude Business Laptops - Branch Rollout",
    preview:
      "Please find attached our request for quotation for 25 business laptops for our Lagos branch refresh. Kindly quote your best landed price...",
    receivedAt: "2026-06-08 09:14",
    receivedRelative: "Yesterday, 09:14",
    attachments: [{ name: "Meridian-RFQ-2026-0418.pdf", size: "248 KB", type: "pdf" }],
    detectedRef: "RFQ-2026-0418",
    type: "rfq",
    status: "processed",
    unread: false,
  },
  {
    id: "EM-1051",
    sender: "Adaeze Okafor",
    senderEmail: "a.okafor@meridianbank.com",
    buyerCompany: "Meridian Bank Plc",
    subject: "RE: RFQ-2026-0418 - Spec change: RAM and delivery timeline",
    preview:
      "Following our internal review, we now require 32GB RAM (up from 16GB) and need delivery within 14 days instead of 21. Please advise impact...",
    receivedAt: "2026-06-09 11:32",
    receivedRelative: "Today, 11:32",
    attachments: [],
    detectedRef: "RFQ-2026-0418",
    type: "amendment",
    status: "new",
    unread: true,
  },
  {
    id: "EM-1029",
    sender: "Tunde Bakare",
    senderEmail: "procurement@sahelhealth.org",
    buyerCompany: "Sahel Health Group",
    subject: "Request for Quote - Network Switches & UPS Units",
    preview:
      "We are seeking pricing for 12 managed network switches and 8 online UPS units for our new data center. Specifications attached...",
    receivedAt: "2026-06-07 15:48",
    receivedRelative: "2 days ago",
    attachments: [{ name: "SHG-Network-Specs.xlsx", size: "84 KB", type: "xlsx" }],
    detectedRef: "RFQ-2026-0415",
    type: "rfq",
    status: "new",
    unread: true,
  },
  {
    id: "EM-1063",
    sender: "Grace Mwangi",
    senderEmail: "g.mwangi@equatorlogistics.co.ke",
    buyerCompany: "Equator Logistics Ltd",
    subject: "Purchase Order PO-EQ-88231 - Quote QT-2026-0392",
    preview:
      "Please find our approved purchase order attached for the rugged tablets quoted under QT-2026-0392. Kindly confirm receipt and lead time...",
    receivedAt: "2026-06-09 08:05",
    receivedRelative: "Today, 08:05",
    attachments: [{ name: "PO-EQ-88231.pdf", size: "192 KB", type: "pdf" }],
    detectedRef: "QT-2026-0392",
    type: "po",
    status: "new",
    unread: true,
  },
  {
    id: "EM-1018",
    sender: "Mailer Daemon",
    senderEmail: "newsletter@techsupplies.com",
    buyerCompany: "—",
    subject: "Monthly Distributor Price List - June 2026",
    preview: "Our updated distributor pricing for the month of June is now available for download...",
    receivedAt: "2026-06-06 06:00",
    receivedRelative: "3 days ago",
    attachments: [{ name: "PriceList-June2026.pdf", size: "1.2 MB", type: "pdf" }],
    detectedRef: null,
    type: "general",
    status: "new",
    unread: false,
  },
]

export interface LineItem {
  id: string
  description: string
  brand: string
  spec: string
  quantity: number
  unit: string
  targetPrice?: string
}

export interface RFQ {
  id: string
  ref: string
  buyer: string
  buyerContact: string
  buyerEmail: string
  subject: string
  receivedAt: string
  deadline: string
  deadlineRelative: string
  status: string
  value: string
  document: { name: string; size: string }
  lineItems: LineItem[]
  nextAction: string
}

export const rfqs: RFQ[] = [
  {
    id: "RFQ-2026-0418",
    ref: "RFQ-2026-0418",
    buyer: "Meridian Bank Plc",
    buyerContact: "Adaeze Okafor",
    buyerEmail: "a.okafor@meridianbank.com",
    subject: "25 x Dell Latitude Business Laptops - Branch Rollout",
    receivedAt: "2026-06-08 09:14",
    deadline: "2026-06-12",
    deadlineRelative: "Due in 3 days",
    status: "matching",
    value: "GH₵38,500,000",
    document: { name: "Meridian-RFQ-2026-0418.pdf", size: "248 KB" },
    nextAction: "Complete product matching and calculate landed cost",
    lineItems: [
      {
        id: "LI-1",
        description: "Business Laptop",
        brand: "Dell",
        spec: 'Intel Core i7, 16GB RAM, 512GB SSD, 14" FHD, Windows 11 Pro',
        quantity: 25,
        unit: "units",
        targetPrice: "GH₵1,450,000",
      },
    ],
  },
  {
    id: "RFQ-2026-0415",
    ref: "RFQ-2026-0415",
    buyer: "Sahel Health Group",
    buyerContact: "Tunde Bakare",
    buyerEmail: "procurement@sahelhealth.org",
    subject: "Network Switches & UPS Units - Data Center",
    receivedAt: "2026-06-07 15:48",
    deadline: "2026-06-11",
    deadlineRelative: "Due in 2 days",
    status: "in-review",
    value: "GH₵22,100,000",
    document: { name: "SHG-Network-Specs.xlsx", size: "84 KB" },
    nextAction: "Review extracted line items and start matching",
    lineItems: [
      {
        id: "LI-1",
        description: "Managed Network Switch",
        brand: "Cisco",
        spec: "48-Port Gigabit PoE+, Layer 3, Stackable",
        quantity: 12,
        unit: "units",
      },
      {
        id: "LI-2",
        description: "Online UPS",
        brand: "APC",
        spec: "10kVA, Rack-mount, Double Conversion",
        quantity: 8,
        unit: "units",
      },
    ],
  },
  {
    id: "RFQ-2026-0411",
    ref: "RFQ-2026-0411",
    buyer: "Atlas Manufacturing",
    buyerContact: "Chinedu Eze",
    buyerEmail: "c.eze@atlasmfg.com",
    subject: "Industrial Barcode Scanners - 40 units",
    receivedAt: "2026-06-05 10:20",
    deadline: "2026-06-10",
    deadlineRelative: "Due tomorrow",
    status: "quoted",
    value: "GH₵14,800,000",
    document: { name: "Atlas-Scanner-RFQ.pdf", size: "156 KB" },
    nextAction: "Awaiting buyer response on sent quote",
    lineItems: [
      {
        id: "LI-1",
        description: "Rugged Barcode Scanner",
        brand: "Zebra",
        spec: "2D Imager, Bluetooth, IP65 Rated",
        quantity: 40,
        unit: "units",
      },
    ],
  },
  {
    id: "RFQ-2026-0408",
    ref: "RFQ-2026-0408",
    buyer: "Coastal Telecoms",
    buyerContact: "Fatima Bello",
    buyerEmail: "f.bello@coastaltel.ng",
    subject: "Server Rack & Cooling - Edge Site",
    receivedAt: "2026-06-04 13:00",
    deadline: "2026-06-09",
    deadlineRelative: "Due today",
    status: "pricing",
    value: "GH₵9,400,000",
    document: { name: "Coastal-Edge-RFQ.pdf", size: "201 KB" },
    nextAction: "Finalize pricing assumptions",
    lineItems: [
      {
        id: "LI-1",
        description: "42U Server Rack",
        brand: "APC NetShelter",
        spec: "Enclosed, with PDU and cable management",
        quantity: 2,
        unit: "units",
      },
    ],
  },
]

// Product matches for the Dell laptop RFQ
export interface ProductMatch {
  id: string
  brand: string
  model: string
  matchType: "exact" | "equivalent"
  spec: string
  supplier: string
  oem: string
  indicativePrice: string
  priceNumeric: number
  leadTime: string
  confidence: number
  datasheet: string
  recommended?: boolean
}

export const productMatches: ProductMatch[] = [
  {
    id: "PM-1",
    brand: "Dell",
    model: "Latitude 5450",
    matchType: "exact",
    spec: 'Core i7-1355U, 16GB DDR5, 512GB NVMe SSD, 14" FHD, Win 11 Pro',
    supplier: "Redington Gulf (Authorized Distributor)",
    oem: "Dell Technologies",
    indicativePrice: "$985",
    priceNumeric: 985,
    leadTime: "10-14 days",
    confidence: 98,
    datasheet: "Dell-Latitude-5450-Datasheet.pdf",
    recommended: true,
  },
  {
    id: "PM-2",
    brand: "HP",
    model: "EliteBook 640 G11",
    matchType: "equivalent",
    spec: 'Core i7-1355U, 16GB DDR5, 512GB NVMe SSD, 14" FHD, Win 11 Pro',
    supplier: "Mustek Distribution",
    oem: "HP Inc.",
    indicativePrice: "$942",
    priceNumeric: 942,
    leadTime: "7-10 days",
    confidence: 91,
    datasheet: "HP-EliteBook-640-G11-Datasheet.pdf",
  },
  {
    id: "PM-3",
    brand: "Lenovo",
    model: "ThinkPad L14 Gen 5",
    matchType: "equivalent",
    spec: 'Core i7-1355U, 16GB DDR5, 512GB NVMe SSD, 14" FHD, Win 11 Pro',
    supplier: "Pinnacle Technology",
    oem: "Lenovo Group",
    indicativePrice: "$908",
    priceNumeric: 908,
    leadTime: "14-18 days",
    confidence: 88,
    datasheet: "Lenovo-ThinkPad-L14-G5-Datasheet.pdf",
  },
]

// Landed cost breakdown for the selected Dell laptop
export interface CostRow {
  label: string
  value: string
  note?: string
}

export const landedCost = {
  supplierCost: 985,
  currency: "USD",
  fxRate: 1580,
  fxBuffer: 3, // percent
  freightPerUnit: 28,
  dutyPercent: 5,
  clearingPerUnit: 12,
  insurancePercent: 1.5,
  localDeliveryPerUnit: 8,
  marginPercent: 18,
  quantity: 25,
  deliveryTimeline: "12-16 days",
}

export interface QuoteLine {
  id: string
  description: string
  brand: string
  spec: string
  quantity: number
  unitPrice: string
  total: string
  isAlternative?: boolean
}

export const quote = {
  ref: "QT-2026-0418",
  version: "v1",
  buyer: "Meridian Bank Plc",
  contact: "Adaeze Okafor",
  date: "2026-06-09",
  validUntil: "2026-06-30",
  status: "awaiting-approval",
  deliveryTerms: "DDP Lagos, 12-16 working days from PO",
  paymentTerms: "50% advance, 50% on delivery. Net 14 days.",
  warranty: "3-year Dell ProSupport Next Business Day on-site warranty",
  validity: "21 days from quote date",
  lines: [
    {
      id: "QL-1",
      description: "Dell Latitude 5450 Business Laptop",
      brand: "Dell",
      spec: 'Core i7, 16GB RAM, 512GB SSD, 14" FHD',
      quantity: 25,
      unitPrice: "GH₵1,847,500",
      total: "GH₵46,187,500",
    },
  ] as QuoteLine[],
  alternatives: [
    {
      id: "QL-ALT-1",
      description: "HP EliteBook 640 G11 (Alternative)",
      brand: "HP",
      spec: 'Core i7, 16GB RAM, 512GB SSD, 14" FHD',
      quantity: 25,
      unitPrice: "GH₵1,766,250",
      total: "GH₵44,156,250",
      isAlternative: true,
    },
    {
      id: "QL-ALT-2",
      description: "Lenovo ThinkPad L14 Gen 5 (Alternative)",
      brand: "Lenovo",
      spec: 'Core i7, 16GB RAM, 512GB SSD, 14" FHD',
      quantity: 25,
      unitPrice: "GH₵1,702,500",
      total: "GH₵42,562,500",
      isAlternative: true,
    },
  ] as QuoteLine[],
  subtotal: "GH₵46,187,500",
  vat: "GH₵6,928,125",
  grandTotal: "GH₵53,115,625",
}

// Communication & updates - the buyer amendment
export interface CommUpdate {
  id: string
  type: "amendment" | "clarification" | "general"
  from: string
  fromCompany: string
  receivedAt: string
  subject: string
  body: string
  detectedChanges: { field: string; from: string; to: string }[]
  suggestedActions: string[]
  status: "pending" | "actioned" | "ignored"
}

export const commUpdates: CommUpdate[] = [
  {
    id: "CU-1",
    type: "amendment",
    from: "Adaeze Okafor",
    fromCompany: "Meridian Bank Plc",
    receivedAt: "2026-06-09 11:32",
    subject: "RE: RFQ-2026-0418 - Spec change: RAM and delivery timeline",
    body: "Following our internal IT review, we now require 32GB RAM (up from 16GB) to support our new virtualization workloads. Additionally, our branch rollout date has been brought forward, so we need delivery within 14 days instead of the original 21. Please advise on the price impact and revised timeline.",
    detectedChanges: [
      { field: "RAM", from: "16GB", to: "32GB" },
      { field: "Delivery Timeline", from: "21 days", to: "14 days" },
    ],
    suggestedActions: [
      "Update RFQ line item",
      "Recalculate pricing",
      "Check product availability",
      "Create revised quote",
      "Ask buyer for clarification",
      "Ignore update",
    ],
    status: "pending",
  },
]

export interface TimelineEvent {
  id: string
  label: string
  detail: string
  timestamp: string
  actor: string
  type: "system" | "ai" | "user" | "buyer"
  status: "done" | "current" | "upcoming"
}

export const timeline: TimelineEvent[] = [
  {
    id: "T-1",
    label: "RFQ email received",
    detail: "Inbound email captured from a.okafor@meridianbank.com",
    timestamp: "2026-06-08 09:14",
    actor: "Wekbench Email Capture",
    type: "system",
    status: "done",
  },
  {
    id: "T-2",
    label: "Attachment extracted",
    detail: "Meridian-RFQ-2026-0418.pdf parsed (248 KB)",
    timestamp: "2026-06-08 09:14",
    actor: "Wekbench AI",
    type: "ai",
    status: "done",
  },
  {
    id: "T-3",
    label: "Line items detected",
    detail: '1 line item extracted: 25 x Dell laptop, i7, 16GB, 512GB, 14"',
    timestamp: "2026-06-08 09:15",
    actor: "Wekbench AI",
    type: "ai",
    status: "done",
  },
  {
    id: "T-4",
    label: "RFQ reviewed",
    detail: "Specs confirmed by vendor",
    timestamp: "2026-06-08 10:02",
    actor: "Samuel Adeyemi",
    type: "user",
    status: "done",
  },
  {
    id: "T-5",
    label: "Product matching started",
    detail: "AI matching against catalog and distributor feeds",
    timestamp: "2026-06-08 10:05",
    actor: "Samuel Adeyemi",
    type: "user",
    status: "done",
  },
  {
    id: "T-6",
    label: "Product selected",
    detail: "Dell Latitude 5450 selected (exact match, 98% confidence)",
    timestamp: "2026-06-08 10:18",
    actor: "Samuel Adeyemi",
    type: "user",
    status: "done",
  },
  {
    id: "T-7",
    label: "Pricing calculated",
    detail: "Landed cost computed with FX 1,580, 18% margin",
    timestamp: "2026-06-08 11:40",
    actor: "Samuel Adeyemi",
    type: "user",
    status: "done",
  },
  {
    id: "T-8",
    label: "Quote drafted",
    detail: "QT-2026-0418 v1 created, total GH₵53,115,625",
    timestamp: "2026-06-08 12:05",
    actor: "Samuel Adeyemi",
    type: "user",
    status: "done",
  },
  {
    id: "T-9",
    label: "Quote sent for approval",
    detail: "Submitted to manager for sign-off",
    timestamp: "2026-06-08 12:10",
    actor: "Samuel Adeyemi",
    type: "user",
    status: "current",
  },
  {
    id: "T-10",
    label: "Quote approved",
    detail: "Pending manager approval",
    timestamp: "—",
    actor: "Ngozi Anderson (Manager)",
    type: "user",
    status: "upcoming",
  },
  {
    id: "T-11",
    label: "Quote sent to buyer",
    detail: "Will email to a.okafor@meridianbank.com",
    timestamp: "—",
    actor: "Wekbench",
    type: "system",
    status: "upcoming",
  },
  {
    id: "T-12",
    label: "Buyer amendment received",
    detail: "RAM 16GB → 32GB, delivery 21 → 14 days",
    timestamp: "2026-06-09 11:32",
    actor: "Meridian Bank Plc",
    type: "buyer",
    status: "upcoming",
  },
]

// Orders
export interface Order {
  id: string
  poNumber: string
  quoteRef: string
  buyer: string
  buyerContact: string
  description: string
  value: string
  status: string
  supplierStatus: string
  orderedAt: string
  expectedDelivery: string
  shipment: { carrier: string; tracking: string; status: string; eta: string }
  invoiceStatus: string
}

export const orders: Order[] = [
  {
    id: "ORD-2026-0231",
    poNumber: "PO-EQ-88231",
    quoteRef: "QT-2026-0392",
    buyer: "Equator Logistics Ltd",
    buyerContact: "Grace Mwangi",
    description: "30 x Rugged Android Tablets, 8\" IP68",
    value: "GH₵27,300,000",
    status: "in-progress",
    supplierStatus: "Confirmed - In production",
    orderedAt: "2026-06-09 08:05",
    expectedDelivery: "2026-06-24",
    shipment: {
      carrier: "DHL Global Forwarding",
      tracking: "DHL-7741-22890-KE",
      status: "Awaiting pickup",
      eta: "2026-06-22",
    },
    invoiceStatus: "pending",
  },
  {
    id: "ORD-2026-0228",
    poNumber: "PO-ATL-4417",
    quoteRef: "QT-2026-0381",
    buyer: "Atlas Manufacturing",
    buyerContact: "Chinedu Eze",
    description: "40 x Zebra Rugged Barcode Scanners",
    value: "GH₵14,800,000",
    status: "in-progress",
    supplierStatus: "Shipped from OEM",
    orderedAt: "2026-06-03 14:20",
    expectedDelivery: "2026-06-15",
    shipment: {
      carrier: "Maersk Line",
      tracking: "MAEU-558120-NG",
      status: "In transit - Lagos Port",
      eta: "2026-06-13",
    },
    invoiceStatus: "uploaded",
  },
  {
    id: "ORD-2026-0220",
    poNumber: "PO-SHG-9902",
    quoteRef: "QT-2026-0370",
    buyer: "Sahel Health Group",
    buyerContact: "Tunde Bakare",
    description: "6 x APC 10kVA UPS Units",
    value: "GH₵19,200,000",
    status: "delivered",
    supplierStatus: "Delivered to OEM warehouse",
    orderedAt: "2026-05-20 09:00",
    expectedDelivery: "2026-06-02",
    shipment: {
      carrier: "Bolloré Logistics",
      tracking: "BL-330017-NG",
      status: "Delivered",
      eta: "2026-06-01",
    },
    invoiceStatus: "accepted",
  },
]

export interface DocItem {
  id: string
  name: string
  type: string
  status: "missing" | "uploaded" | "sent" | "accepted" | "rejected"
  updatedAt: string
}

export const documentPack: DocItem[] = [
  { id: "D-1", name: "Commercial Invoice", type: "Invoice", status: "uploaded", updatedAt: "2026-06-09 09:30" },
  { id: "D-2", name: "Delivery Note", type: "Logistics", status: "sent", updatedAt: "2026-06-09 09:35" },
  { id: "D-3", name: "Waybill", type: "Logistics", status: "uploaded", updatedAt: "2026-06-09 09:36" },
  { id: "D-4", name: "Proof of Delivery", type: "Logistics", status: "missing", updatedAt: "—" },
  { id: "D-5", name: "Warranty Document", type: "Compliance", status: "accepted", updatedAt: "2026-06-08 16:10" },
  { id: "D-6", name: "Product Datasheets", type: "Reference", status: "sent", updatedAt: "2026-06-08 12:05" },
  { id: "D-7", name: "Certificate of Origin", type: "Compliance", status: "missing", updatedAt: "—" },
]

export interface Buyer {
  id: string
  company: string
  contact: string
  email: string
  sector: string
  openRfqs: number
  activeOrders: number
  lifetimeValue: string
  rfqEmail: string
}

export const buyers: Buyer[] = [
  {
    id: "B-1",
    company: "Meridian Bank Plc",
    contact: "Adaeze Okafor",
    email: "a.okafor@meridianbank.com",
    sector: "Financial Services",
    openRfqs: 1,
    activeOrders: 0,
    lifetimeValue: "GH₵210,400,000",
    rfqEmail: "meridian.rfq@inbox.wekbench.com",
  },
  {
    id: "B-2",
    company: "Sahel Health Group",
    contact: "Tunde Bakare",
    email: "procurement@sahelhealth.org",
    sector: "Healthcare",
    openRfqs: 1,
    activeOrders: 1,
    lifetimeValue: "GH₵156,800,000",
    rfqEmail: "sahel.rfq@inbox.wekbench.com",
  },
  {
    id: "B-3",
    company: "Equator Logistics Ltd",
    contact: "Grace Mwangi",
    email: "g.mwangi@equatorlogistics.co.ke",
    sector: "Logistics",
    openRfqs: 0,
    activeOrders: 1,
    lifetimeValue: "GH₵98,200,000",
    rfqEmail: "equator.rfq@inbox.wekbench.com",
  },
  {
    id: "B-4",
    company: "Atlas Manufacturing",
    contact: "Chinedu Eze",
    email: "c.eze@atlasmfg.com",
    sector: "Manufacturing",
    openRfqs: 1,
    activeOrders: 1,
    lifetimeValue: "GH₵142,600,000",
    rfqEmail: "atlas.rfq@inbox.wekbench.com",
  },
  {
    id: "B-5",
    company: "Coastal Telecoms",
    contact: "Fatima Bello",
    email: "f.bello@coastaltel.ng",
    sector: "Telecommunications",
    openRfqs: 1,
    activeOrders: 0,
    lifetimeValue: "GH₵67,900,000",
    rfqEmail: "coastal.rfq@inbox.wekbench.com",
  },
]

export interface Supplier {
  id: string
  name: string
  type: string
  oems: string[]
  leadTime: string
  reliability: number
  region: string
}

export const suppliers: Supplier[] = [
  {
    id: "S-1",
    name: "Redington Gulf",
    type: "Authorized Distributor",
    oems: ["Dell", "Microsoft", "VMware"],
    leadTime: "10-14 days",
    reliability: 97,
    region: "Dubai, UAE",
  },
  {
    id: "S-2",
    name: "Mustek Distribution",
    type: "Authorized Distributor",
    oems: ["HP", "Lenovo", "Acer"],
    leadTime: "7-10 days",
    reliability: 94,
    region: "Johannesburg, ZA",
  },
  {
    id: "S-3",
    name: "Pinnacle Technology",
    type: "Distributor",
    oems: ["Lenovo", "Cisco", "APC"],
    leadTime: "14-18 days",
    reliability: 91,
    region: "Nairobi, KE",
  },
  {
    id: "S-4",
    name: "TD SYNNEX MEA",
    type: "Authorized Distributor",
    oems: ["Cisco", "APC", "Zebra", "HP"],
    leadTime: "9-12 days",
    reliability: 96,
    region: "Cairo, EG",
  },
]

export const quotesList = [
  {
    id: "QT-2026-0418",
    buyer: "Meridian Bank Plc",
    subject: "25 x Dell Latitude Laptops",
    value: "GH₵53,115,625",
    status: "awaiting-approval",
    version: "v1",
    date: "2026-06-09",
    validUntil: "2026-06-30",
  },
  {
    id: "QT-2026-0392",
    buyer: "Equator Logistics Ltd",
    subject: "30 x Rugged Tablets",
    value: "GH₵27,300,000",
    status: "po-received",
    version: "v2",
    date: "2026-06-01",
    validUntil: "2026-06-21",
  },
  {
    id: "QT-2026-0381",
    buyer: "Atlas Manufacturing",
    subject: "40 x Barcode Scanners",
    value: "GH₵14,800,000",
    status: "approved",
    version: "v1",
    date: "2026-05-28",
    validUntil: "2026-06-18",
  },
  {
    id: "QT-2026-0370",
    buyer: "Sahel Health Group",
    subject: "6 x APC UPS Units",
    value: "GH₵19,200,000",
    status: "sent",
    version: "v1",
    date: "2026-05-18",
    validUntil: "2026-06-08",
  },
]

// Dashboard KPIs
export const dashboardStats = {
  openRfqs: 4,
  rfqsDueToday: 1,
  quotesAwaitingApproval: 1,
  ordersInProgress: 2,
  invoicesPending: 1,
  buyerUpdatesDetected: 1,
  missingDocuments: 3,
}

export const todaysPriorities = [
  {
    id: "P-1",
    title: "Buyer amendment on RFQ-2026-0418",
    detail: "Meridian Bank changed RAM to 32GB and shortened delivery to 14 days",
    action: "Review & accept update",
    tone: "warning" as const,
    href: "/rfq/RFQ-2026-0418?tab=communication",
  },
  {
    id: "P-2",
    title: "Quote QT-2026-0418 awaiting approval",
    detail: "GH₵53.1M quote for Meridian Bank pending manager sign-off",
    action: "View approval",
    tone: "info" as const,
    href: "/quotes",
  },
  {
    id: "P-3",
    title: "New PO from Equator Logistics",
    detail: "PO-EQ-88231 detected, ready to convert to order",
    action: "Convert to order",
    tone: "accent" as const,
    href: "/orders",
  },
  {
    id: "P-4",
    title: "RFQ-2026-0408 due today",
    detail: "Coastal Telecoms server rack RFQ needs pricing finalized",
    action: "Finalize pricing",
    tone: "danger" as const,
    href: "/rfq/RFQ-2026-0408",
  },
]

// Indicative ocean/air freight line rates into Ghana. There is no free public
// live freight-rate API, so these are curated indicative figures (USD).
export type ShippingRate = {
  id: string
  lane: string
  origin: string
  mode: "Ocean FCL" | "Ocean LCL" | "Air"
  unit: string
  rate: number
  transitDays: string
  trend: "up" | "down" | "flat"
  changePct: number
}

export const shippingRates: ShippingRate[] = [
  {
    id: "SR-1",
    lane: "Shanghai → Tema",
    origin: "CN",
    mode: "Ocean FCL",
    unit: "per 40' HC",
    rate: 3450,
    transitDays: "32–38 days",
    trend: "up",
    changePct: 4.2,
  },
  {
    id: "SR-2",
    lane: "Rotterdam → Tema",
    origin: "NL",
    mode: "Ocean FCL",
    unit: "per 40' HC",
    rate: 2180,
    transitDays: "18–22 days",
    trend: "down",
    changePct: 2.1,
  },
  {
    id: "SR-3",
    lane: "Jebel Ali → Tema",
    origin: "AE",
    mode: "Ocean FCL",
    unit: "per 40' HC",
    rate: 2890,
    transitDays: "26–30 days",
    trend: "flat",
    changePct: 0.3,
  },
  {
    id: "SR-4",
    lane: "Shanghai → Tema",
    origin: "CN",
    mode: "Ocean LCL",
    unit: "per CBM",
    rate: 96,
    transitDays: "38–45 days",
    trend: "up",
    changePct: 1.8,
  },
  {
    id: "SR-5",
    lane: "Guangzhou → Accra (KIA)",
    origin: "CN",
    mode: "Air",
    unit: "per kg",
    rate: 6.4,
    transitDays: "5–8 days",
    trend: "down",
    changePct: 3.5,
  },
]
