import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  ReceiptText,
  ShoppingCart,
  Package,
  BookOpen,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FoundationSidebar } from "@/components/foundations/foundation-sidebar"
import { FoundationTopBar } from "@/components/foundations/foundation-topbar"
import { StatusBadge } from "@/components/foundations/status-badge"
import { ConfidenceBadge } from "@/components/foundations/confidence-badge"
import { SourceChips } from "@/components/foundations/source-chips"
import { LandedCostBreakdown } from "@/components/foundations/landed-cost-breakdown"
import { Timeline } from "@/components/foundations/timeline"
import { EmptyState } from "@/components/foundations/empty-state"
import { DetailDrawer } from "@/components/foundations/detail-drawer"
import { DataTable, type Column } from "@/components/foundations/data-table"

type Rfq = {
  id: string
  ref: string
  buyer: string
  items: number
  value: number
  status: { label: string; variant: "neutral" | "info" | "success" | "warning" | "error" }
}

const rfqs: Rfq[] = [
  { id: "1", ref: "RFQ-2026-0418", buyer: "Sahel Mining Corp", items: 12, value: 84500, status: { label: "New", variant: "info" } },
  { id: "2", ref: "RFQ-2026-0417", buyer: "Coastal Telecoms", items: 6, value: 23900, status: { label: "Quoted", variant: "success" } },
  { id: "3", ref: "RFQ-2026-0415", buyer: "Northern Cement", items: 21, value: 156200, status: { label: "Sourcing", variant: "warning" } },
  { id: "4", ref: "RFQ-2026-0412", buyer: "Volta Power Ltd", items: 4, value: 12300, status: { label: "Lost", variant: "error" } },
  { id: "5", ref: "RFQ-2026-0410", buyer: "Accra Water Co.", items: 9, value: 47800, status: { label: "Draft", variant: "neutral" } },
  { id: "6", ref: "RFQ-2026-0409", buyer: "Tema Logistics", items: 15, value: 92100, status: { label: "Quoted", variant: "success" } },
  { id: "7", ref: "RFQ-2026-0408", buyer: "Kumasi Steel", items: 7, value: 31400, status: { label: "Sourcing", variant: "warning" } },
]

const columns: Column<Rfq>[] = [
  { key: "ref", header: "Reference", sortable: true, sortValue: (r) => r.ref, render: (r) => <span className="font-medium text-foreground">{r.ref}</span> },
  { key: "buyer", header: "Buyer", sortable: true, sortValue: (r) => r.buyer, render: (r) => <span className="text-muted-foreground">{r.buyer}</span> },
  { key: "items", header: "Items", sortable: true, align: "right", sortValue: (r) => r.items, render: (r) => r.items },
  { key: "value", header: "Value", sortable: true, align: "right", sortValue: (r) => r.value, render: (r) => `$${r.value.toLocaleString()}` },
  { key: "status", header: "Status", render: (r) => <StatusBadge variant={r.status.variant}>{r.status.label}</StatusBadge> },
]

const costSegments = [
  { label: "Item cost", amount: 62000 },
  { label: "Shipping", amount: 9800 },
  { label: "Duty + taxes", amount: 14500 },
  { label: "Margin", amount: 18700 },
]

const timelineItems = [
  { id: "1", timestamp: "Jun 02, 09:14", actor: "Samuel A.", action: "created the order from quote WP-2026-0418", state: "done" as const },
  { id: "2", timestamp: "Jun 03, 11:40", actor: "System", action: "received supplier proforma invoice", document: { name: "proforma-inv-8841.pdf" }, state: "done" as const },
  { id: "3", timestamp: "Jun 05, 16:22", actor: "Sahel Mining", action: "confirmed deposit payment", state: "current" as const },
  { id: "4", timestamp: "Pending", actor: "Freight", action: "vessel departure from Shanghai", state: "upcoming" as const },
]

function Block({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">{children}</div>
    </section>
  )
}

function FoundationsPage() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Design system</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Foundation Components</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground text-pretty">
            Neutral, reusable building blocks used across the entire product. No brand colours applied yet — these
            establish structure, density, and interaction patterns before we build screens.
          </p>
        </header>

        <div className="flex flex-col gap-10">
          {/* Navigation */}
          <Block title="Navigation — Sidebar & Top bar" description="Collapsible sidebar with workspace switcher and user menu, plus a top bar with breadcrumb, ⌘K search, notifications and help.">
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex h-[420px]">
                <FoundationSidebar />
                <div className="flex min-w-0 flex-1 flex-col bg-background">
                  <FoundationTopBar />
                  <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                    Try collapsing the sidebar, switching workspace, or pressing{" "}
                    <kbd className="mx-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd> to open the command menu.
                  </div>
                </div>
              </div>
            </div>
          </Block>

          {/* Data table */}
          <Block title="Data Table" description="Sortable columns, row selection, filtering, sticky header, hover row actions, and pagination. Includes loading, error, and empty states.">
            <DataTable
              columns={columns}
              data={rfqs}
              searchKeys={[(r) => r.ref, (r) => r.buyer]}
              getRowHref={() => "#"}
              rowActions={[
                { label: "View details", onSelect: () => {} },
                { label: "Duplicate", onSelect: () => {} },
                { label: "Archive", onSelect: () => {} },
              ]}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Loading state</p>
                <DataTable columns={columns} data={[]} loading />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Error state</p>
                <DataTable columns={columns} data={[]} error="Network request timed out." />
              </div>
            </div>
          </Block>

          {/* Detail drawer */}
          <Block title="Detail Drawer" description="Right-side sheet for inspecting a record without leaving the list. Tabbed Overview / Activity / Documents with footer actions.">
            <DetailDrawer
              trigger={
                <Button variant="outline" className="bg-transparent">
                  <Eye className="size-4" />
                  Open drawer
                </Button>
              }
              title="RFQ-2026-0418"
              subtitle="Sahel Mining Corp · 12 line items"
              statusLabel="New"
              statusVariant="info"
              fullPageHref="#"
              overview={
                <div className="space-y-4 text-sm">
                  <dl className="space-y-2">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Buyer</dt><dd className="font-medium text-foreground">Sahel Mining Corp</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Estimated value</dt><dd className="font-medium tabular-nums text-foreground">$84,500</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Received</dt><dd className="font-medium text-foreground">Jun 6, 2026</dd></div>
                  </dl>
                  <LandedCostBreakdown segments={costSegments} />
                </div>
              }
              activity={<Timeline items={timelineItems} />}
              documents={
                <Timeline
                  items={[
                    { id: "d1", timestamp: "Jun 06", actor: "Buyer", action: "attached RFQ spec sheet", document: { name: "rfq-spec.pdf" } },
                    { id: "d2", timestamp: "Jun 06", actor: "System", action: "generated line-item extract", document: { name: "line-items.csv" } },
                  ]}
                />
              }
            />
          </Block>

          {/* Badges */}
          <div className="grid gap-10 lg:grid-cols-2">
            <Block title="Status Badge" description="Five standardised variants with a consistent filled treatment — used for every RFQ, quote, order, invoice and supplier status.">
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant="neutral">Neutral</StatusBadge>
                <StatusBadge variant="info">Info</StatusBadge>
                <StatusBadge variant="success">Success</StatusBadge>
                <StatusBadge variant="warning">Warning</StatusBadge>
                <StatusBadge variant="error">Error</StatusBadge>
              </div>
            </Block>

            <Block title="Confidence Badge" description="AI match confidence with High / Medium / Low variants. Hover to see the score and sources used.">
              <div className="flex flex-wrap gap-2">
                <ConfidenceBadge level="high" score={0.94} sources={["Manufacturer datasheet", "Prior quote WP-2024-318"]} />
                <ConfidenceBadge level="medium" score={0.71} sources={["Thomasnet listing"]} />
                <ConfidenceBadge level="low" score={0.42} sources={["Fuzzy text match"]} />
              </div>
            </Block>
          </div>

          {/* Source chips */}
          <Block title="Source Attribution Chips" description="Clickable provenance chips shown beneath AI-generated content. Each opens its source in a new tab.">
            <p className="mb-3 text-sm text-foreground text-pretty">
              Matched <span className="font-medium">Atlas Copco GA30 air compressor</span> to line item 3 with a recommended
              substitute from in-stock inventory.
            </p>
            <SourceChips
              sources={[
                { label: "Manufacturer datasheet" },
                { label: "Thomasnet" },
                { label: "Prior quote ref WP-2024-318" },
              ]}
            />
          </Block>

          {/* Landed cost */}
          <Block title="Landed Cost Breakdown" description="Horizontal stacked bar splitting a total into item cost, shipping, duty + taxes, and margin. Hover any segment for the exact amount and percentage.">
            <LandedCostBreakdown segments={costSegments} />
          </Block>

          {/* Timeline */}
          <Block title="Timeline" description="Vertical event log for order and invoice tracking. Each event has a timestamp, actor, action, and optional document attachment.">
            <Timeline items={timelineItems} />
          </Block>

          {/* Empty states */}
          <Block title="Empty States" description="A monochrome icon, one sentence of guidance, a primary CTA, and an optional secondary link. No illustrations or marketing copy.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:rounded-lg [&>*]:border [&>*]:border-dashed [&>*]:border-border [&>*]:bg-card">
              <EmptyState
                icon={FileText}
                title="No RFQs match your filters."
                description="Try clearing filters or capture a new RFQ."
                action={{ label: "New RFQ" }}
                secondaryAction={{ label: "Clear filters" }}
              />
              <EmptyState icon={ReceiptText} title="No quotes yet." description="Build a quote from any RFQ to start tracking win rates." action={{ label: "New quote" }} />
              <EmptyState icon={ShoppingCart} title="No orders yet." description="Accepted quotes convert into orders you can track here." action={{ label: "View quotes" }} />
              <EmptyState icon={ReceiptText} title="No invoices yet." description="Generate an invoice from any accepted order." action={{ label: "Create invoice" }} />
              <EmptyState icon={BookOpen} title="Your catalog is empty." description="Import a supplier price list to start matching products." action={{ label: "Import catalog" }} />
              <EmptyState icon={Package} title="No suppliers yet." description="Add suppliers to source against incoming RFQs." action={{ label: "Add supplier" }} />
            </div>
          </Block>
        </div>
      </div>
    </TooltipProvider>
  )
}


export const Route = createFileRoute("/_app/foundations")({
  component: FoundationsPage,
});
