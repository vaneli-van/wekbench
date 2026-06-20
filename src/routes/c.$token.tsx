import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, CheckCircle2, MessageSquare, Plus, Trash2, HelpCircle } from "lucide-react";

import { getClarificationPublic, submitClarificationPublic } from "@/lib/api/clarifications.functions";
import { Wordmark } from "@/components/wordmark";

type Question = { id: string; line_no: number | null; question: string; buyer_answer: string | null };
type Item = {
  line_item_id: string;
  line_no: number | null;
  description: string;
  brand: string | null;
  model: string | null;
  qty: number | null;
  unit: string | null;
};
type AddRow = { description: string; qty: string; unit: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-muted">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Wordmark size="sm" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" /> Secure clarification
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}

function ClarifyPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getClarificationPublic);
  const submitFn = useServerFn(submitClarificationPublic);

  const { data, isLoading } = useQuery({
    queryKey: ["public-clarification", token],
    queryFn: () => getFn({ data: { token } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = (data as any)?.data as any;
  const clar = payload?.clarification;
  const questions: Question[] = useMemo(() => payload?.questions ?? [], [payload]);
  const items: Item[] = useMemo(() => payload?.items ?? [], [payload]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({});
  const [addRows, setAddRows] = useState<AddRow[]>([]);

  // Prefill from any prior submission once the payload arrives.
  useEffect(() => {
    if (!payload) return;
    const a: Record<string, string> = {};
    for (const q of questions) a[q.id] = q.buyer_answer ?? "";
    setAnswers(a);
    setComment(clar?.buyer_comment ?? "");
    if (clar?.answered_by) setName(clar.answered_by);
    const qe: Record<string, string> = {};
    for (const it of items) qe[it.line_item_id] = String(it.qty ?? "");
    setQtyEdits(qe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const submitMut = useMutation({
    mutationFn: () => {
      const answerArr = questions.map((q) => ({ id: q.id, answer: (answers[q.id] ?? "").trim() || undefined }));
      const changes: Array<{ kind: "qty" | "add"; lineNo?: number; lineItemId?: string; payload: Record<string, unknown> }> = [];
      for (const it of items) {
        const edited = Number(qtyEdits[it.line_item_id]);
        if (Number.isFinite(edited) && edited >= 0 && edited !== Number(it.qty ?? 0)) {
          changes.push({ kind: "qty", lineNo: it.line_no ?? undefined, lineItemId: it.line_item_id, payload: { qty: edited } });
        }
      }
      for (const r of addRows) {
        if (r.description.trim()) {
          changes.push({
            kind: "add",
            payload: { description: r.description.trim(), qty: Number(r.qty) || 1, unit: r.unit.trim() || null },
          });
        }
      }
      return submitFn({
        data: { token, name: name.trim() || undefined, comment: comment.trim() || undefined, answers: answerArr, changes },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["public-clarification", token] }),
  });

  if (isLoading) {
    return <Shell><p className="text-center text-sm text-muted-foreground">Loading…</p></Shell>;
  }
  if (!clar) {
    return (
      <Shell>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <HelpCircle className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Clarification not available</p>
          <p className="mt-1 text-sm text-muted-foreground">This link is invalid, or it hasn&apos;t been shared yet.</p>
        </div>
      </Shell>
    );
  }

  const submitted = submitMut.isSuccess || clar.status === "answered";

  return (
    <Shell>
      {submitted && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-success">
          <CheckCircle2 className="size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Thank you — your response was sent</p>
            <p className="text-xs">{clar.seller ?? "The supplier"} has been notified. You can update your answers below if needed.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{clar.seller ?? "Clarification"}</p>
        <h1 className="text-lg font-semibold">{clar.title ?? clar.quote_number}</h1>
        <p className="text-sm text-muted-foreground">
          A few questions to make sure we quote {clar.quote_number} exactly to your requirement.
        </p>
      </div>

      {/* Questions */}
      {questions.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="size-4" /> Clarification questions</h2>
          <div className="mt-3 space-y-4">
            {questions.map((q) => (
              <div key={q.id}>
                <p className="text-sm font-medium">
                  {q.line_no != null && <span className="text-muted-foreground">Line {q.line_no}: </span>}
                  {q.question}
                </p>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((s) => ({ ...s, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder="Your answer"
                  className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line items — light amendment */}
      {items.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Items requested</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Adjust a quantity if it&apos;s changed, or add items you also need. We&apos;ll confirm pricing.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left font-medium">Item</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it) => (
                  <tr key={it.line_item_id}>
                    <td className="py-2 pr-2">
                      <p className="font-medium">{it.description}</p>
                      {(it.brand || it.model) && (
                        <p className="text-xs text-muted-foreground">{[it.brand, it.model].filter(Boolean).join(" · ")}</p>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={qtyEdits[it.line_item_id] ?? ""}
                        onChange={(e) => setQtyEdits((s) => ({ ...s, [it.line_item_id]: e.target.value }))}
                        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-ring"
                      />
                      {it.unit ? <span className="ml-1 text-xs text-muted-foreground">{it.unit}</span> : null}
                    </td>
                  </tr>
                ))}
                {addRows.map((r, i) => (
                  <tr key={`add-${i}`} className="bg-muted/30">
                    <td className="py-2 pr-2">
                      <input
                        value={r.description}
                        onChange={(e) => setAddRows((s) => s.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                        placeholder="New item description"
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:border-ring"
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={1}
                          value={r.qty}
                          onChange={(e) => setAddRows((s) => s.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))}
                          placeholder="Qty"
                          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-ring"
                        />
                        <button
                          onClick={() => setAddRows((s) => s.filter((_, j) => j !== i))}
                          className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setAddRows((s) => [...s, { description: "", qty: "1", unit: "" }])}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          >
            <Plus className="size-3.5" /> Add an item
          </button>
        </div>
      )}

      {/* Comment + identity + submit */}
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <label className="text-sm font-medium">Anything else? (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Add any context for the supplier"
          className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <div className="mt-3">
          <label className="text-sm font-medium">Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring sm:w-72"
          />
        </div>
        {submitMut.isError && (
          <p className="mt-2 text-xs text-destructive">
            {submitMut.error instanceof Error ? submitMut.error.message : "Could not submit"}
          </p>
        )}
        <div className="mt-4">
          <button
            onClick={() => submitMut.mutate()}
            disabled={submitMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground disabled:opacity-50"
          >
            <CheckCircle2 className="size-4" /> {submitMut.isPending ? "Sending…" : submitted ? "Update response" : "Send response"}
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">Wekbench · wekbench.com · 2026</p>
    </Shell>
  );
}

export const Route = createFileRoute("/c/$token")({
  component: ClarifyPage,
});
