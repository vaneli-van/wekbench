import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useServerFn } from "@tanstack/react-start"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { runExtraction } from "@/lib/api/extraction.functions"
import {
  Paperclip,
  FileText,
  FileSpreadsheet,
  Mail,
  MailOpen,
  Sparkles,
  Plus,
  Link2,
  RefreshCcw,
  ShoppingCart,
  X,
  AtSign,
  Copy,
  Check,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/foundations/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/integrations/supabase/client"
import { useWorkspaceId } from "@/hooks/use-workspace"
import { cn } from "@/lib/utils"

type DocType = "rfq" | "purchase_order" | "rfq_amendment" | "po_amendment" | "unknown"
type InboxType = "rfq" | "amendment" | "po" | "general" | "pending"

type AttachmentMeta = {
  filename?: string
  name?: string
  contentType?: string
  size?: number
  path?: string
  type?: string
}

type ExtractedDoc = {
  id: string
  doc_type: DocType
  confidence: number | null
  summary: string | null
  buyer_ref: string | null
  status: string | null
}

type InboxRow = {
  id: string
  to_address: string
  from_address: string
  from_name: string | null
  subject: string | null
  text_body: string | null
  html_body: string | null
  attachments: unknown
  status: string
  extraction_status: string | null
  received_at: string
  created_at: string
  extracted_documents: ExtractedDoc[] | null
}

const typeMeta: Record<InboxType, { label: string; tone: string }> = {
  rfq: { label: "RFQ Detected", tone: "info" },
  amendment: { label: "Amendment Detected", tone: "warning" },
  po: { label: "PO Detected", tone: "accent" },
  general: { label: "No Action Detected", tone: "neutral" },
  pending: { label: "Awaiting Extraction", tone: "neutral" },
}

const typeToneClass: Record<string, string> = {
  info: "text-info bg-info/10 border-info/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  accent: "text-accent bg-accent/10 border-accent/20",
  neutral: "text-muted-foreground bg-muted border-border",
}

function AttachmentIcon({ type }: { type: string }) {
  if (type.includes("spreadsheet") || type.includes("excel") || type === "xlsx") return <FileSpreadsheet className="size-4 text-success" />
  return <FileText className="size-4 text-destructive" />
}

function useInboxEmails(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["inbox-emails", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 15_000,
    queryFn: async (): Promise<InboxRow[]> => {
      const { data, error } = await supabase
        .from("inbound_emails")
        .select(
          "id, to_address, from_address, from_name, subject, text_body, html_body, attachments, status, extraction_status, received_at, created_at, extracted_documents(id, doc_type, confidence, summary, buyer_ref, status)",
        )
        .eq("workspace_id", workspaceId!)
        .order("received_at", { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as unknown as InboxRow[]
    },
  })
}

function useInboundAddress(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["inbound-address", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_addresses")
        .select("full_address")
        .eq("workspace_id", workspaceId!)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.full_address as string | undefined
    },
  })
}

function getAttachments(value: unknown): AttachmentMeta[] {
  return Array.isArray(value) ? (value as AttachmentMeta[]) : []
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function previewFor(email: InboxRow) {
  return (email.text_body ?? stripHtml(email.html_body ?? "") ?? "").trim() || "No message body captured."
}

function formatBytes(value?: number) {
  if (!value) return "—"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function docTypeToInboxType(doc?: ExtractedDoc | null): InboxType {
  if (!doc) return "pending"
  if (doc.doc_type === "rfq") return "rfq"
  if (doc.doc_type === "purchase_order") return "po"
  if (doc.doc_type === "rfq_amendment" || doc.doc_type === "po_amendment") return "amendment"
  return "general"
}

function suggestionFor(type: InboxType, doc: ExtractedDoc | null) {
  if (type === "pending") return "Email captured. Classification is queued and will appear here once extraction completes."
  if (type === "rfq") return `Classified as a new RFQ${doc?.buyer_ref ? ` (${doc.buyer_ref})` : ""}. Review the request and create an RFQ record.`
  if (type === "amendment") return `Detected as an amendment${doc?.buyer_ref ? ` to ${doc.buyer_ref}` : ""}. Link it to the existing record and review the changes.`
  if (type === "po") return `Detected as a Purchase Order${doc?.buyer_ref ? ` linked to ${doc.buyer_ref}` : ""}. Convert the quote into an order.`
  return "No RFQ, amendment, or PO detected. You can safely ignore this."
}

function formatReceived(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}

function InboxPage() {
  const { data: workspaceId, isLoading: workspaceLoading } = useWorkspaceId()
  const { data: inboxEmails, isLoading, error } = useInboxEmails(workspaceId)
  const { data: inboundAddress } = useInboundAddress(workspaceId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const emails = inboxEmails ?? []
  const selected = useMemo(
    () => emails.find((email) => email.id === selectedId) ?? emails[0] ?? null,
    [emails, selectedId],
  )
  const toolboxEmail = inboundAddress ?? "modec.rfq@inbox.wekbench.com"

  const copyEmail = () => {
    navigator.clipboard?.writeText(toolboxEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const loading = workspaceLoading || isLoading
  const needsAttention = emails.filter((email) => email.extraction_status !== "done").length
  const selectedDoc = selected?.extracted_documents?.[0] ?? null
  const selectedType = docTypeToInboxType(selectedDoc)
  const selectedAttachments = getAttachments(selected?.attachments)

  const queryClient = useQueryClient()
  const runExtractionFn = useServerFn(runExtraction)
  const retryMutation = useMutation({
    mutationFn: (emailId: string) => runExtractionFn({ data: { emailId } }),
    onSuccess: () => {
      toast.success("Extraction completed")
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] })
      queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Extraction failed"
      toast.error(msg)
    },
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="My Wekbench"
        description="Inbound emails captured through your unique wekbench addresses. wekbench classifies each message — RFQs, purchase orders, amendments and more — and suggests the next action."
        actions={
          <button
            onClick={copyEmail}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <AtSign className="size-4 text-accent" />
            <span className="font-mono text-xs">{toolboxEmail}</span>
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4 text-muted-foreground" />}
          </button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="size-4 text-muted-foreground" />
              Captured Emails
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {emails.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{needsAttention} need attention</span>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <EmptyState icon={MailOpen} title="Inbox could not load." description="Refresh the page and try again." />
          ) : emails.length === 0 ? (
            <EmptyState icon={MailOpen} title="No emails captured yet." description="Messages sent to your wekbench address will appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {emails.map((email) => {
                const doc = email.extracted_documents?.[0] ?? null
                const type = docTypeToInboxType(doc)
                const meta = typeMeta[type]
                const attachments = getAttachments(email.attachments)
                const active = selected?.id === email.id
                const unread = email.extraction_status !== "done"
                return (
                  <li key={email.id}>
                    <button
                      onClick={() => setSelectedId(email.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40",
                        active && "bg-muted/60",
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {unread ? <Mail className="size-4 text-accent" /> : <MailOpen className="size-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("truncate text-sm text-foreground", unread ? "font-semibold" : "font-medium")}>
                            {email.from_name ?? email.from_address}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatReceived(email.received_at)}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{email.from_address}</p>
                        <p className="mt-1 truncate text-sm text-foreground">{email.subject ?? "(no subject)"}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{doc?.summary ?? previewFor(email)}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium", typeToneClass[meta.tone])}>
                            <Sparkles className="size-3" />
                            {meta.label}
                          </span>
                          {doc?.buyer_ref && <span className="font-mono text-[11px] text-muted-foreground">{doc.buyer_ref}</span>}
                          {attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Paperclip className="size-3" />
                              {attachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Detail / action panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {selected ? (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selected.from_name ?? selected.from_address}</p>
                    <p className="text-xs text-muted-foreground">{selected.from_address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.extraction_status !== "done" && (
                      <button
                        onClick={() => retryMutation.mutate(selected.id)}
                        disabled={retryMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent/10 disabled:opacity-50"
                      >
                        <RefreshCcw className={cn("size-3", retryMutation.isPending && "animate-spin")} />
                        {retryMutation.isPending ? "Extracting…" : "Retry extraction"}
                      </button>
                    )}
                    <StatusBadge status={selected.extraction_status === "done" ? "approved" : "new"} />
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground text-pretty">{selected.subject ?? "(no subject)"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  To {selected.to_address} · Received {formatReceived(selected.received_at)}
                </p>
              </div>

              <div className="space-y-4 px-5 py-4">
                <p className="text-sm text-muted-foreground text-pretty">{selectedDoc?.summary ?? previewFor(selected)}</p>

                {selectedAttachments.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Attachments
                    </p>
                    <ul className="space-y-1.5">
                      {selectedAttachments.map((a, index) => {
                        const name = a.filename ?? a.name ?? `Attachment ${index + 1}`
                        const type = a.contentType ?? a.type ?? "file"
                        return (
                        <li
                          key={`${name}-${index}`}
                          className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2"
                        >
                          <AttachmentIcon type={type} />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
                        </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <Sparkles className="size-3.5" />
                    wekbench Suggestion
                  </div>
                  <p className="mt-1 text-sm text-foreground">{suggestionFor(selectedType, selectedDoc)}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {selectedType === "rfq" && (
                    <Link
                      to="/review-queue"
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      <Plus className="size-4" />
                      Review RFQ
                    </Link>
                  )}

                  {selectedType === "amendment" && (
                    <Link to="/review-queue" className="inline-flex items-center justify-center gap-2 rounded-md bg-warning px-3 py-2 text-sm font-medium text-warning-foreground hover:opacity-90">
                      <RefreshCcw className="size-4" />
                      Review Amendment
                    </Link>
                  )}

                  {selectedType === "po" && (
                    <Link to="/orders" className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">
                      <ShoppingCart className="size-4" />
                      Convert to Order
                    </Link>
                  )}

                  <button onClick={() => toast.info("Record picker — coming soon")} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    <Link2 className="size-4" />
                    Link to Existing Record
                  </button>
                  <button onClick={() => toast.success("Email ignored")} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                    <X className="size-4" />
                    Ignore
                  </button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  Logged to the audit trail with a timestamp on every action.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card">
              <EmptyState
                icon={MailOpen}
                title="No email selected."
                description="Select an email to see wekbench suggestions and actions."
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}


export const Route = createFileRoute("/_app/inbox")({
  component: InboxPage,
});
