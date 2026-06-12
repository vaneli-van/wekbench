import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Mail,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileQuestion,
  CheckCircle2,
  Search,
  AlertCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/foundations/empty-state";
import { PageHeader } from "@/components/page-header";
import { getRfq, ensureQuoteForRfq } from "@/lib/api/quotes.functions";


function MatchBadge({ status }: { status: string }) {
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
  if (status === "manual") return <Badge variant="outline">Manual</Badge>;
  return (
    <Badge className="gap-1 border-muted bg-muted text-muted-foreground" variant="outline">
      <AlertCircle className="size-3" /> Not in catalog
    </Badge>
  );
}

function RfqDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getRfqFn = useServerFn(getRfq);
  const ensureQuoteFn = useServerFn(ensureQuoteForRfq);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rfq", id],
    queryFn: () => getRfqFn({ data: { id } }),
  });

  const buildQuote = useMutation({
    mutationFn: () => ensureQuoteFn({ data: { rfqId: id, defaultMarginPct: 20 } }),
    onSuccess: ({ quoteId }) => {
      toast.success("Quote ready");
      navigate({ to: "/quote/$id", params: { id: quoteId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not build quote"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data?.rfq) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <EmptyState
          icon={FileQuestion}
          title="RFQ not found"
          description={error instanceof Error ? error.message : `No RFQ with id "${id}".`}
          action={{ label: "Back to review queue", href: "/review-queue" }}
        />
      </div>
    );
  }

  const { rfq, items } = data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = rfq as any;
  const existingQuote = r.quotes?.[0];
  const email = r.extracted_documents?.inbound_emails;
  const subject = email?.subject ?? "(no subject)";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/review-queue" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Review Queue
        </Link>
      </div>

      <PageHeader
        title={r.buyer_ref ? `RFQ · ${r.buyer_ref}` : "Request for Quote"}
        description={r.summary ?? subject}
        actions={
          existingQuote ? (
            <Button asChild>
              <Link to="/quote/$id" params={{ id: existingQuote.id }}>
                Open Quote {existingQuote.quote_number} <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button onClick={() => buildQuote.mutate()} disabled={buildQuote.isPending}>
              <Sparkles className="size-4" /> Build Quote
            </Button>
          )
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Building2 className="size-3.5" /> Buyer
          </div>
          <p className="font-medium">{r.buyer_company ?? r.buyer_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{r.buyer_email ?? email?.from_address}</p>
        </Card>
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Calendar className="size-3.5" /> Due date
          </div>
          <p className="font-medium">
            {r.due_date ? format(new Date(r.due_date), "PPP") : "Not specified"}
          </p>
          <p className="text-sm text-muted-foreground">Currency: {r.currency ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3.5" /> Status
          </div>
          <Badge variant="outline" className="capitalize">
            {r.status}
          </Badge>
          {r.extracted_documents?.confidence != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Extraction confidence: {Math.round((r.extracted_documents.confidence ?? 0) * 100)}%
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Original request</h3>
        </div>
        <p className="text-sm font-medium">{subject}</p>
        {email?.text_body && (
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {email.text_body}
          </pre>
        )}
      </Card>

      <Card className="mt-6 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Requested line items</h3>
          <span className="text-xs text-muted-foreground">{items.length} item(s)</span>
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No line items extracted.</p>
        ) : (
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(items as any[]).map((li) => (
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
                    {li.requested_qty ?? "—"} {li.requested_unit ?? ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {li.target_price != null ? `${r.currency ?? ""} ${li.target_price}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <MatchBadge status={li.match_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_app/rfq/$id")({
  component: RfqDetailPage,
  head: ({ params }) => ({ meta: [{ title: `RFQ ${params.id} — wekbench` }] }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description={error instanceof Error ? error.message : "Unknown error"}
          action={{
            label: "Try again",
            onClick: () => {
              reset();
              router.invalidate();
            },
          }}
        />
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <EmptyState
        icon={FileQuestion}
        title="RFQ not found"
        description="That RFQ doesn't exist."
        action={{ label: "Back to review queue", href: "/review-queue" }}
      />
    </div>
  ),
});
