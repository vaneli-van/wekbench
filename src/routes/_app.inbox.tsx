import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"
import { Link } from "@tanstack/react-router"
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
import { inboxEmails, orders, type InboxEmail } from "@/lib/data"
import { cn } from "@/lib/utils"

const typeMeta: Record<string, { label: string; tone: string }> = {
  rfq: { label: "RFQ Detected", tone: "info" },
  amendment: { label: "Amendment Detected", tone: "warning" },
  po: { label: "PO Detected", tone: "accent" },
  general: { label: "No Action Detected", tone: "neutral" },
}

const typeToneClass: Record<string, string> = {
  info: "text-info bg-info/10 border-info/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  accent: "text-accent bg-accent/10 border-accent/20",
  neutral: "text-muted-foreground bg-muted border-border",
}

function AttachmentIcon({ type }: { type: string }) {
  if (type === "xlsx") return <FileSpreadsheet className="size-4 text-success" />
  return <FileText className="size-4 text-destructive" />
}

function InboxPage() {
  const [selected, setSelected] = useState<InboxEmail | null>(inboxEmails[1])
  const [copied, setCopied] = useState(false)
  const toolboxEmail = "meridian.toolbox@toolbox.westernpremium.com"

  const copyEmail = () => {
    navigator.clipboard?.writeText(toolboxEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Resolve a detected PO/quote reference to the real order it created.
  const matchedOrder =
    selected?.type === "po"
      ? orders.find((o) => o.quoteRef === selected.detectedRef || o.poNumber === selected.detectedRef)
      : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="In Toolbox"
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
        {/* Email list */}
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="size-4 text-muted-foreground" />
              Captured Emails
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {inboxEmails.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">3 need attention</span>
          </div>
          <ul className="divide-y divide-border">
            {inboxEmails.map((email) => {
              const meta = typeMeta[email.type]
              const active = selected?.id === email.id
              return (
                <li key={email.id}>
                  <button
                    onClick={() => setSelected(email)}
                    className={cn(
                      "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40",
                      active && "bg-muted/60",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {email.unread ? (
                        <Mail className="size-4 text-accent" />
                      ) : (
                        <MailOpen className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm text-foreground",
                            email.unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {email.sender}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">{email.receivedRelative}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{email.buyerCompany}</p>
                      <p className="mt-1 truncate text-sm text-foreground">{email.subject}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{email.preview}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            typeToneClass[meta.tone],
                          )}
                        >
                          <Sparkles className="size-3" />
                          {meta.label}
                        </span>
                        {email.detectedRef && (
                          <span className="font-mono text-[11px] text-muted-foreground">{email.detectedRef}</span>
                        )}
                        {email.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Paperclip className="size-3" />
                            {email.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Detail / action panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {selected ? (
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selected.sender}</p>
                    <p className="text-xs text-muted-foreground">{selected.senderEmail}</p>
                  </div>
                  <StatusBadge status={selected.status === "processed" ? "approved" : "new"} />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground text-pretty">{selected.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.buyerCompany} · Received {selected.receivedAt}
                </p>
              </div>

              <div className="space-y-4 px-5 py-4">
                <p className="text-sm text-muted-foreground text-pretty">{selected.preview}</p>

                {selected.attachments.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Attachments
                    </p>
                    <ul className="space-y-1.5">
                      {selected.attachments.map((a) => (
                        <li
                          key={a.name}
                          className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2"
                        >
                          <AttachmentIcon type={a.type} />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.name}</span>
                          <span className="text-xs text-muted-foreground">{a.size}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI classification */}
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <Sparkles className="size-3.5" />
                    wekbench Suggestion
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {selected.type === "rfq" &&
                      `Classified as a new RFQ${selected.detectedRef ? ` (${selected.detectedRef})` : ""}. Extract line items and create an RFQ.`}
                    {selected.type === "amendment" &&
                      `Detected as an amendment to ${selected.detectedRef}. Link to the existing RFQ and review the changes.`}
                    {selected.type === "po" &&
                      (matchedOrder
                        ? `Detected as a Purchase Order against ${selected.detectedRef}. Already converted to order ${matchedOrder.id} — open to track fulfilment.`
                        : `Detected as a Purchase Order linked to ${selected.detectedRef}. Convert the quote into an order.`)}
                    {selected.type === "general" && "No RFQ, amendment, or PO detected. You can safely ignore this."}                  </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 gap-2">
                  {selected.type === "rfq" &&
                    (selected.detectedRef ? (
                      <Link
                        to={`/rfq/${selected.detectedRef}`}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                      >
                        <Plus className="size-4" />
                        Open {selected.detectedRef}
                      </Link>
                    ) : (
                      <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                        <Plus className="size-4" />
                        Create RFQ
                      </button>
                    ))}

                  {selected.type === "amendment" && (
                    <Link
                      to={
                        selected.detectedRef
                          ? `/rfq/${selected.detectedRef}?tab=communication`
                          : "/quotes"
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-warning px-3 py-2 text-sm font-medium text-warning-foreground hover:opacity-90"
                    >
                      <RefreshCcw className="size-4" />
                      {selected.detectedRef ? `Apply to ${selected.detectedRef}` : "Apply Amendment"}
                    </Link>
                  )}

                  {selected.type === "po" &&
                    (matchedOrder ? (
                      <Link
                        to="/orders/$id"
                        params={{ id: matchedOrder.id }}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                      >
                        <ShoppingCart className="size-4" />
                        Open {matchedOrder.id}
                      </Link>
                    ) : (
                      <Link
                        to="/orders"
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                      >
                        <ShoppingCart className="size-4" />
                        Convert to Order
                      </Link>
                    ))}

                  {selected.type === "general" && (
                    <button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                      <Plus className="size-4" />
                      Pull into RFQ
                    </button>
                  )}

                  <button className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    <Link2 className="size-4" />
                    Link to Existing Record
                  </button>
                  <button className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
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
