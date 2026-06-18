import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Truck, Search, Check, Trash2, ShieldCheck, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getShippingRates,
  getQuoteParcel,
  applyShipmentToQuote,
  listQuoteShipments,
  deleteQuoteShipment,
} from "@/lib/api/shipping.functions";

const COUNTRIES = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CN", name: "China" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
  { code: "KE", name: "Kenya" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rate = any;

export function QuoteShippingCard({
  quoteId,
  quoteCurrency,
  destinationCity,
  destinationCountry = "GH",
  editable = true,
}: {
  quoteId: string;
  quoteCurrency?: string | null;
  destinationCity?: string | null;
  destinationCountry?: string;
  editable?: boolean;
}) {
  const qc = useQueryClient();
  const ratesFn = useServerFn(getShippingRates);
  const applyFn = useServerFn(applyShipmentToQuote);
  const listFn = useServerFn(listQuoteShipments);
  const delFn = useServerFn(deleteQuoteShipment);
  const parcelFn = useServerFn(getQuoteParcel);

  const [originCountry, setOriginCountry] = useState("CN");
  const [originCity, setOriginCity] = useState("");
  const [destCountry, setDestCountry] = useState(destinationCountry);
  const [destCity, setDestCity] = useState(destinationCity ?? "Accra");
  const [weight, setWeight] = useState("5");
  const [rates, setRates] = useState<Rate[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [providers, setProviders] = useState<any[]>([]);
  const [applyingRef, setApplyingRef] = useState<string | null>(null);

  const { data: shipData } = useQuery({
    queryKey: ["quote-shipment", quoteId],
    queryFn: () => listFn({ data: { quoteId } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const current: any = (shipData as any)?.shipments?.[0] ?? null;

  // Auto-derive the parcel weight from the quote's line items (catalogue weight +
  // volumetric from dimensions) so it doesn't have to be re-keyed. The user can override.
  const userEditedWeight = useRef(false);
  const { data: parcelData } = useQuery({
    queryKey: ["quote-parcel", quoteId],
    queryFn: () => parcelFn({ data: { quoteId } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parcel: any = parcelData ?? null;
  useEffect(() => {
    if (parcel && parcel.chargeableKg > 0 && !userEditedWeight.current) {
      setWeight(String(parcel.chargeableKg));
    }
  }, [parcel?.chargeableKg]);

  const ratesMut = useMutation({
    mutationFn: () =>
      ratesFn({
        data: {
          origin: { country: originCountry, city: originCity || undefined },
          destination: { country: destCountry, city: destCity || undefined },
          parcel: { weightKg: Number(weight) || 1, description: "Goods" },
          currency: quoteCurrency || "GHS",
        },
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (res: any) => {
      setRates(res.rates ?? []);
      setProviders(res.providers ?? []);
      if ((res.rates ?? []).length === 0) {
        const errs = (res.providers ?? []).filter((p: { status: string }) => p.status === "error");
        toast.message(
          errs.length ? `No rates: ${errs[0].error}` : "No rates returned for this lane.",
        );
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not fetch rates"),
  });

  const applyMut = useMutation({
    mutationFn: (r: Rate) =>
      applyFn({
        data: {
          quoteId,
          providerSlug: r.providerSlug,
          carrierName: r.carrierName,
          carrierLogo: r.carrierLogo ?? null,
          service: r.service ?? null,
          amount: Number(r.amount),
          currency: r.currency,
          etaText: r.etaText ?? null,
          etaMinutes: r.etaMinutes ?? null,
          includesInsurance: r.includesInsurance ?? null,
          bookable: r.bookable ?? true,
          rateRef: r.rateRef ?? null,
        },
      }),
    onMutate: (r: Rate) => setApplyingRef(r.rateRef ?? r.carrierName),
    onSuccess: () => {
      toast.success("Shipping added to quote");
      setRates(null);
      qc.invalidateQueries({ queryKey: ["quote-shipment", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not apply rate"),
    onSettled: () => setApplyingRef(null),
  });

  const removeMut = useMutation({
    mutationFn: () => delFn({ data: { quoteId } }),
    onSuccess: () => {
      toast.success("Shipping removed");
      qc.invalidateQueries({ queryKey: ["quote-shipment", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
  });

  return (
    <Card className="mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Truck className="size-4" /> Shipping rates
        </h3>
        <span className="text-xs text-muted-foreground">Live courier rates · DHL, FedEx, UPS, Aramex</span>
      </div>

      {current && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
          <div className="flex items-center gap-3">
            {current.carrier_logo ? (
              <img src={current.carrier_logo} alt={current.carrier_name} className="h-7 w-7 rounded object-contain" />
            ) : (
              <div className="flex size-7 items-center justify-center rounded bg-muted"><Truck className="size-4" /></div>
            )}
            <div>
              <p className="text-sm font-medium">{current.carrier_name}{current.service ? ` · ${current.service}` : ""}</p>
              <p className="text-xs text-muted-foreground">
                {current.eta_text ?? "—"}
                {current.source_currency && current.source_currency !== current.currency
                  ? ` · ${current.source_currency} ${Number(current.source_amount).toFixed(2)} @ ${Number(current.fx_rate).toFixed(4)}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums">{current.currency} {Number(current.amount).toFixed(2)}</span>
            {editable && (
              <Button size="icon" variant="ghost" className="size-8" onClick={() => removeMut.mutate()} title="Remove shipping">
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {editable && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <LaneField label="From">
              <Select value={originCountry} onValueChange={setOriginCountry}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </LaneField>
            <LaneField label="Origin city">
              <Input value={originCity} onChange={(e) => setOriginCity(e.target.value)} placeholder="Shenzhen" className="h-9" />
            </LaneField>
            <LaneField label="To">
              <Select value={destCountry} onValueChange={setDestCountry}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </LaneField>
            <LaneField label="Dest city">
              <Input value={destCity} onChange={(e) => setDestCity(e.target.value)} placeholder="Accra" className="h-9" />
            </LaneField>
            <LaneField label="Weight (kg)">
              <Input
                type="number"
                value={weight}
                onChange={(e) => {
                  userEditedWeight.current = true;
                  setWeight(e.target.value);
                }}
                className="h-9"
              />
            </LaneField>
          </div>

          {parcel && parcel.chargeableKg > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Auto-filled from {parcel.lines} item{parcel.lines === 1 ? "" : "s"}:
              <span className="font-medium text-foreground">{parcel.chargeableKg} kg chargeable</span>
              {parcel.volumetricKg > parcel.actualKg
                ? ` (volumetric ${parcel.volumetricKg} kg &gt; actual ${parcel.actualKg} kg)`
                : ` (actual ${parcel.actualKg} kg)`}
              {parcel.missing > 0 ? ` · ${parcel.missing} item${parcel.missing === 1 ? "" : "s"} missing weight` : ""}
            </p>
          )}

          <div className="mt-3">
            <Button size="sm" onClick={() => ratesMut.mutate()} disabled={ratesMut.isPending}>
              <Search className="size-3.5" /> {ratesMut.isPending ? "Getting rates…" : "Get shipping rates"}
            </Button>
          </div>

          {rates && rates.length > 0 && (
            <div className="mt-4 divide-y divide-border rounded-lg border border-border">
              {rates.map((r, i) => {
                const ref = r.rateRef ?? r.carrierName;
                return (
                  <div key={`${ref}-${i}`} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      {r.carrierLogo ? (
                        <img src={r.carrierLogo} alt={r.carrierName} className="h-7 w-7 rounded object-contain" />
                      ) : (
                        <div className="flex size-7 items-center justify-center rounded bg-muted"><Truck className="size-4" /></div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{r.carrierName}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {r.service ?? ""}{r.etaText ? ` · ${r.etaText}` : ""}
                          {r.includesInsurance && <ShieldCheck className="size-3 text-success" />}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">{r.currency} {Number(r.amount).toFixed(2)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={applyMut.isPending && applyingRef === ref}
                        onClick={() => applyMut.mutate(r)}
                      >
                        <Check className="size-3.5" /> {applyMut.isPending && applyingRef === ref ? "Adding…" : "Use"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {providers.some((p) => p.status === "error") && (
            <p className="mt-2 text-xs text-muted-foreground">
              {providers
                .filter((p) => p.status === "error")
                .map((p) => `${p.name}: ${p.error}`)
                .join(" · ")}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function LaneField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
