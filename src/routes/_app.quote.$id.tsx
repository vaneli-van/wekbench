import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileQuestion,
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  Building2,
  Calendar,
  Search,
  ExternalLink,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/foundations/empty-state";
import { PageHeader } from "@/components/page-header";
import { QuoteAttachmentsCard } from "@/components/quote-attachments-card";
import { QuoteShippingCard } from "@/components/quote-shipping-card";
import { CatalogPickerDialog } from "@/components/catalog-picker-dialog";
import {
  getQuote,
  updateQuoteLineItem,
  addQuoteLineItem,
  deleteQuoteLineItem,
  updateQuoteStatus,
  updateQuoteHeader,
  applyOfferToLine,
} from "@/lib/api/quotes.functions";
import { priceQuoteLine } from "@/lib/api/sourcing.functions";

function fmt(n: number | null | undefined, currency: string | null | undefined) {
  if (n == null) return "—";
  return `${currency ?? ""} ${Number(n).toFixed(2)}`;
}

type LineType =
  | "hardware"
  | "software"
  | "service"
  | "labour"
  | "travel"
  | "training"
  | "subscription"
  | "shipping";

const LINE_TYPE_LABEL: Record<LineType, string> = {
  hardware: "Hardware",
  software: "Software",
  service: "Service",
  labour: "Labour",
  travel: "Travel",
  training: "Training",
  subscription: "Subscription",
  shipping: "Shipping",
};

type LI = {
  id: string;
  line_no: number;
  description: string;
  brand: string | null;
  model: string | null;
  qty: number;
  unit: string | null;
  unit_cost: number | null;
  unit_price: number | null;
  margin_pct: number | null;
  line_type: LineType;
  section: string | null;
  discount_pct: number | null;
  source_currency?: string | null;
  source_unit_cost?: number | null;
  fx_rate?: number | null;
  catalog_items?: {
    stock_qty: number | null;
    reserved_qty: number | null;
    warehouse_location: string | null;
    oem: string | null;
    is_authorised: boolean | null;
    lead_time_days: number | null;
  } | null;
};

function groupBySection(items: LI[]): { key: string; section: string | null; items: LI[] }[] {
  const map = new Map<string, { key: string; section: string | null; items: LI[] }>();
  for (const li of items) {
    const key = li.section ?? "__ungrouped__";
    if (!map.has(key)) map.set(key, { key, section: li.section, items: [] });
    map.get(key)!.items.push(li);
  }
  return Array.from(map.values());
}

function SourceOfferDialog({
  lineItemId,
  onApplied,
}: {
  lineItemId: string;
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const priceFn = useServerFn(priceQuoteLine);
  const applyFn = useServerFn(applyOfferToLine);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await priceFn({ data: { lineItemId } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sourcing failed");
    } finally {
      setLoading(false);
    }
  }

  function openDialog() {
    setOpen(true);
    void load();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detail, setDetail] = useState<any>(null);

  async function apply(offerId: string) {
    setApplyingId(offerId);
    try {
      await applyFn({ data: { lineItemId, offerId } });
      toast.success("Line cost updated from live offer");
      setOpen(false);
      setDetail(null);
      onApplied();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply offer");
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <>
      <Button size="icon" variant="ghost" className="size-7" title="Source live pricing" onClick={openDialog}>
        <Search className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDetail(null); }}>
        <DialogContent className="max-w-3xl">
          {detail ? (
            <OfferDetail
              offer={detail}
              qty={data?.qty}
              applying={applyingId === detail.offerId}
              onBack={() => setDetail(null)}
              onUse={() => apply(detail.offerId)}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Live distributor offers</DialogTitle>
                <DialogDescription>
                  {data
                    ? `${data.offers.length} offer(s) · ${data.category}${data.identifier ? ` · ${data.identifier}` : ""} · qty ${data.qty}`
                    : "Sourcing across enabled providers…"}
                </DialogDescription>
              </DialogHeader>
              {loading && <p className="py-6 text-center text-sm text-muted-foreground">Sourcing…</p>}
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {data && !loading ? (
                data.offers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No priced offers found for this line.
                  </p>
                ) : (
                  <div className="max-h-[55vh] overflow-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/50 text-left">
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 font-medium">Distributor</th>
                          <th className="px-3 py-2 text-right font-medium">Stock</th>
                          <th className="px-3 py-2 text-right font-medium">Lead</th>
                          <th className="px-3 py-2 text-right font-medium">Unit @ qty</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {data.offers.map((o: any, i: number) => (
                          <tr
                            key={o.offerId}
                            onClick={() => setDetail(o)}
                            className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                          >
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1.5">
                                {o.distributor ?? "—"}
                                {i === 0 && <Badge variant="outline" className="text-[10px]">best</Badge>}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{o.stockQty ?? "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{o.leadTimeDays != null ? `${o.leadTimeDays}d` : "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {o.currency} {Number(o.unitCost).toFixed(4)}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              <ArrowLeft className="inline size-3.5 rotate-180" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OfferDetail({ offer, qty, applying, onBack, onUse }: { offer: any; qty?: number; applying: boolean; onBack: () => void; onUse: () => void }) {
  return (
    <>
      <DialogHeader>
        <button onClick={onBack} className="mb-1 inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to offers
        </button>
        <DialogTitle>{offer.distributor ?? "Offer"}</DialogTitle>
        <DialogDescription>
          {[offer.manufacturer, offer.provider].filter(Boolean).join(" · ")}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30 sm:h-36">
          {offer.imageUrl ? (
            <img src={offer.imageUrl} alt={offer.distributor ?? "part"} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">No image</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Detail label="Unit @ qty" value={`${offer.currency} ${Number(offer.unitCost).toFixed(4)}`} strong />
          <Detail label="In stock" value={offer.stockQty != null ? String(offer.stockQty) : "—"} />
          <Detail label="MOQ" value={offer.moq != null ? String(offer.moq) : "—"} />
          <Detail label="Order multiple" value={offer.orderMultiple != null ? String(offer.orderMultiple) : "—"} />
          <Detail label="Lead time" value={offer.leadTimeDays != null ? `${offer.leadTimeDays} days` : "—"} />
          <Detail label="Packaging" value={offer.packaging ?? "—"} />
        </div>
      </div>

      {Array.isArray(offer.priceBreaks) && offer.priceBreaks.length > 0 && (
        <div className="mt-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Price breaks</p>
          <div className="max-h-40 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-left">
                <tr className="border-b border-border">
                  <th className="px-3 py-1.5 font-medium">Qty</th>
                  <th className="px-3 py-1.5 text-right font-medium">Unit price</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {offer.priceBreaks.map((b: any, idx: number) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 tabular-nums">{b.quantity}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{b.currency} {Number(b.price).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs">
          {offer.datasheetUrl && (
            <a href={offer.datasheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ExternalLink className="size-3" /> Datasheet
            </a>
          )}
          {offer.buyUrl && (
            <a href={offer.buyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ExternalLink className="size-3" /> Distributor page
            </a>
          )}
        </div>
        <Button onClick={onUse} disabled={applying}>
          {applying ? "Applying…" : `Use this offer${qty ? ` (qty ${qty})` : ""}`}
        </Button>
      </div>
    </>
  );
}

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={strong ? "font-semibold" : ""}>{value}</p>
    </div>
  );
}

function EditableCell({
  value,
  onCommit,
  type = "text",
  className,
}: {
  value: string | number | null;
  onCommit: (v: string) => void;
  type?: "text" | "number";
  className?: string;
}) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => setV(value == null ? "" : String(value)), [value]);
  return (
    <Input
      value={v}
      type={type}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== (value == null ? "" : String(value))) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`h-8 border-transparent bg-transparent px-2 text-sm hover:border-border focus:border-primary ${className ?? ""}`}
    />
  );
}

function TermsField({
  label,
  value,
  editable,
  type = "text",
  placeholder,
  onCommit,
}: {
  label: string;
  value: string | number | null | undefined;
  editable: boolean;
  type?: "text" | "number" | "date";
  placeholder?: string;
  onCommit: (v: string) => void;
}) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => setV(value == null ? "" : String(value)), [value]);
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      {editable ? (
        <Input
          value={v}
          type={type}
          placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => {
            if (v !== (value == null ? "" : String(value))) onCommit(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-9 text-sm"
        />
      ) : (
        <p className="text-sm">{value == null || value === "" ? "—" : String(value)}</p>
      )}
    </div>
  );
}

function QuoteDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getQuoteFn = useServerFn(getQuote);
  const updateLI = useServerFn(updateQuoteLineItem);
  const addLI = useServerFn(addQuoteLineItem);
  const delLI = useServerFn(deleteQuoteLineItem);
  const updateStatus = useServerFn(updateQuoteStatus);
  const updateHeader = useServerFn(updateQuoteHeader);

  const { data, isLoading, error } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => getQuoteFn({ data: { id } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["quote", id] });

  const updateMut = useMutation({
    mutationFn: (vars: { lineItemId: string; patch: Record<string, unknown> }) =>
      updateLI({ data: vars }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });
  const addMut = useMutation({
    mutationFn: () => addLI({ data: { quoteId: id } }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: (lineItemId: string) => delLI({ data: { lineItemId } }),
    onSuccess: invalidate,
  });
  const statusMut = useMutation({
    mutationFn: (status: "draft" | "sent" | "accepted" | "declined" | "expired") =>
      updateStatus({ data: { quoteId: id, status } }),
    onSuccess: (_d, status) => {
      toast.success(`Quote ${status}`);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const headerMut = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateHeader({ data: { quoteId: id, patch } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (error || !data?.quote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <EmptyState
          icon={FileQuestion}
          title="Quote not found"
          description={error instanceof Error ? error.message : `No quote with id "${id}".`}
          action={{ label: "Back to quotes", href: "/quotes" }}
        />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = data.quote as any;
  const items = data.items as LI[];
  const rfq = q.rfqs;
  const editable = q.status === "draft";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        {q.rfq_id && (
          <Link to="/rfq/$id" params={{ id: q.rfq_id }} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Back to RFQ
          </Link>
        )}
      </div>

      <PageHeader
        title={`Quote ${q.quote_number}`}
        description={q.title ?? rfq?.summary ?? rfq?.buyer_ref ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{q.status}</Badge>
            {editable ? (
              <Button onClick={() => statusMut.mutate("sent")} disabled={statusMut.isPending || items.length === 0}>
                <Send className="size-4" /> Send Quote
              </Button>
            ) : q.status === "sent" ? (
              <>
                <Button variant="outline" onClick={() => statusMut.mutate("declined")}>Mark Declined</Button>
                <Button onClick={() => statusMut.mutate("accepted")}>Mark Accepted</Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Building2 className="size-3.5" /> Buyer
          </div>
          <p className="font-medium">{rfq?.buyer_company ?? rfq?.buyer_name ?? q.buyer_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{rfq?.buyer_email ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Calendar className="size-3.5" /> Dates
          </div>
          <p className="text-sm">RFQ due: {rfq?.due_date ?? "—"}</p>
          <p className="text-sm">Sent: {q.sent_at ? new Date(q.sent_at).toLocaleDateString() : "—"}</p>
        </Card>
        <Card className="p-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Totals</div>
          <p className="text-2xl font-semibold tabular-nums">{fmt(q.total, q.currency)}</p>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <p>Subtotal: <span className="tabular-nums">{fmt(q.subtotal, q.currency)}</span></p>
            <p>Tax ({Number(q.tax_pct ?? 0).toFixed(1)}%): <span className="tabular-nums">{fmt(q.tax_amount, q.currency)}</span></p>
            <p>Margin: {q.margin_pct != null ? `${Number(q.margin_pct).toFixed(1)}%` : "—"}</p>
          </div>
        </Card>
      </div>

      {/* Shareable buyer acceptance link */}
      {q.share_token && (
        <Card className="mt-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Buyer acceptance link</p>
            {q.status === "accepted" ? (
              <p className="truncate text-xs text-success">Accepted &amp; signed by {q.accepted_by}{q.accepted_at ? ` on ${new Date(q.accepted_at).toLocaleDateString()}` : ""}</p>
            ) : q.status === "declined" ? (
              <p className="truncate text-xs text-destructive">Declined by buyer</p>
            ) : q.status === "draft" ? (
              <p className="truncate text-xs text-muted-foreground">Send the quote to activate this link for the buyer.</p>
            ) : (
              <p className="truncate text-xs text-muted-foreground">Share this link — the buyer can review, accept &amp; e-sign online.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/quote/${q.share_token}`;
                navigator.clipboard?.writeText(url);
                toast.success("Buyer link copied");
              }}
            >
              <Copy className="size-3.5" /> Copy link
            </Button>
            <a href={`/quote/${q.share_token}`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">Preview</Button>
            </a>
          </div>
        </Card>
      )}

      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Delivery & terms</h3>
          {!editable && <span className="text-xs text-muted-foreground">Locked once sent</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          <TermsField label="Incoterm" value={q.incoterm} editable={editable} placeholder="DAP / EXW / CIF" onCommit={(v) => headerMut.mutate({ incoterm: v || null })} />
          <TermsField label="Buyer PO number" value={q.buyer_po_ref} editable={editable} placeholder="e.g. PO-2026-0142" onCommit={(v) => headerMut.mutate({ buyer_po_ref: v || null })} />
          <TermsField label="Delivery location" value={q.delivery_location} editable={editable} placeholder="Accra warehouse" onCommit={(v) => headerMut.mutate({ delivery_location: v || null })} />
          <TermsField label="Lead time (days)" value={q.lead_time_days} type="number" editable={editable} onCommit={(v) => headerMut.mutate({ lead_time_days: v === "" ? null : Number(v) })} />
          <TermsField label="Tax %" value={q.tax_pct} type="number" editable={editable} onCommit={(v) => headerMut.mutate({ tax_pct: Number(v) || 0 })} />
          <TermsField label="Valid until" value={q.valid_until} type="date" editable={editable} onCommit={(v) => headerMut.mutate({ valid_until: v || null })} />
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Site & installation</h3>
          <span className="text-xs text-muted-foreground">For on-site delivery, install, or training</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TermsField label="Site address" value={q.site_address} editable={editable} placeholder="Street, city, country" onCommit={(v) => headerMut.mutate({ site_address: v || null })} />
          <TermsField label="Install window" value={q.install_window} editable={editable} placeholder="e.g. Q1 2027, weekends only" onCommit={(v) => headerMut.mutate({ install_window: v || null })} />
          <TermsField label="Site contact" value={q.site_contact_name} editable={editable} placeholder="Name" onCommit={(v) => headerMut.mutate({ site_contact_name: v || null })} />
          <TermsField label="Site contact phone" value={q.site_contact_phone} editable={editable} placeholder="+233…" onCommit={(v) => headerMut.mutate({ site_contact_phone: v || null })} />
        </div>
      </Card>

      <QuoteShippingCard
        quoteId={id}
        quoteCurrency={q.currency}
        destinationCity={q.delivery_location ?? q.site_address ?? null}
        editable={editable}
      />

      <Card className="mt-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Line items</h3>
          {editable && (
            <div className="flex items-center gap-2">
              <CatalogPickerDialog quoteId={id} onAdded={invalidate} />
              <Button size="sm" variant="outline" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
                <Plus className="size-3.5" /> Add line
              </Button>
            </div>
          )}
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No line items yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Description</th>
                <th className="px-2 py-2 text-right w-20">Qty</th>
                <th className="px-2 py-2 text-right w-28">Unit cost</th>
                <th className="px-2 py-2 text-right w-24">Margin %</th>
                <th className="px-2 py-2 text-right w-28">Unit price</th>
                <th className="px-2 py-2 text-right w-20">Disc %</th>
                <th className="px-2 py-2 text-right w-28">Line total</th>
                {editable && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupBySection(items).map((group) => (
                <>
                  <tr key={`sec-${group.key}`} className="bg-muted/20">
                    <td colSpan={editable ? 9 : 8} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.section ?? "Ungrouped"}
                    </td>
                  </tr>
                  {group.items.map((li) => {
                    const disc = Number(li.discount_pct ?? 0);
                    const lineTotal = (li.unit_price ?? 0) * (li.qty ?? 0) * (1 - disc / 100);
                    const commit = (patch: Record<string, unknown>) =>
                      updateMut.mutate({ lineItemId: li.id, patch });
                    return (
                      <tr key={li.id}>
                        <td className="px-2 py-2 text-muted-foreground tabular-nums align-top">{li.line_no}</td>
                        <td className="px-2 py-2">
                          {editable ? (
                            <EditableCell
                              value={li.description}
                              onCommit={(v) => commit({ description: v })}
                            />
                          ) : (
                            <div className="font-medium">{li.description}</div>
                          )}
                          {(li.brand || li.model) && (
                            <div className="px-2 text-xs text-muted-foreground">
                              {[li.brand, li.model].filter(Boolean).join(" · ")}
                            </div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 px-2">
                            {editable ? (
                              <>
                                <select
                                  value={li.line_type}
                                  onChange={(e) => commit({ line_type: e.target.value as LineType })}
                                  className="h-6 rounded border border-border bg-transparent px-1.5 text-[11px]"
                                >
                                  {(Object.keys(LINE_TYPE_LABEL) as LineType[]).map((k) => (
                                    <option key={k} value={k}>{LINE_TYPE_LABEL[k]}</option>
                                  ))}
                                </select>
                                <input
                                  defaultValue={li.section ?? ""}
                                  placeholder="Section (e.g. Core switches)"
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if ((li.section ?? "") !== v) commit({ section: v || null });
                                  }}
                                  className="h-6 w-48 rounded border border-transparent bg-transparent px-1.5 text-[11px] hover:border-border focus:border-primary"
                                />
                              </>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">{LINE_TYPE_LABEL[li.line_type as LineType]}</Badge>
                            )}
                          </div>
                          <StockBadge li={li} />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums align-top">
                          {editable ? (
                            <EditableCell
                              type="number"
                              value={li.qty}
                              onCommit={(v) => commit({ qty: Number(v) || 0 })}
                              className="text-right"
                            />
                          ) : (
                            li.qty
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums align-top">
                          {editable ? (
                            <EditableCell
                              type="number"
                              value={li.unit_cost}
                              onCommit={(v) =>
                                commit({
                                  unit_cost: v === "" ? null : Number(v),
                                  margin_pct: li.margin_pct,
                                })
                              }
                              className="text-right"
                            />
                          ) : (
                            fmt(li.unit_cost, q.currency)
                          )}
                          {li.source_currency && li.source_unit_cost != null && (
                            <p className="text-[10px] font-normal text-muted-foreground">
                              from {li.source_currency} {Number(li.source_unit_cost).toFixed(2)}
                            </p>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums align-top">
                          {editable ? (
                            <EditableCell
                              type="number"
                              value={li.margin_pct}
                              onCommit={(v) =>
                                commit({
                                  margin_pct: v === "" ? null : Number(v),
                                  unit_cost: li.unit_cost,
                                })
                              }
                              className="text-right"
                            />
                          ) : (
                            li.margin_pct != null ? `${li.margin_pct}%` : "—"
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums align-top">
                          {editable ? (
                            <EditableCell
                              type="number"
                              value={li.unit_price}
                              onCommit={(v) => commit({ unit_price: v === "" ? null : Number(v) })}
                              className="text-right"
                            />
                          ) : (
                            fmt(li.unit_price, q.currency)
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums align-top">
                          {editable ? (
                            <EditableCell
                              type="number"
                              value={li.discount_pct}
                              onCommit={(v) => commit({ discount_pct: v === "" ? 0 : Number(v) })}
                              className="text-right"
                            />
                          ) : (
                            disc ? `${disc}%` : "—"
                          )}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums font-medium align-top">
                          {fmt(lineTotal, q.currency)}
                        </td>
                        {editable && (
                          <td className="px-1 py-2 align-top">
                            <div className="flex items-center gap-0.5">
                              <SourceOfferDialog lineItemId={li.id} onApplied={invalidate} />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => delMut.mutate(li.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20 text-sm">
                <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">Subtotal</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmt(q.subtotal, q.currency)}</td>
                {editable && <td />}
              </tr>
              <tr className="bg-muted/20 text-sm">
                <td colSpan={7} className="px-3 py-2 text-right text-muted-foreground">
                  Tax ({Number(q.tax_pct ?? 0).toFixed(1)}%)
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{fmt(q.tax_amount, q.currency)}</td>
                {editable && <td />}
              </tr>
              <tr className="border-t border-border bg-muted/40">
                <td colSpan={7} className="px-3 py-3 text-right text-sm font-medium">Total</td>
                <td className="px-2 py-3 text-right text-base font-semibold tabular-nums">
                  {fmt(q.total, q.currency)}
                </td>
                {editable && <td />}
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      <QuoteAttachmentsCard quoteId={q.id} workspaceId={q.workspace_id} editable={editable} />
    </div>
  );
}

function StockBadge({ li }: { li: LI }) {
  const c = li.catalog_items;
  if (!c) {
    return (
      <div className="mt-1 px-2">
        <Badge variant="outline" className="text-[10px]">No catalog match</Badge>
      </div>
    );
  }
  const available = (c.stock_qty ?? 0) - (c.reserved_qty ?? 0);
  const need = li.qty ?? 0;
  const inStock = available >= need;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 px-2">
      <Badge
        variant={inStock ? "default" : "outline"}
        className={`text-[10px] ${inStock ? "" : "border-destructive text-destructive"}`}
      >
        {inStock ? `In stock · ${available}` : `Short · ${available}/${need}`}
      </Badge>
      {c.warehouse_location && (
        <Badge variant="outline" className="text-[10px]">{c.warehouse_location}</Badge>
      )}
      {c.is_authorised && c.oem && (
        <Badge variant="outline" className="text-[10px]">Authorised · {c.oem}</Badge>
      )}
      {!inStock && c.lead_time_days != null && (
        <span className="text-[10px] text-muted-foreground">Lead {c.lead_time_days}d</span>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/quote/$id")({
  head: ({ params }) => ({ meta: [{ title: `Quote ${params.id} — Wekbench` }] }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description={error instanceof Error ? error.message : "Unknown error"}
          action={{ label: "Try again", onClick: () => { reset(); router.invalidate(); } }}
        />
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <EmptyState
        icon={FileQuestion}
        title="Quote not found"
        description="That quote doesn't exist."
        action={{ label: "Back to quotes", href: "/quotes" }}
      />
    </div>
  ),
  component: QuoteDetailPage,
});
