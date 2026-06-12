import { createFileRoute, useRouter } from "@tanstack/react-router";
import { FileQuestion, AlertTriangle } from "lucide-react";
import { QuoteBuilder } from "@/components/quote-builder";
import { pipelineQuotes } from "@/lib/pipeline";
import { EmptyState } from "@/components/foundations/empty-state";

function QuoteDetailPage() {
  const { id } = Route.useParams();
  const quote = pipelineQuotes.find((q) => q.id === id);

  if (!quote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <EmptyState
          title="Quote not found"
          description={`No quote with ID "${id}" exists in the pipeline.`}
          action={{ label: "Back to quotes", href: "/quotes" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 md:px-8">
      <QuoteBuilder
        quoteId={quote.id}
        initialTitle={quote.title}
        initialBuyer={quote.buyer}
      />
    </div>
  );
}

export const Route = createFileRoute("/_app/quote/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Quote ${params.id} — wekbench` }],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <EmptyState
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
        title="Quote not found"
        description="That quote doesn't exist."
        action={{ label: "Back to quotes", href: "/quotes" }}
      />
    </div>
  ),
  component: QuoteDetailPage,
});
