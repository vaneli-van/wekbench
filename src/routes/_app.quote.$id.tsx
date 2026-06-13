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
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/foundations/empty-state";
import { PageHeader } from "@/components/page-header";
import { QuoteAttachmentsCard } from "@/components/quote-attachments-card";
import {
  getQuote,
  updateQuoteLineItem,
  addQuoteLineItem,
  deleteQuoteLineItem,
  updateQuoteStatus,
  updateQuoteHeader,
} from "@/lib/api/quotes.functions";

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
  | "subscription";

const LINE_TYPE_LABEL: Record<LineType, string> = {
  hardware: "Hardware",
  software: "Software",
  service: "Service",
  labour: "Labour",
  travel: "Travel",
  training: "Training",
  subscription: "Subscription",
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
        description={rfq?.summary ?? rfq?.buyer_ref ?? ""}
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
          <p className="font-medium">{rfq?.buyer_company ?? rfq?.buyer_name ?? "—"}</p>
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

      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Delivery & terms</h3>
          {!editable && <span className="text-xs text-muted-foreground">Locked once sent</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          <TermsField label="Incoterm" value={q.incoterm} editable={editable} placeholder="DAP / EXW / CIF" onCommit={(v) => headerMut.mutate({ incoterm: v || null })} />
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

      <Card className="mt-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Line items</h3>
          {editable && (
            <Button size="sm" variant="outline" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
              <Plus className="size-3.5" /> Add line
            </Button>
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => delMut.mutate(li.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
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
  head: ({ params }) => ({ meta: [{ title: `Quote ${params.id} — wekbench` }] }),
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
