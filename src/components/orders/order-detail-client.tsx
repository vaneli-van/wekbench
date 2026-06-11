import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  FileText,
  Building2,
  ReceiptText,
  CalendarClock,
  MapPin,
  Plus,
  Share2,
  Copy,
  Check,
  MoreHorizontal,
  Truck,
  StickyNote,
  Mail,
  Download,
  CircleDollarSign,
  ExternalLink,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { TrackingTimeline } from "@/components/orders/tracking-timeline"
import { EmptyState } from "@/components/foundations/empty-state"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Order } from "@/lib/data"
import {
  type OrderDetail,
  type TimelineEvent,
  supplierStatusMeta,
} from "@/lib/order-detail"
import { cn } from "@/lib/utils"

export function OrderDetailClient({ order, detail }: { order: Order; detail: OrderDetail }) {
  const [events, setEvents] = useState<TimelineEvent[]>(detail.timeline)
  const [addOpen, setAddOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/track/${detail.shareToken}`
      : `/track/${detail.shareToken}`

  function handleAddUpdate(ev: TimelineEvent) {
    setEvents((prev) => [ev, ...prev])
    setAddOpen(false)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={order.description}
        breadcrumb={[{ label: "Orders", href: "/orders" }, { label: order.id }]}
        description={`${order.buyer} · PO ${order.poNumber}`}
        actions={
          <>
            <StatusBadge status={order.status} className="text-sm" />
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
              Share with buyer
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/invoices">
                <ReceiptText className="size-4" />
                Generate invoice
              </Link>
            </Button>
            <Button size="sm" onClick={() => setStatusOpen(true)}>
              Update status
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit order</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Cancel order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Summary strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary icon={CircleDollarSign} label="Order value" value={order.value} />
        <Summary icon={CalendarClock} label="Expected delivery" value={order.expectedDelivery} />
        <Summary icon={ReceiptText} label="Buyer PO" value={order.poNumber} />
        <Summary icon={FileText} label="Linked quote" value={order.quoteRef} href="/quotes" />
      </div>

      {/* Main split: left details (60%) / right timeline (40%) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Card 1: Buyer & PO */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Buyer &amp; PO information</h3>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label="Buyer" value={order.buyer} />
              <Field label="Contact" value={order.buyerContact} />
              <Field label="Email" value={detail.buyerEmail} />
              <Field label="Phone" value={detail.buyerPhone} />
              <Field label="PO number" value={order.poNumber} mono />
              <Field label="PO date" value={detail.poDate} />
              <Field label="PO value" value={order.value} />
              <Field label="Payment terms" value={detail.paymentTerms} />
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Delivery address</dt>
                <dd className="mt-0.5 flex items-start gap-1.5 text-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {detail.deliveryAddress}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Linked quote</dt>
                <dd className="mt-0.5">
                  <Link
                    to="/quotes"
                    className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                  >
                    {order.quoteRef}
                    <ExternalLink className="size-3" />
                  </Link>
                </dd>
              </div>
            </dl>
          </section>

          {/* Card 2: Line items */}
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Line items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">Description</th>
                    <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                    <th className="px-3 py-2.5 font-medium">Supplier</th>
                    <th className="px-3 py-2.5 text-right font-medium">Unit cost</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 text-foreground">{li.description}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">{li.qty}</td>
                      <td className="px-3 py-3 text-muted-foreground">{li.supplier}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">{li.unitCost}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-foreground">{li.total}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={supplierStatusMeta[li.lineStatus].status}
                          label={supplierStatusMeta[li.lineStatus].label}
                        />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{li.deliveryDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Card 3: Supplier orders */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Supplier orders</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detail.supplierOrders.map((so) => (
                <div key={so.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Building2 className="size-3.5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{so.supplier}</p>
                    </div>
                    <StatusBadge
                      status={supplierStatusMeta[so.status].status}
                      label={supplierStatusMeta[so.status].label}
                    />
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <Row label="PO sent" value={so.poSent} />
                    <Row label="Expected ship" value={so.expectedShip} />
                    <Row label="Tracking" value={so.tracking} mono />
                  </dl>
                  <p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                    <Truck className="mt-0.5 size-3 shrink-0" />
                    {so.lastUpdate}
                  </p>
                  <button className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
                    <StickyNote className="size-3.5" />
                    Add note
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Tabs below */}
          <section className="rounded-xl border border-border bg-card p-5">
            <Tabs defaultValue="documents">
              <TabsList>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="comms">Communications</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="mt-4">
                {detail.documents.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No documents yet."
                    description="Generated invoices and packing lists will appear here."
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {detail.documents.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 py-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-info/10 text-info">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.type} · {d.size} · {d.uploadedAt}
                          </p>
                        </div>
                        <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Download className="size-4" />
                          <span className="sr-only">Download {d.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="comms" className="mt-4">
                {detail.comms.length === 0 ? (
                  <EmptyState
                    icon={Mail}
                    title="No communications yet."
                    description="Emails and messages with the buyer and suppliers will appear here."
                  />
                ) : (
                  <ul className="space-y-3">
                    {detail.comms.map((c) => (
                      <li key={c.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex size-7 items-center justify-center rounded-md",
                              c.kind === "buyer-email"
                                ? "bg-info/10 text-info"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {c.kind === "buyer-email" ? (
                              <Mail className="size-3.5" />
                            ) : (
                              <StickyNote className="size-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {c.author}
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {c.kind === "buyer-email" ? "Buyer email" : "Internal note"}
                              </span>
                            </p>
                          </div>
                          <time className="text-xs text-muted-foreground">{c.at}</time>
                        </div>
                        {c.subject && <p className="mt-2 text-sm font-medium text-foreground">{c.subject}</p>}
                        <p className="mt-1 text-sm text-muted-foreground text-pretty">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <ul className="space-y-2.5">
                  {detail.audit.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 text-sm">
                      <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
                      <span className="text-muted-foreground">{a.at}</span>
                      <span className="font-medium text-foreground">{a.actor}</span>
                      <span className="text-muted-foreground">{a.action}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </section>
        </div>

        {/* Right: tracking timeline (40%) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Tracking timeline</h3>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Add update
              </Button>
            </div>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">
              Source of truth from PO receipt to final delivery.
            </p>
            <TrackingTimeline events={events} />
          </div>
        </div>
      </div>

      <AddUpdateDialog open={addOpen} onOpenChange={setAddOpen} onAdd={handleAddUpdate} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} url={shareUrl} buyer={order.buyer} />
      <UpdateStatusDialog open={statusOpen} onOpenChange={setStatusOpen} current={order.status} />
    </div>
  )
}

/* ---------- Add update dialog ---------- */
function AddUpdateDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (ev: TimelineEvent) => void
}) {
  const [action, setAction] = useState("")
  const [detail, setDetail] = useState("")
  const [tracking, setTracking] = useState("")

  function submit() {
    if (!action.trim()) return
    const now = new Date()
    const ts = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
    onAdd({
      id: `T-${Date.now()}`,
      timestamp: ts,
      type: tracking ? "shipment" : "note",
      actor: "Samuel Adeyemi",
      action: action.trim(),
      detail: detail.trim() || undefined,
      tracking: tracking.trim() || undefined,
    })
    setAction("")
    setDetail("")
    setTracking("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tracking update</DialogTitle>
          <DialogDescription>Log a manual update for this order. It is added to the timeline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="action">Update</Label>
            <input
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. Out for delivery in Tarkwa"
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <Label htmlFor="detail">Details (optional)</Label>
            <Textarea
              id="detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Add context, location, or notes"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="tracking">Tracking number (optional)</Label>
            <input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. DHL-7741-22890-KE"
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!action.trim()}>
            Add to timeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Share dialog ---------- */
function ShareDialog({
  open,
  onOpenChange,
  url,
  buyer,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  url: string
  buyer: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share tracking with buyer</DialogTitle>
          <DialogDescription>
            Send {buyer} a read-only link to track this order&apos;s status. No login required.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            className="flex h-9 w-full rounded-md border border-input bg-muted/40 px-3 py-1 text-sm text-foreground"
          />
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => {
              navigator.clipboard?.writeText(url)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            <span className="sr-only">Copy link</span>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" asChild>
            <Link to={url} target="_blank">
              <ExternalLink className="size-4" />
              Open buyer view
            </Link>
          </Button>
          <Button asChild>
            <a href={`mailto:?subject=Track your order&body=Track your order here: ${url}`}>
              <Mail className="size-4" />
              Email link
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Update status dialog ---------- */
function UpdateStatusDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  current: string
}) {
  const statuses = ["po-received", "in-progress", "delivered"]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update order status</DialogTitle>
          <DialogDescription>Set the current fulfilment status for this order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm hover:bg-muted",
                s === current ? "border-accent bg-accent/5" : "border-border",
              )}
            >
              <StatusBadge status={s} />
              {s === current && <Check className="size-4 text-accent" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- helpers ---------- */
function Summary({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string
  href?: string
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </>
  )
  if (href) {
    return (
      <Link to={href} className="rounded-xl border border-border bg-card p-4 hover:border-accent/30">
        {inner}
      </Link>
    )
  }
  return <div className="rounded-xl border border-border bg-card p-4">{inner}</div>
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-foreground", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", mono && "font-mono")}>{value}</dd>
    </div>
  )
}
