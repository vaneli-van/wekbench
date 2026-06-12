import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Sparkles,
  Mail,
  FileText,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  ChevronRight,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/foundations/empty-state";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { runExtraction } from "@/lib/api/extraction.functions";
import { approveExtractionToRfq } from "@/lib/api/quotes.functions";
import { ArrowRight } from "lucide-react";

type DocType = "rfq" | "purchase_order" | "rfq_amendment" | "po_amendment" | "unknown";
type LineMatch = "matched" | "not_found" | "sourcing" | "manual";

type DocRow = {
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
  inbound_emails: {
    subject: string | null;
    from_address: string;
    from_name: string | null;
    received_at: string;
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
  matched_catalog_item_id: string | null;
};

const docMeta: Record<DocType, { label: string; tone: string }> = {
  rfq: { label: "RFQ", tone: "bg-info/10 text-info border-info/20" },
  purchase_order: { label: "Purchase Order", tone: "bg-accent/10 text-accent border-accent/20" },
  rfq_amendment: { label: "RFQ Amendment", tone: "bg-warning/10 text-warning border-warning/20" },
  po_amendment: { label: "PO Amendment", tone: "bg-warning/10 text-warning border-warning/20" },
  unknown: { label: "Unclassified", tone: "bg-muted text-muted-foreground border-border" },
};

function useDocuments(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["extracted-documents", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<DocRow[]> => {
      const { data, error } = await supabase
        .from("extracted_documents")
        .select(
          "id, inbound_email_id, doc_type, confidence, summary, buyer_ref, due_date, currency, status, created_at, inbound_emails(subject, from_address, from_name, received_at)",
        )
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocRow[];
    },
  });
}

function usePendingEmails(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["pending-emails", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_emails")
        .select("id, subject, from_address, from_name, received_at, extraction_status")
        .eq("workspace_id", workspaceId!)
        .order("received_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
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
    return (
      <Badge variant="outline" className="gap-1">
        Manual
      </Badge>
    );
  return (
    <Badge className="gap-1 border-muted bg-muted text-muted-foreground" variant="outline">
      <AlertCircle className="size-3" /> Not in catalog
    </Badge>
  );
}

function ExtractionsPage() {
  const { data: workspaceId, isLoading: wsLoading } = useWorkspaceId();
  const { data: docs, isLoading } = useDocuments(workspaceId);
  const { data: pending } = usePendingEmails(workspaceId);
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const runFn = useServerFn(runExtraction);
  const approveFn = useServerFn(approveExtractionToRfq);

  const selectedDoc = useMemo(() => docs?.find((d) => d.id === selected) ?? null, [docs, selected]);
  const { data: lineItems } = useLineItems(selected);

  const unextracted = useMemo(
    () =>
      (pending ?? []).filter(
        (e) =>
          !docs?.some((d) => d.inbound_email_id === e.id) &&
          e.extraction_status !== "running",
      ),
    [pending, docs],
  );

  const runMutation = useMutation({
    mutationFn: async (emailId: string) => runFn({ data: { emailId } }),
    onSuccess: () => {
      toast.success("Extraction complete");
      qc.invalidateQueries({ queryKey: ["extracted-documents", workspaceId] });
      qc.invalidateQueries({ queryKey: ["pending-emails", workspaceId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Extraction failed"),
  });

  const openRfqMutation = useMutation({
    mutationFn: async (documentId: string) =>
      approveFn({ data: { documentId, createQuote: true, defaultMarginPct: 20 } }),
    onSuccess: ({ rfqId }) => {
      qc.invalidateQueries({ queryKey: ["sidebar-counts", workspaceId] });
      navigate({ to: "/rfq/$id", params: { id: rfqId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not open RFQ"),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="AI Extractions"
        description="Inbound emails classified as RFQs, purchase orders, or amendments — with line items auto-matched against your catalog."
      />

      {unextracted.length > 0 && (
        <Card className="mb-4 border-dashed p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span className="font-medium">{unextracted.length}</span>
              <span className="text-muted-foreground">email(s) without extraction yet</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={runMutation.isPending}
              onClick={() => unextracted.slice(0, 5).forEach((e) => runMutation.mutate(e.id))}
            >
              <Sparkles className="size-4" />
              Run extraction on {Math.min(unextracted.length, 5)}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">
            Documents
            {docs && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {docs.length}
              </span>
            )}
          </div>
          {wsLoading || isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : !docs?.length ? (
            <EmptyState
              icon={Sparkles}
              title="No extractions yet"
              description="Once an email arrives at your wekbench address, it's classified and extracted here automatically."
            />
          ) : (
            <ul className="divide-y divide-border">
              {docs.map((d) => {
                const meta = docMeta[d.doc_type];
                const active = selected === d.id;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelected(d.id)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                        active && "bg-muted/60",
                      )}
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
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                          {d.inbound_emails?.subject ?? "(no subject)"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.inbound_emails?.from_name ?? d.inbound_emails?.from_address}
                          {d.buyer_ref ? ` · ${d.buyer_ref}` : ""}
                        </p>
                        {d.summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.summary}</p>
                        )}
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
                title="Select a document"
                description="Pick an extracted document to view its line items and match status."
              />
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium",
                        docMeta[selectedDoc.doc_type].tone,
                      )}
                    >
                      <Sparkles className="size-3" />
                      {docMeta[selectedDoc.doc_type].label}
                    </span>
                    {selectedDoc.confidence != null && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round((selectedDoc.confidence ?? 0) * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">
                    {selectedDoc.inbound_emails?.subject ?? "(no subject)"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    From {selectedDoc.inbound_emails?.from_name ?? selectedDoc.inbound_emails?.from_address}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={runMutation.isPending}
                  onClick={() => runMutation.mutate(selectedDoc.inbound_email_id)}
                >
                  <RefreshCcw className="size-4" />
                  Re-run
                </Button>
              </div>

              {selectedDoc.summary && (
                <p className="mt-4 rounded-md border border-accent/20 bg-accent/5 p-3 text-sm text-foreground">
                  {selectedDoc.summary}
                </p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <Field label="Buyer ref" value={selectedDoc.buyer_ref} />
                <Field label="Due date" value={selectedDoc.due_date} />
                <Field label="Currency" value={selectedDoc.currency} />
                <Field label="Status" value={selectedDoc.status} />
              </dl>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Line items</h4>
                  <span className="text-xs text-muted-foreground">
                    {lineItems?.length ?? 0} item(s)
                  </span>
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
                          <th className="px-3 py-2 text-right">Target</th>
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
                            <td className="px-3 py-2 text-right tabular-nums">
                              {li.target_price != null
                                ? `${selectedDoc.currency ?? ""} ${li.target_price}`
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <MatchBadge status={li.match_status} />
                                {li.lookup_note && (
                                  <span className="text-[11px] text-muted-foreground">{li.lookup_note}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="size-3" /> Add missing items to catalog
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value || "—"}</dd>
    </div>
  );
}

export const Route = createFileRoute("/_app/extractions")({
  component: ExtractionsPage,
});
