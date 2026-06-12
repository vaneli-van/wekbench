import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { buyers } from "@/lib/data"
import { AtSign, Copy, CheckCircle2, Inbox, Sparkles, ShieldCheck } from "lucide-react"

function EmailCapturePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Email Capture"
        description="wekbench monitors dedicated inboxes, extracts details from attachments — RFQs, purchase orders, amendments and more — and routes each email to the right buyer account automatically."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-info/10 text-info">
            <Inbox className="size-5" />
          </span>
          <h3 className="mt-3 font-semibold">1. Forward or BCC</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Buyers email your capture address directly, or your team forwards inbound documents. Each buyer gets a
            unique address.
          </p>
        </Card>
        <Card className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Sparkles className="size-5" />
          </span>
          <h3 className="mt-3 font-semibold">2. AI extraction</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Attachments (PDF, XLSX, DOCX) are parsed into structured line items with quantities, specs, and detected
            reference numbers.
          </p>
        </Card>
        <Card className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <h3 className="mt-3 font-semibold">3. Auto-route</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails are matched to the correct buyer and surfaced in My Wekbench, ready for review and routing.
          </p>
        </Card>
      </div>

      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AtSign className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold">Master capture address</h3>
              <p className="text-sm text-muted-foreground">Anything sent here is auto-classified by sender domain.</p>
            </div>
          </div>
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            <ShieldCheck className="size-3" />
            Active
          </Badge>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
          <code className="truncate text-sm">capture@inbox.wekbench.app</code>
          <Button variant="ghost" size="sm" className="gap-1.5 shrink-0">
            <Copy className="size-3.5" />
            Copy
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Per-buyer capture addresses
      </h2>
      <Card className="divide-y divide-border">
        {buyers.map((b) => (
          <div key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{b.company}</p>
              <code className="text-xs text-muted-foreground">{b.rfqEmail}</code>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                Routing on
              </Badge>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Copy className="size-3.5" />
                Copy
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}


export const Route = createFileRoute("/_app/email-capture")({
  component: EmailCapturePage,
});
