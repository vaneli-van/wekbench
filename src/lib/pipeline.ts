export type PipelineStageId =
  | "drafted"
  | "submitted"
  | "clarification"
  | "reviewing"
  | "won"
  | "lost"
  | "expired"

export type PipelineQuote = {
  id: string
  title: string
  buyer: string
  sector: string
  value: number
  stage: PipelineStageId
  daysInStage: number
  lineItems: number
  attachments: number
  comments: number
  assignee: string
  createdAt: string
  updatedAt: string
}

export const PIPELINE_STAGES: { id: PipelineStageId; label: string }[] = [
  { id: "drafted", label: "Drafted" },
  { id: "submitted", label: "Submitted to buyer" },
  { id: "clarification", label: "Clarification requested" },
  { id: "reviewing", label: "Buyer reviewing" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
  { id: "expired", label: "Expired" },
]

export const ASSIGNEES = ["Samuel Adeyemi", "Ngozi Okeke", "Tunde Bello", "Amara Eze"]

export const SECTORS = ["Banking", "Logistics", "Manufacturing", "Healthcare", "Energy", "Public Sector"]

export const pipelineQuotes: PipelineQuote[] = [
  {
    id: "QT-2026-0418",
    title: "25 x Dell Latitude Business Laptops - Branch Rollout",
    buyer: "Meridian Bank Plc",
    sector: "Banking",
    value: 53115625,
    stage: "drafted",
    daysInStage: 2,
    lineItems: 7,
    attachments: 2,
    comments: 3,
    assignee: "Samuel Adeyemi",
    createdAt: "2026-06-08",
    updatedAt: "2026-06-09",
  },
  {
    id: "QT-2026-0416",
    title: "12 x HP ProDesk Workstations",
    buyer: "Atlas Manufacturing",
    sector: "Manufacturing",
    value: 18400000,
    stage: "drafted",
    daysInStage: 1,
    lineItems: 4,
    attachments: 1,
    comments: 0,
    assignee: "Tunde Bello",
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
  },
  {
    id: "QT-2026-0412",
    title: "Network switches and rack hardware",
    buyer: "Equator Logistics Ltd",
    sector: "Logistics",
    value: 9650000,
    stage: "drafted",
    daysInStage: 9,
    lineItems: 11,
    attachments: 3,
    comments: 1,
    assignee: "Ngozi Okeke",
    createdAt: "2026-05-31",
    updatedAt: "2026-06-01",
  },
  {
    id: "QT-2026-0408",
    title: "30 x Rugged Field Tablets",
    buyer: "Equator Logistics Ltd",
    sector: "Logistics",
    value: 27300000,
    stage: "submitted",
    daysInStage: 3,
    lineItems: 5,
    attachments: 2,
    comments: 4,
    assignee: "Ngozi Okeke",
    createdAt: "2026-06-04",
    updatedAt: "2026-06-07",
  },
  {
    id: "QT-2026-0405",
    title: "Server room UPS replacement",
    buyer: "Sahel Health Group",
    sector: "Healthcare",
    value: 19200000,
    stage: "submitted",
    daysInStage: 8,
    lineItems: 3,
    attachments: 1,
    comments: 2,
    assignee: "Amara Eze",
    createdAt: "2026-05-29",
    updatedAt: "2026-06-02",
  },
  {
    id: "QT-2026-0401",
    title: "40 x Barcode Scanners + docking",
    buyer: "Atlas Manufacturing",
    sector: "Manufacturing",
    value: 14800000,
    stage: "clarification",
    daysInStage: 4,
    lineItems: 6,
    attachments: 2,
    comments: 6,
    assignee: "Tunde Bello",
    createdAt: "2026-06-02",
    updatedAt: "2026-06-06",
  },
  {
    id: "QT-2026-0398",
    title: "Solar inverter bank - phase 2",
    buyer: "Savannah Power Co",
    sector: "Energy",
    value: 64500000,
    stage: "clarification",
    daysInStage: 11,
    lineItems: 9,
    attachments: 4,
    comments: 8,
    assignee: "Samuel Adeyemi",
    createdAt: "2026-05-26",
    updatedAt: "2026-05-30",
  },
  {
    id: "QT-2026-0394",
    title: "Conference room AV upgrade",
    buyer: "Meridian Bank Plc",
    sector: "Banking",
    value: 22750000,
    stage: "reviewing",
    daysInStage: 5,
    lineItems: 8,
    attachments: 3,
    comments: 5,
    assignee: "Samuel Adeyemi",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-05",
  },
  {
    id: "QT-2026-0390",
    title: "Fleet GPS tracking units (x120)",
    buyer: "Equator Logistics Ltd",
    sector: "Logistics",
    value: 31200000,
    stage: "reviewing",
    daysInStage: 12,
    lineItems: 2,
    attachments: 1,
    comments: 3,
    assignee: "Ngozi Okeke",
    createdAt: "2026-05-25",
    updatedAt: "2026-05-29",
  },
  {
    id: "QT-2026-0385",
    title: "Data centre cooling units",
    buyer: "Sahel Health Group",
    sector: "Healthcare",
    value: 47800000,
    stage: "won",
    daysInStage: 6,
    lineItems: 5,
    attachments: 2,
    comments: 2,
    assignee: "Amara Eze",
    createdAt: "2026-05-22",
    updatedAt: "2026-06-04",
  },
  {
    id: "QT-2026-0379",
    title: "Office printer fleet lease-to-own",
    buyer: "Atlas Manufacturing",
    sector: "Manufacturing",
    value: 12300000,
    stage: "won",
    daysInStage: 3,
    lineItems: 4,
    attachments: 1,
    comments: 1,
    assignee: "Tunde Bello",
    createdAt: "2026-05-30",
    updatedAt: "2026-06-07",
  },
  {
    id: "QT-2026-0372",
    title: "Biometric access control system",
    buyer: "Savannah Power Co",
    sector: "Energy",
    value: 8900000,
    stage: "lost",
    daysInStage: 14,
    lineItems: 7,
    attachments: 2,
    comments: 4,
    assignee: "Samuel Adeyemi",
    createdAt: "2026-05-18",
    updatedAt: "2026-05-27",
  },
  {
    id: "QT-2026-0366",
    title: "Warehouse forklift telematics",
    buyer: "Equator Logistics Ltd",
    sector: "Logistics",
    value: 16400000,
    stage: "expired",
    daysInStage: 21,
    lineItems: 3,
    attachments: 0,
    comments: 0,
    assignee: "Ngozi Okeke",
    createdAt: "2026-05-10",
    updatedAt: "2026-05-20",
  },
]

export function formatCedi(value: number): string {
  if (value >= 1_000_000) {
    return `GH₵${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  }
  if (value >= 1_000) {
    return `GH₵${(value / 1_000).toFixed(0)}K`
  }
  return `GH₵${value}`
}

export function formatCediFull(value: number): string {
  return `GH₵${value.toLocaleString("en-GH")}`
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
