export type ProductSource = "curated" | "supplier-feed" | "public" | "vendor-uploaded"
export type Availability = "in-stock" | "low-stock" | "out-of-stock" | "on-request"
export type AuthStatus = "authorised" | "unauthorised" | "pending"

export interface PricePoint {
  date: string
  supplier: string
  price: number
}

export interface Equivalent {
  brand: string
  model: string
  note: string
  priceDelta: number // percentage vs current
}

export interface QuoteHistoryEntry {
  quoteId: string
  buyer: string
  date: string
  quantity: number
  unitPrice: number
  outcome: "won" | "lost" | "pending"
}

export interface CatalogProduct {
  id: string
  brand: string
  model: string
  description: string
  category: string
  categoryPath: string[]
  supplier: string
  currency: string
  price: number
  leadTime: string
  source: ProductSource
  availability: Availability
  authStatus: AuthStatus
  preferred: boolean
  hidden: boolean
  updatedAt: string
  image: string
  specs: { label: string; value: string }[]
  datasheetName: string
  priceHistory: PricePoint[]
  equivalents: Equivalent[]
  quoteHistory: QuoteHistoryEntry[]
}

export const categoryTree: { name: string; count: number; children?: { name: string; count: number }[] }[] = [
  {
    name: "Computing",
    count: 1840,
    children: [
      { name: "Laptops", count: 720 },
      { name: "Desktops", count: 410 },
      { name: "Workstations", count: 190 },
      { name: "Tablets", count: 520 },
    ],
  },
  {
    name: "Networking",
    count: 1230,
    children: [
      { name: "Switches", count: 480 },
      { name: "Routers", count: 320 },
      { name: "Access Points", count: 280 },
      { name: "Firewalls", count: 150 },
    ],
  },
  {
    name: "Power & UPS",
    count: 640,
    children: [
      { name: "UPS Systems", count: 290 },
      { name: "Inverters", count: 210 },
      { name: "Surge Protection", count: 140 },
    ],
  },
  {
    name: "Data Center",
    count: 510,
    children: [
      { name: "Server Racks", count: 180 },
      { name: "Cooling", count: 150 },
      { name: "Cabling", count: 180 },
    ],
  },
  {
    name: "Peripherals",
    count: 980,
    children: [
      { name: "Monitors", count: 420 },
      { name: "Printers", count: 310 },
      { name: "Scanners", count: 250 },
    ],
  },
]

export const catalogBrands = [
  "Dell",
  "HP",
  "Lenovo",
  "Cisco",
  "APC",
  "Zebra",
  "Microsoft",
  "Eaton",
  "Ubiquiti",
  "Fortinet",
]

export const catalogSuppliers = [
  "Redington Gulf",
  "Mustek Distribution",
  "Pinnacle Technology",
  "TD SYNNEX MEA",
  "Internal Stock",
]

export const sourceLabels: Record<ProductSource, string> = {
  curated: "Curated",
  "supplier-feed": "Supplier feed",
  public: "Public",
  "vendor-uploaded": "Vendor-uploaded",
}

export const availabilityLabels: Record<Availability, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
  "on-request": "On request",
}

export const authStatusLabels: Record<AuthStatus, string> = {
  authorised: "Authorised",
  unauthorised: "Unauthorised",
  pending: "Pending review",
}

function history(base: number, suppliers: string[]): PricePoint[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
  const points: PricePoint[] = []
  months.forEach((m, i) => {
    suppliers.forEach((s, si) => {
      const drift = 1 + (i * 0.012 - 0.02) + si * 0.03
      points.push({ date: m, supplier: s, price: Math.round((base * drift) / 1000) * 1000 })
    })
  })
  return points
}

export const catalogProducts: CatalogProduct[] = [
  {
    id: "SKU-100482",
    brand: "Dell",
    model: "Latitude 5450",
    description: 'Business Laptop, Intel Core i7-1355U, 16GB RAM, 512GB SSD, 14" FHD, Windows 11 Pro',
    category: "Laptops",
    categoryPath: ["Computing", "Laptops"],
    supplier: "Redington Gulf",
    currency: "USD",
    price: 1180,
    leadTime: "10-14 days",
    source: "curated",
    availability: "in-stock",
    authStatus: "authorised",
    preferred: true,
    hidden: false,
    updatedAt: "2026-06-08",
    image: "/dell-latitude-laptop.png",
    specs: [
      { label: "Processor", value: "Intel Core i7-1355U (10 cores)" },
      { label: "Memory", value: "16GB DDR5" },
      { label: "Storage", value: "512GB PCIe NVMe SSD" },
      { label: "Display", value: '14" FHD (1920x1080) Anti-glare' },
      { label: "Graphics", value: "Intel Iris Xe" },
      { label: "OS", value: "Windows 11 Pro" },
      { label: "Warranty", value: "3-Year ProSupport" },
      { label: "Weight", value: "1.36 kg" },
    ],
    datasheetName: "Dell-Latitude-5450-Datasheet.pdf",
    priceHistory: history(1180, ["Redington Gulf", "Mustek Distribution"]),
    equivalents: [
      { brand: "HP", model: "EliteBook 640 G11", note: "Comparable spec, faster SSD", priceDelta: 4 },
      { brand: "Lenovo", model: "ThinkPad L14 Gen 5", note: "Lower cost alternative", priceDelta: -6 },
    ],
    quoteHistory: [
      { quoteId: "Q-2026-0418", buyer: "Meridian Bank Plc", date: "2026-06-08", quantity: 25, unitPrice: 1450, outcome: "pending" },
      { quoteId: "Q-2026-0331", buyer: "Atlas Manufacturing", date: "2026-05-21", quantity: 12, unitPrice: 1410, outcome: "won" },
      { quoteId: "Q-2026-0288", buyer: "Sahel Health Group", date: "2026-04-30", quantity: 8, unitPrice: 1395, outcome: "lost" },
    ],
  },
  {
    id: "SKU-100517",
    brand: "HP",
    model: "EliteBook 640 G11",
    description: 'Business Laptop, Intel Core i7-1365U, 16GB RAM, 1TB SSD, 14" WUXGA, Windows 11 Pro',
    category: "Laptops",
    categoryPath: ["Computing", "Laptops"],
    supplier: "Mustek Distribution",
    currency: "USD",
    price: 1245,
    leadTime: "7-10 days",
    source: "supplier-feed",
    availability: "in-stock",
    authStatus: "authorised",
    preferred: false,
    hidden: false,
    updatedAt: "2026-06-09",
    image: "/hp-elitebook-laptop.png",
    specs: [
      { label: "Processor", value: "Intel Core i7-1365U" },
      { label: "Memory", value: "16GB DDR5" },
      { label: "Storage", value: "1TB PCIe NVMe SSD" },
      { label: "Display", value: '14" WUXGA (1920x1200)' },
      { label: "OS", value: "Windows 11 Pro" },
      { label: "Warranty", value: "3-Year Next Business Day" },
    ],
    datasheetName: "HP-EliteBook-640-G11.pdf",
    priceHistory: history(1245, ["Mustek Distribution", "TD SYNNEX MEA"]),
    equivalents: [
      { brand: "Dell", model: "Latitude 5450", note: "Preferred, lower cost", priceDelta: -5 },
    ],
    quoteHistory: [
      { quoteId: "Q-2026-0401", buyer: "Coastal Telecoms", date: "2026-05-28", quantity: 15, unitPrice: 1520, outcome: "won" },
    ],
  },
  {
    id: "SKU-200310",
    brand: "Cisco",
    model: "Catalyst C9300-48P",
    description: "48-Port Gigabit PoE+ Managed Switch, Layer 3, Stackable, Enterprise",
    category: "Switches",
    categoryPath: ["Networking", "Switches"],
    supplier: "TD SYNNEX MEA",
    currency: "USD",
    price: 4850,
    leadTime: "9-12 days",
    source: "curated",
    availability: "low-stock",
    authStatus: "authorised",
    preferred: true,
    hidden: false,
    updatedAt: "2026-06-07",
    image: "/cisco-network-switch.png",
    specs: [
      { label: "Ports", value: "48 x 1G PoE+" },
      { label: "Uplinks", value: "4 x 10G SFP+" },
      { label: "Layer", value: "Layer 3" },
      { label: "Switching Capacity", value: "208 Gbps" },
      { label: "Stackable", value: "Yes (StackWise-480)" },
      { label: "PoE Budget", value: "437W" },
    ],
    datasheetName: "Cisco-Catalyst-9300-48P.pdf",
    priceHistory: history(4850, ["TD SYNNEX MEA", "Pinnacle Technology"]),
    equivalents: [
      { brand: "Ubiquiti", model: "USW-Pro-48-PoE", note: "Budget alternative", priceDelta: -42 },
      { brand: "HP", model: "Aruba 6300M", note: "Comparable enterprise", priceDelta: -12 },
    ],
    quoteHistory: [
      { quoteId: "Q-2026-0415", buyer: "Sahel Health Group", date: "2026-06-07", quantity: 12, unitPrice: 5400, outcome: "pending" },
    ],
  },
  {
    id: "SKU-300145",
    brand: "APC",
    model: "Smart-UPS SRT 10kVA",
    description: "10kVA Online Double-Conversion UPS, Rack-mount, 230V, with Network Card",
    category: "UPS Systems",
    categoryPath: ["Power & UPS", "UPS Systems"],
    supplier: "Pinnacle Technology",
    currency: "USD",
    price: 6200,
    leadTime: "14-18 days",
    source: "supplier-feed",
    availability: "on-request",
    authStatus: "authorised",
    preferred: false,
    hidden: false,
    updatedAt: "2026-06-05",
    image: "/apc-ups-power-unit.png",
    specs: [
      { label: "Capacity", value: "10kVA / 10kW" },
      { label: "Topology", value: "Online Double Conversion" },
      { label: "Form Factor", value: "Rack-mount 6U" },
      { label: "Input Voltage", value: "230V" },
      { label: "Runtime", value: "8 min at full load" },
    ],
    datasheetName: "APC-SRT-10kVA.pdf",
    priceHistory: history(6200, ["Pinnacle Technology", "TD SYNNEX MEA"]),
    equivalents: [
      { brand: "Eaton", model: "9PX 10kVA", note: "Comparable, better runtime", priceDelta: 8 },
    ],
    quoteHistory: [
      { quoteId: "Q-2026-0408", buyer: "Coastal Telecoms", date: "2026-06-04", quantity: 8, unitPrice: 7100, outcome: "pending" },
    ],
  },
  {
    id: "SKU-400221",
    brand: "Zebra",
    model: "TC22 Rugged Scanner",
    description: "2D Imager Rugged Barcode Scanner, Android, Bluetooth, IP65 Rated",
    category: "Scanners",
    categoryPath: ["Peripherals", "Scanners"],
    supplier: "TD SYNNEX MEA",
    currency: "USD",
    price: 720,
    leadTime: "9-12 days",
    source: "curated",
    availability: "in-stock",
    authStatus: "pending",
    preferred: false,
    hidden: false,
    updatedAt: "2026-06-03",
    image: "/zebra-barcode-scanner.png",
    specs: [
      { label: "Scan Engine", value: "2D Imager SE4100" },
      { label: "Connectivity", value: "Bluetooth 5.0, Wi-Fi 6" },
      { label: "Rating", value: "IP65" },
      { label: "OS", value: "Android 13" },
      { label: "Battery", value: "3300 mAh" },
    ],
    datasheetName: "Zebra-TC22.pdf",
    priceHistory: history(720, ["TD SYNNEX MEA", "Redington Gulf"]),
    equivalents: [
      { brand: "Zebra", model: "TC27", note: "5G variant", priceDelta: 18 },
    ],
    quoteHistory: [
      { quoteId: "Q-2026-0411", buyer: "Atlas Manufacturing", date: "2026-06-05", quantity: 40, unitPrice: 880, outcome: "pending" },
    ],
  },
  {
    id: "SKU-500098",
    brand: "Lenovo",
    model: "ThinkPad L14 Gen 5",
    description: 'Business Laptop, AMD Ryzen 7 PRO, 16GB RAM, 512GB SSD, 14" FHD, Windows 11 Pro',
    category: "Laptops",
    categoryPath: ["Computing", "Laptops"],
    supplier: "Pinnacle Technology",
    currency: "USD",
    price: 1095,
    leadTime: "14-18 days",
    source: "vendor-uploaded",
    availability: "in-stock",
    authStatus: "authorised",
    preferred: false,
    hidden: false,
    updatedAt: "2026-05-30",
    image: "/lenovo-thinkpad-laptop.png",
    specs: [
      { label: "Processor", value: "AMD Ryzen 7 PRO 7840U" },
      { label: "Memory", value: "16GB DDR5" },
      { label: "Storage", value: "512GB SSD" },
      { label: "Display", value: '14" FHD' },
      { label: "OS", value: "Windows 11 Pro" },
    ],
    datasheetName: "Lenovo-ThinkPad-L14-G5.pdf",
    priceHistory: history(1095, ["Pinnacle Technology", "Mustek Distribution"]),
    equivalents: [
      { brand: "Dell", model: "Latitude 5450", note: "Preferred", priceDelta: 8 },
    ],
    quoteHistory: [],
  },
  {
    id: "SKU-600412",
    brand: "Dell",
    model: "PowerEdge R760",
    description: "2U Rack Server, Dual Intel Xeon Gold, 128GB RAM, 4x 960GB SSD",
    category: "Server Racks",
    categoryPath: ["Data Center", "Server Racks"],
    supplier: "Redington Gulf",
    currency: "USD",
    price: 12400,
    leadTime: "10-14 days",
    source: "curated",
    availability: "out-of-stock",
    authStatus: "authorised",
    preferred: true,
    hidden: false,
    updatedAt: "2026-06-01",
    image: "/rack-server.png",
    specs: [
      { label: "Form Factor", value: "2U Rack" },
      { label: "Processor", value: "2x Intel Xeon Gold 6430" },
      { label: "Memory", value: "128GB DDR5 ECC" },
      { label: "Storage", value: "4x 960GB SSD" },
    ],
    datasheetName: "Dell-PowerEdge-R760.pdf",
    priceHistory: history(12400, ["Redington Gulf", "TD SYNNEX MEA"]),
    equivalents: [
      { brand: "HP", model: "ProLiant DL380 Gen11", note: "Comparable", priceDelta: 6 },
    ],
    quoteHistory: [],
  },
  {
    id: "SKU-700233",
    brand: "Microsoft",
    model: "Surface Pro 10",
    description: 'Tablet, Intel Core Ultra 5, 16GB RAM, 256GB SSD, 13" PixelSense, Windows 11 Pro',
    category: "Tablets",
    categoryPath: ["Computing", "Tablets"],
    supplier: "Internal Stock",
    currency: "USD",
    price: 1320,
    leadTime: "In stock",
    source: "vendor-uploaded",
    availability: "in-stock",
    authStatus: "authorised",
    preferred: false,
    hidden: true,
    updatedAt: "2026-05-25",
    image: "/microsoft-surface-tablet.jpg",
    specs: [
      { label: "Processor", value: "Intel Core Ultra 5 135U" },
      { label: "Memory", value: "16GB LPDDR5" },
      { label: "Storage", value: "256GB SSD" },
      { label: "Display", value: '13" PixelSense Flow' },
    ],
    datasheetName: "Surface-Pro-10.pdf",
    priceHistory: history(1320, ["Internal Stock"]),
    equivalents: [],
    quoteHistory: [],
  },
]

export interface SupplierFeed {
  id: string
  name: string
  type: string
  lastSync: string
  skuCount: number
  status: "healthy" | "stale" | "error"
}

export const supplierFeeds: SupplierFeed[] = [
  { id: "F-1", name: "Redington Gulf API", type: "Live API", lastSync: "12 min ago", skuCount: 4820, status: "healthy" },
  { id: "F-2", name: "Mustek Distribution CSV", type: "Daily CSV", lastSync: "6 hours ago", skuCount: 3110, status: "healthy" },
  { id: "F-3", name: "Pinnacle Technology Feed", type: "Live API", lastSync: "2 days ago", skuCount: 1980, status: "stale" },
  { id: "F-4", name: "TD SYNNEX MEA", type: "Weekly CSV", lastSync: "5 days ago", skuCount: 2640, status: "error" },
]

export const catalogStats = {
  totalSkus: 5180,
  lastUpdated: "2026-06-09 08:42",
}
