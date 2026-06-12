import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { productMatches, suppliers } from "@/lib/data"
import { Search, FileText, Sparkles, CheckCircle2 } from "lucide-react"

function ProductSearchPage() {
  const [query, setQuery] = useState('Business laptop, Core i7, 16GB RAM, 512GB SSD, 14"')

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Product Search & Sourcing"
        description="Search across authorized distributor catalogs and OEM equivalents. Find exact matches or comparable alternatives."
      />

      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe the product or paste a spec…"
              className="pl-9"
            />
          </div>
          <Button onClick={() => toast.success("Matching across distributor catalogs…")}>
            <Sparkles className="size-4" />
            Find matches
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-accent" />
          AI matched 3 products across {suppliers.length} distributors. Sorted by match confidence.
        </p>
      </Card>

      <div className="grid gap-4">
        {productMatches.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {m.brand} {m.model}
                  </h3>
                  {m.matchType === "exact" ? (
                    <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                      Exact match
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-info/30 bg-info/10 text-info">
                      Equivalent
                    </Badge>
                  )}
                  {m.recommended && (
                    <Badge className="bg-accent text-accent-foreground">
                      <CheckCircle2 className="size-3" />
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{m.spec}</p>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    Supplier: <span className="text-foreground">{m.supplier}</span>
                  </span>
                  <span className="text-muted-foreground">
                    OEM: <span className="text-foreground">{m.oem}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Lead time: <span className="text-foreground">{m.leadTime}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 lg:flex-col lg:items-end">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Indicative</p>
                  <p className="text-xl font-semibold tabular-nums">{m.indicativePrice}</p>
                  <p className="text-xs text-muted-foreground">{m.confidence}% confidence</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <FileText className="size-4" />
                    Datasheet
                  </Button>
                  <Button size="sm">Add to RFQ</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}


export const Route = createFileRoute("/_app/product-search")({
  component: ProductSearchPage,
});
