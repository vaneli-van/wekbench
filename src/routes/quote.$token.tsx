import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, FileText, Headphones } from "lucide-react";

import { getQuotePublic, acceptQuotePublic, declineQuotePublic } from "@/lib/api/quotes.functions";
import { Wordmark } from "@/components/wordmark";

function money(v: number | null | undefined, currency = "GHS") {
  const sym = currency === "GHS" ? "GH₵" : `${currency} `;
  return `${sym}${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? String(d) : new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-muted">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Wordmark size="sm" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" /> Secure quote
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}

function QuoteAcceptPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getQuotePublic);
  const acceptFn = useServerFn(acceptQuotePublic);
  const declineFn = useServerFn(declineQuotePublic);

  const { data, isLoading } = useQuery({
    queryKey: ["public-quote", token],
    queryFn: () => getFn({ data: { token } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = (data as any)?.quote as any;
  const q = payload?.quote;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = payload?.items ?? [];

  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [declineMode, setDeclineMode] = useState(false);
  const [declineNote, setDeclineNote] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["public-quote", token] });
  const acceptMut = useMutation({
    mutationFn: () => acceptFn({ data: { token, name: name.trim(), signature: signature.trim() } }),
    onSuccess: invalidate,
  });
  const declineMut = useMutation({
    mutationFn: () => declineFn({ data: { token, note: declineNote.trim() || undefined } }),
    onSuccess: () => { setDeclineMode(false); invalidate(); },
  });

  if (isLoading) {
    return <Shell><p className="text-center text-sm text-muted-foreground">Loading quote…</p></Shell>;
  }
  if (!q) {
    return (
      <Shell>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <FileText className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Quote not available</p>
          <p className="mt-1 text-sm text-muted-foreground">This link is invalid, or the quote hasn&apos;t been sent yet.</p>
        </div>
      </Shell>
    );
  }

  const currency = q.currency ?? "GHS";
  const accepted = q.status === "accepted";
  const declined = q.status === "declined";
  const open = q.status === "sent";

  return (
    <Shell>
      {/* Status banners */}
      {accepted && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-success">
          <CheckCircle2 className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Quote accepted</p>
            <p className="text-xs">Signed by {q.accepted_by} on {fmtDate(q.accepted_at)}. The supplier has been notified.</p>
          </div>
        </div>
      )}
      {declined && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <XCircle className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Quote declined</p>
            <p className="text-xs">This quote has been marked as declined.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{q.seller ?? "Quotation"}</p>
            <h1 className="text-lg font-semibold">{q.title ?? q.quote_number}</h1>
            <p className="text-sm text-muted-foreground">Quote {q.quote_number}{q.buyer_name ? ` · for ${q.buyer_name}` : ""}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {q.valid_until && <p>Valid until <span className="font-medium text-foreground">{fmtDate(q.valid_until)}</span></p>}
            {q.incoterm && <p>Terms: <span className="text-foreground">{q.incoterm}</span></p>}
            {q.lead_time_days != null && <p>Lead time: <span className="text-foreground">{q.lead_time_days} days</span></p>}
          </div>
        </div>

        {/* Line items */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Unit</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((li, i) => {
                const disc = Number(li.discount_pct ?? 0);
                const total = Number(li.unit_price ?? 0) * Number(li.qty ?? 0) * (1 - disc / 100);
                return (
                  <tr key={i}>
                    <td className="py-2 pr-2">
                      <p className="font-medium">{li.description}</p>
                      {(li.brand || li.model) && <p className="text-xs text-muted-foreground">{[li.brand, li.model].filter(Boolean).join(" · ")}</p>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{Number(li.qty ?? 0).toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{money(li.unit_price, currency)}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{money(total, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-3 ml-auto w-60 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{money(q.subtotal, currency)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax ({Number(q.tax_pct ?? 0).toFixed(1)}%)</span><span className="tabular-nums">{money(q.tax_amount, currency)}</span></div>
          <div className="flex justify-between border-t border-border pt-1 text-base font-semibold"><span>Total</span><span className="tabular-nums">{money(q.total, currency)}</span></div>
        </div>

        {q.notes && <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">{q.notes}</p>}
      </div>

      {/* Accept / decline */}
      {open && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          {!declineMode ? (
            <>
              <h2 className="text-sm font-semibold">Accept this quote</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Confirm and e-sign to accept. This creates your order with the supplier.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Your name</p>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Signature (type your name)</p>
                  <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type full name to sign"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm italic outline-none focus:border-ring" />
                </div>
              </div>
              {acceptMut.isError && <p className="mt-2 text-xs text-destructive">{acceptMut.error instanceof Error ? acceptMut.error.message : "Could not accept"}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => acceptMut.mutate()}
                  disabled={acceptMut.isPending || !name.trim() || !signature.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" /> {acceptMut.isPending ? "Accepting…" : "Accept & sign"}
                </button>
                <button onClick={() => setDeclineMode(true)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Decline
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold">Decline this quote</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Optionally tell the supplier why.</p>
              <textarea value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} rows={3} placeholder="Reason (optional)"
                className="mt-3 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring" />
              <div className="mt-3 flex gap-2">
                <button onClick={() => declineMut.mutate()} disabled={declineMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50">
                  <XCircle className="size-4" /> {declineMut.isPending ? "Declining…" : "Confirm decline"}
                </button>
                <button onClick={() => setDeclineMode(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Back</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-border bg-card p-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><Headphones className="size-4" /></div>
        <div>
          <p className="text-sm font-medium">Questions about this quote?</p>
          <p className="text-xs text-muted-foreground">Reply to the email this link came from to reach the supplier.</p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">Wekbench · wekbench.com · 2026</p>
    </Shell>
  );
}

export const Route = createFileRoute("/quote/$token")({
  component: QuoteAcceptPage,
});
