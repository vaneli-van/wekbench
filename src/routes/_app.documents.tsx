import { createFileRoute } from "@tanstack/react-router";
import { FileText, FileSpreadsheet, FileCheck, Download, Upload, Send, CircleDashed } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { documentPack } from "@/lib/data"

const checklistStats = [
  { label: "Accepted", count: documentPack.filter((d) => d.status === "accepted").length, tone: "text-success" },
  { label: "Sent", count: documentPack.filter((d) => d.status === "sent").length, tone: "text-info" },
  { label: "Uploaded", count: documentPack.filter((d) => d.status === "uploaded").length, tone: "text-foreground" },
  { label: "Missing", count: documentPack.filter((d) => d.status === "missing").length, tone: "text-destructive" },
]

const docIcon = (type: string) => {
  if (type === "Invoice") return FileSpreadsheet
  if (type === "Compliance") return FileCheck
  return FileText
}

const statusAction = (status: string) => {
  switch (status) {
    case "missing":
      return { label: "Upload", icon: Upload }
    case "uploaded":
      return { label: "Send", icon: Send }
    case "sent":
      return { label: "Download", icon: Download }
    default:
      return { label: "Download", icon: Download }
  }
}

function DocumentsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Invoice & Document Pack"
        description="Order ORD-2026-0231 · Equator Logistics. Generate, send and track every document the buyer needs to accept delivery."
        actions={
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <FileText className="size-4" />
            Generate Invoice
          </button>
        }
      />

      {/* Checklist summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {checklistStats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className={`text-3xl font-semibold tabular-nums ${s.tone}`}>{s.count}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Document checklist */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Document Checklist</h2>
          <span className="text-xs text-muted-foreground">{documentPack.length} documents</span>
        </div>
        <ul className="divide-y divide-border">
          {documentPack.map((doc) => {
            const Icon = docIcon(doc.type)
            const action = statusAction(doc.status)
            const ActionIcon = action.icon
            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · Updated {doc.updatedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <StatusBadge status={doc.status} />
                  <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                    <ActionIcon className="size-3.5" />
                    {action.label}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <CircleDashed className="size-3.5" />
        Every document action is timestamped and recorded in the order audit trail.
      </p>
    </div>
  )
}


export const Route = createFileRoute("/_app/documents")({
  component: DocumentsPage,
});
