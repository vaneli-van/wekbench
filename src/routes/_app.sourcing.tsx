import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Globe2, Loader2, PackageSearch, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createSourcingRequest,
  priceSourcingRequest,
  getSourcingRequest,
  listSourcingRequests,
  placeSourcingOrder,
  requestLineQuote,
} from "@/lib/api/sourcing-requests.functions";

export const Route = createFileRoute("/_app/sourcing")({
  head: () => ({ meta: [{ title: "Source & import — Wekbench" }] }),
  component: SourcingPage,
});

function money(v: number | null | undefined, c: string | null | undefined) {
  if (v == null) return "—";
  return `${c ?? ""} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();
}

const STATUS_TONE: Record<string, string> = {
  priced: "bg-success/15 text-success border-success/30",
  no_offer: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning border-warning/30",
};

function SourcingPage() {
  const qc = useQueryClient();
  const createFn = useServerFn(createSourcingRequest);
  const priceFn = useServerFn(priceSourcingRequest);
  const getFn = useServerFn(getSourcingRequest);
  const listFn = useServerFn(listSourcingRequests);
  const orderFn = useServerFn(placeSourcingOrder);
  const reqQuoteFn = useServerFn(requestLineQuote);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("Ghana");
  const [currency, setCurrency] = useState("GHS");
  const [lines, setLines] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: listData } = useQuery({ queryKey: ["sourcing-requests"], queryFn: () => listFn() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = (listData as any)?.requests ?? [];

  const { data: detail, isFetching: loadingDetail } = useQuery({
    queryKey: ["sourcing-request", selectedId],
    enabled: !!selectedId,
    queryFn: () => getFn({ data: { id: selectedId! } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = (detail as any)?.request ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = (detail as any)?.items ?? [];

  const submitMut = useMutation({
    mutationFn: async () => {
      const parsed = lines
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => ({ description: l }));
      if (parsed.length === 0) throw new Error("Add at least one item (one per line)");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = (await createFn({
        data: { title: title.trim() || "Sourcing request", destinationCountry: country, currency, items: parsed },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)) as any;
      await priceFn({ data: { id: created.id } });
      return created.id as string;
    },
    onSuccess: (id) => {
      setTitle("");
      setLines("");
      setSelectedId(id);
      qc.invalidateQueries({ queryKey: ["sourcing-requests"] });
      qc.invalidateQueries({ queryKey: ["sourcing-request", id] });
      toast.success("Priced — see landed cost below");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not price request"),
  });

  const quoteReqMut = useMutation({
    mutationFn: (itemId: string) => reqQuoteFn({ data: { itemId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sourcing-request", selectedId] });
      toast.success("Quote requested — we'll source this line for you");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not request quote"),
  });

  const orderMut = useMutation({
    mutationFn: () => orderFn({ data: { id: selectedId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sourcing-requests"] });
      qc.invalidateQueries({ queryKey: ["sourcing-request", selectedId] });
      toast.success("Import order placed — track it under My orders");
      navigate({ to: "/orders" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not place order"),
  });

  const landedSubtotal = items.reduce(
    (s, it) => s + (Number(it.converted_unit_price ?? 0) * Number(it.qty ?? 1)),
    0,
  );
  const reqCurrency = request?.currency ?? currency;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <PageHeader
        title="Source & import"
        description="Tell us what you need. We price it from global suppliers and show the landed cost to your country."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Intake */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold">New sourcing request</h3>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="s-title">Title</Label>
              <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Site UPS & networking" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="s-country">Deliver to</Label>
                <Input id="s-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="s-currency">Currency</Label>
                <Input id="s-currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="GHS" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-lines">What do you need? (one item per line)</Label>
              <textarea
                id="s-lines"
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                rows={7}
                placeholder={"APC Smart-UPS 3000VA\nHirschmann industrial ethernet switch\nPhoenix Contact interface relay"}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
            </div>
            <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending} className="gap-1.5">
              {submitMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Price it landed
            </Button>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-4">
          {!selectedId ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
              <PackageSearch className="mb-2 size-6 opacity-60" />
              Add your items and price them to see landed cost here.
            </div>
          ) : loadingDetail && items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Pricing…</div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{request?.title ?? "Results"}</h3>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe2 className="size-3.5" /> {request?.destination_country ?? "—"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Landed unit</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <div className="font-medium">{it.description}</div>
                          <div className="mt-0.5">
                            {it.item_status === "no_offer" ? (
                              <button
                                onClick={() => quoteReqMut.mutate(it.id)}
                                disabled={quoteReqMut.isPending}
                                className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                              >
                                No offer — request a quote
                              </button>
                            ) : it.item_status === "quote_requested" ? (
                              <Badge variant="outline" className="border-info/30 bg-info/15 text-[10px] text-info">
                                Quote requested
                              </Badge>
                            ) : (
                              <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[it.item_status] ?? ""}`}>
                                {it.item_status === "priced"
                                  ? `${it.offer_count} offer${it.offer_count === 1 ? "" : "s"}`
                                  : "Pending"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{it.best_distributor ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(it.qty ?? 1)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(it.converted_unit_price, reqCurrency)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {it.converted_unit_price != null
                            ? money(Number(it.converted_unit_price) * Number(it.qty ?? 1), reqCurrency)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">Goods</span>
                  <span className="tabular-nums">{money(request?.goods_subtotal ?? landedSubtotal, reqCurrency)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">Freight (est · {request?.freight_pct ?? 12}%)</span>
                  <span className="tabular-nums">{money(request?.freight_est, reqCurrency)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">Import duty (est · {request?.duty_pct ?? 20}%)</span>
                  <span className="tabular-nums">{money(request?.duty_est, reqCurrency)}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">VAT &amp; levies (est · {request?.vat_pct ?? 21.9}%)</span>
                  <span className="tabular-nums">{money(request?.vat_est, reqCurrency)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                  <span className="font-medium">Estimated landed total</span>
                  <span className="text-lg font-semibold tabular-nums">{money(request?.landed_total ?? landedSubtotal, reqCurrency)}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {request?.landed_source === "zonos"
                    ? "Duty & tax calculated by Zonos in real time; freight estimated. "
                    : `Freight, duty and VAT/levies are estimates for ${request?.destination_country ?? "your country"}. `}
                  Prices convert live to {reqCurrency}.
                </p>
                {request?.status === "ordered" ? (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                    <Check className="size-4" /> Order placed — track it under My orders.
                  </div>
                ) : (
                  <Button
                    onClick={() => orderMut.mutate()}
                    disabled={orderMut.isPending || !(Number(request?.landed_total ?? 0) > 0)}
                    className="mt-3 w-full gap-1.5"
                  >
                    {orderMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <PackageSearch className="size-4" />}
                    Place import order
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Past requests */}
      {requests.length > 0 && (
        <Card className="mt-4 p-0 overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Your requests</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Deliver to</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedId(r.id)}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.destination_country ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.status] ?? ""}`}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
