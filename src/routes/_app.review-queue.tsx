import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  FileText,
  ChevronRight,
  Download,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/foundations/empty-state";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { reviewExtraction, bulkReviewExtractions, exportReviewAuditLog } from "@/lib/api/extraction.functions";

type DocType = "rfq" | "purchase_order" | "rfq_amendment" | "po_amendment" | "unknown";
type LineMatch = "matched" | "not_found" | "sourcing" | "manual";

type QueueRow = {
  id: string;
  inbound_email_id: string;
  doc_type: DocType;
  confidence: number | null;
  summary: string | null;
  buyer_ref: string | null;
  due_date: string | null;
  currency: string | null;
  status: string;
  created_at: string;
  review_notes: string | null;
  inbound_emails: {
    subject: string | null;
    from_address: string;
    from_name: string | null;
  } | null;
};

type LineRow = {
  id: string;
  line_no: number;
  requested_description: string;
  requested_brand: string | null;
  requested_model: string | null;
  requested_qty: number | null;
  requested_unit: string | null;
  target_price: number | null;
  match_status: LineMatch;
  match_confidence: number | null;
  lookup_note: string | null;
};

const docTypeOptions: { value: DocType; label: string }[] = [
  { value: "rfq", label: "RFQ" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "rfq_amendment", label: "RFQ Amendment" },
  { value: "po_amendment", label: "PO Amendment" },
  { value: "unknown", label: "Unclassified" },
];

const docMeta: Record<DocType, { label: string; tone: string }> = {
  rfq: { label: "RFQ", tone: "bg-info/10 text-info border-info/20" },
  purchase_order: { label: "Purchase Order", tone: "bg-accent/10 text-accent border-accent/20" },
  rfq_amendment: { label: "RFQ Amendment", tone: "bg-warning/10 text-warning border-warning/20" },
  po_amendment: { label: "PO Amendment", tone: "bg-warning/10 text-warning border-warning/20" },
  unknown: { label: "Unclassified", tone: "bg-muted text-muted-foreground border-border" },
};

function useReviewQueue(workspaceId: string | null | undefined, threshold: number) {
  return useQuery({
    queryKey: ["review-queue", workspaceId, threshold],
    enabled: !!workspaceId,
    queryFn: async (): Promise<QueueRow[]> => {
      const { data, error } = await supabase
        .from("extracted_documents")
        .select(
          "id, inbound_email_id, doc_type, confidence, summary, buyer_ref, due_date, currency, status, created_at, review_notes, inbound_emails(subject, from_address, from_name)",
        )
        .eq("workspace_id", workspaceId!)
        .eq("status", "pending_review")
        .order("confidence", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as QueueRow[]).filter(
        (d) => (d.confidence ?? 0) < threshold || d.doc_type === "unknown",
      );
    },
  });
}

function useLineItems(docId: string | null) {
  return useQuery({
    queryKey: ["extracted-line-items", docId],
    enabled: !!docId,
    queryFn: async (): Promise<LineRow[]> => {
      const { data, error } = await supabase
        .from("extracted_line_items")
        .select("*")
        .eq("document_id", docId!)
        .order("line_no");
      if (error) throw error;
      return (data ?? []) as LineRow[];
    },
  });
}

function ConfidencePill({ score }: { score: number | null }) {
  const pct = Math.round((score ?? 0) * 100);
  const tone =
    pct >= 80
      ? "bg-success/10 text-success border-success/20"
      : pct >= 50
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium", tone)}>
      <AlertCircle className="size-3" />
      {pct}%
    </span>
  );
}

function MatchBadge({ status }: { status: LineMatch }) {
  if (status === "matched")
    return (
      <Badge className="gap-1 border-success/30 bg-success/10 text-success" variant="outline">
        <CheckCircle2 className="size-3" /> Matched
      </Badge>
    );
  if (status === "sourcing")
    return (
      <Badge className="gap-1 border-warning/30 bg-warning/10 text-warning" variant="outline">
        <Search className="size-3" /> Sourcing
      </Badge>
    );
  if (status === "manual")
    return <Badge variant="outline">Manual</Badge>;
  return (
    <Badge className="gap-1 border-muted bg-muted text-muted-foreground" variant="outline">
      <AlertCircle className="size-3" /> Not in catalog
    </Badge>
  );
}

function ReviewQueuePage() {
  const { data: workspaceId, isLoading: wsLoading } = useWorkspaceId();
  const [threshold, setThreshold] = useState(0.8);
  const { data: queue, isLoading } = useReviewQueue(workspaceId, threshold);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftType, setDraftType] = useState<DocType | null>(null);
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();
  const reviewFn = useServerFn(reviewExtraction);
  const bulkReviewFn = useServerFn(bulkReviewExtractions);
  const exportAuditFn = useServerFn(exportReviewAuditLog);

  const selectedDoc = useMemo(
    () => queue?.find((d) => d.id === selected) ?? null,
    [queue, selected],
  );
  const { data: lineItems } = useLineItems(selected);

  // reset draft when switching docs
  useEffect(() => {
    setDraftType(selectedDoc?.doc_type ?? null);
    setNotes(selectedDoc?.review_notes ?? "");
  }, [selectedDoc?.id, selectedDoc?.doc_type, selectedDoc?.review_notes]);

  const allSelected = queue && queue.length > 0 && selectedIds.size === queue.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!queue) return;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map((d) => d.id)));
    }
  };

  const reviewMutation = useMutation({
    mutationFn: async (vars: { action: "approve" | "reject" }) =>
      reviewFn({
        data: {
          documentId: selectedDoc!.id,
          action: vars.action,
          docType: draftType ?? undefined,
          notes: notes || undefined,
        },
      }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "approve" ? "Approved — ready to create RFQ/PO" : "Rejected");
      qc.invalidateQueries({ queryKey: ["review-queue", workspaceId] });
      qc.invalidateQueries({ queryKey: ["extracted-documents", workspaceId] });
      setSelected(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save review"),
  });

  const bulkReviewMutation = useMutation({
    mutationFn: async (vars: { action: "approve" | "reject" }) =>
      bulkReviewFn({
        data: {
          documentIds: Array.from(selectedIds),
          action: vars.action,
        },
      }),
    onSuccess: (_d, vars) => {
      toast.success(
        `${vars.action === "approve" ? "Approved" : "Rejected"} ${selectedIds.size} document(s)`,
      );
      qc.invalidateQueries({ queryKey: ["review-queue", workspaceId] });
      qc.invalidateQueries({ queryKey: ["extracted-documents", workspaceId] });
      setSelectedIds(new Set());
      setSelected(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Bulk review failed"),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const result = await exportAuditFn({ data: { workspaceId: workspaceId! } });
      return result.csv;
    },
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `review-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit log downloaded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Export failed"),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Review Queue"
        description="Confirm or correct low-confidence AI extractions before they flow into RFQ or PO records."
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span className="font-medium">Confidence threshold</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
              {Math.round(threshold * 100)}%
            </span>
          </div>
          <div className="min-w-48 flex-1 max-w-sm">
            <Slider
              value={[threshold * 100]}
              onValueChange={(v) => setThreshold((v[0] ?? 80) / 100)}
              min={0}
              max={100}
              step={5}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Documents below this score (or classified as Unclassified) need a human OK.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleSelectAll}
                disabled={!queue?.length}
                aria-label="Select all"
              />
              <span className="text-sm font-medium">
                Awaiting review
                {queue && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {queue.length}
                  </span>
                )}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkReviewMutation.isPending}
                  onClick={() => bulkReviewMutation.mutate({ action: "reject" })}
                >
                  <XCircle className="size-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={bulkReviewMutation.isPending}
                  onClick={() => bulkReviewMutation.mutate({ action: "approve" })}
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve
                </Button>
              </div>
            )}
          </div>
          {wsLoading || isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : !queue?.length ? (
            <EmptyState
              icon={ShieldCheck}
              title="Inbox zero"
              description="No low-confidence extractions waiting. New items appear here as emails come in."
            />
          ) : (
            <ul className="divide-y divide-border">
              {queue.map((d) => {
                const meta = docMeta[d.doc_type];
                const active = selected === d.id;
                const checked = selectedIds.has(d.id);
                return (
                  <li key={d.id} className={cn("flex items-start gap-2 px-4 py-3", active && "bg-muted/60")}>
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={checked}
                      onChange={() => toggleSelect(d.id)}
                      aria-label={`Select ${d.inbound_emails?.subject ?? "document"}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => setSelected(d.id)}
                      className="flex flex-1 items-start gap-3 text-left transition-colors hover:bg-muted/40"
                    >
                      <FileText className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium",
                              meta.tone,
                            )}
                          >
                            {meta.label}
                          </span>
                          <ConfidencePill score={d.confidence} />
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                          {d.inbound_emails?.subject ?? "(no subject)"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.inbound_emails?.from_name ?? d.inbound_emails?.from_address}
                          {" · "}
                          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 size-4 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div>
          {!selectedDoc ? (
            <Card className="flex h-full items-center justify-center p-10">
              <EmptyState
                icon={Sparkles}
                title="Pick a document"
                description="Choose an extraction on the left to confirm its type or correct it."
              />
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ConfidencePill score={selectedDoc.confidence} />
                    <span className="text-xs text-muted-foreground">
                      AI guess: {docMeta[selectedDoc.doc_type].label}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">
                    {selectedDoc.inbound_emails?.subject ?? "(no subject)"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    From {selectedDoc.inbound_emails?.from_name ?? selectedDoc.inbound_emails?.from_address}
                  </p>
                </div>
              </div>

              {selectedDoc.summary && (
                <p className="mt-4 rounded-md border border-accent/20 bg-accent/5 p-3 text-sm text-foreground">
                  {selectedDoc.summary}
                </p>
              )}

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Correct document type
                  </label>
                  <Select
                    value={draftType ?? undefined}
                    onValueChange={(v) => setDraftType(v as DocType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Reviewer notes (optional)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. buyer attached a revised qty for line 3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Extracted line items</h4>
                  <span className="text-xs text-muted-foreground">{lineItems?.length ?? 0} item(s)</span>
                </div>
                {!lineItems?.length ? (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No line items extracted.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-left">Match</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lineItems.map((li) => (
                          <tr key={li.id}>
                            <td className="px-3 py-2 text-muted-foreground">{li.line_no}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{li.requested_description}</div>
                              {(li.requested_brand || li.requested_model) && (
                                <div className="text-xs text-muted-foreground">
                                  {[li.requested_brand, li.requested_model].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {li.requested_qty ?? "—"}
                              {li.requested_unit ? ` ${li.requested_unit}` : ""}
                            </td>
                            <td className="px-3 py-2">
                              <MatchBadge status={li.match_status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ action: "reject" })}
                >
                  <XCircle className="size-4" />
                  Reject
                </Button>
                <Button
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate({ action: "approve" })}
                >
                  <CheckCircle2 className="size-4" />
                  Approve & route to {docMeta[draftType ?? selectedDoc.doc_type].label}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_app/review-queue")({
  component: ReviewQueuePage,
});
