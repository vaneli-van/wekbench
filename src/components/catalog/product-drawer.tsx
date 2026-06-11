
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/foundations/status-badge"
import { AiBadge, AiConfidence, AiSources } from "@/components/foundations/ai-content"
import { EmptyState } from "@/components/foundations/empty-state"
import { PricingHistoryChart } from "./pricing-history-chart"
import {
  type CatalogProduct,
  sourceLabels,
  availabilityLabels,
  authStatusLabels,
} from "@/lib/catalog"
import {
  FileText,
  Download,
  ArrowLeftRight,
  Star,
  EyeOff,
  Pencil,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

function fmt(currency: string, n: number) {
  return `${currency === "USD" ? "$" : currency + " "}${n.toLocaleString()}`
}

export function ProductDrawer({
  product,
  open,
  onClose,
}: {
  product: CatalogProduct | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <TooltipProvider delayDuration={150}>
        {product && (
          <>
            {/* Header */}
            <SheetHeader className="space-y-0 border-b border-border p-5">
              <div className="flex items-start gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  <img src={product.image || "/placeholder.svg"} alt={product.model} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{product.brand}</span>
                    {product.preferred && (
                      <StatusBadge variant="success" dot={false}>
                        <Star className="size-3" /> Preferred
                      </StatusBadge>
                    )}
                  </div>
                  <SheetTitle className="mt-0.5 text-base leading-tight">{product.model}</SheetTitle>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge variant="neutral" dot={false}>
                      {product.id}
                    </StatusBadge>
                    <StatusBadge variant="info" dot={false}>
                      {sourceLabels[product.source]}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              {/* Key facts */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-md border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">Indicative price</p>
                  <p className="text-sm font-semibold text-foreground">{fmt(product.currency, product.price)}</p>
                </div>
                <div className="rounded-md border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">Lead time</p>
                  <p className="text-sm font-semibold text-foreground">{product.leadTime}</p>
                </div>
                <div className="rounded-md border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">Availability</p>
                  <p className="text-sm font-semibold text-foreground">{availabilityLabels[product.availability]}</p>
                </div>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs defaultValue="specs" className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border px-5 pt-3">
                <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
                  <TabsTrigger value="specs" className="text-xs">Specs</TabsTrigger>
                  <TabsTrigger value="datasheet" className="text-xs">Datasheet</TabsTrigger>
                  <TabsTrigger value="pricing" className="text-xs">Pricing history</TabsTrigger>
                  <TabsTrigger value="equivalents" className="text-xs">Equivalents</TabsTrigger>
                  <TabsTrigger value="quotes" className="text-xs">Quote history</TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {/* Specs */}
                <TabsContent value="specs" className="mt-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {product.specs.map((s) => (
                        <tr key={s.label}>
                          <td className="py-2.5 pr-4 align-top text-muted-foreground">{s.label}</td>
                          <td className="py-2.5 text-right font-medium text-foreground">{s.value}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-2.5 pr-4 text-muted-foreground">Supplier</td>
                        <td className="py-2.5 text-right font-medium text-foreground">{product.supplier}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 text-muted-foreground">Authorisation</td>
                        <td className="py-2.5 text-right font-medium text-foreground">
                          {authStatusLabels[product.authStatus]}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </TabsContent>

                {/* Datasheet */}
                <TabsContent value="datasheet" className="mt-0">
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <FileText className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.datasheetName}</p>
                        <p className="text-xs text-muted-foreground">PDF · Manufacturer datasheet</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-transparent">
                      <Download className="size-4" /> Download
                    </Button>
                  </div>
                  <div className="mt-3 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-border bg-muted/40">
                    <div className="text-center">
                      <FileText className="mx-auto size-8 text-muted-foreground/50" />
                      <p className="mt-2 text-xs text-muted-foreground">Embedded PDF preview</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Pricing history */}
                <TabsContent value="pricing" className="mt-0">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Unit price over the last 6 months across supplying distributors.
                  </p>
                  <PricingHistoryChart data={product.priceHistory} currency={product.currency} />
                </TabsContent>

                {/* Equivalents */}
                <TabsContent value="equivalents" className="mt-0">
                  {product.equivalents.length === 0 ? (
                    <EmptyState icon={ArrowLeftRight} title="No equivalents recorded yet." />
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground text-pretty">
                          Suggested cross-references for {product.brand} {product.model}.
                        </p>
                        <div className="flex items-center gap-1.5">
                          <AiBadge sources={[`${product.brand} ${product.model} spec`, "Cross-reference database"]} />
                          <AiConfidence level="medium" score={0.81} />
                        </div>
                      </div>
                      <ul className="flex flex-col gap-2">
                        {product.equivalents.map((e) => (
                          <li
                            key={`${e.brand}-${e.model}`}
                            className="rounded-md border border-border p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {e.brand} {e.model}
                                </p>
                                <p className="text-xs text-muted-foreground">{e.note}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "flex items-center gap-1 text-xs font-medium",
                                    e.priceDelta < 0 ? "text-success" : "text-muted-foreground",
                                  )}
                                >
                                  {e.priceDelta < 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                                  {e.priceDelta > 0 ? "+" : ""}
                                  {e.priceDelta}%
                                </span>
                                <Button variant="outline" size="sm" className="bg-transparent">
                                  <ArrowLeftRight className="size-3.5" /> Swap
                                </Button>
                              </div>
                            </div>
                            <AiSources
                              className="mt-2.5 border-t border-border pt-2.5"
                              label="Matched on"
                              sources={[`${product.brand} ${product.model} spec`, `${e.brand} datasheet`, "Cross-reference database"]}
                            />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </TabsContent>

                {/* Quote history */}
                <TabsContent value="quotes" className="mt-0">
                  {product.quoteHistory.length === 0 ? (
                    <EmptyState icon={FileText} title="Not yet included in any quotes." />
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {product.quoteHistory.map((q) => (
                        <li key={q.quoteId} className="rounded-md border border-border p-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              {q.quoteId}
                              <ExternalLink className="size-3 text-muted-foreground" />
                            </span>
                            <StatusBadge
                              variant={q.outcome === "won" ? "success" : q.outcome === "lost" ? "error" : "warning"}
                              dot={false}
                            >
                              {q.outcome}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {q.buyer} · {q.date}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {q.quantity} units @ {fmt(product.currency, q.unitPrice)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-2 border-t border-border p-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <EyeOff className="size-4" /> Hide
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-transparent">
                  <Star className="size-4" /> Set preferred
                </Button>
                <Button size="sm">
                  <Pencil className="size-4" /> Edit
                </Button>
              </div>
            </div>
          </>
        )}
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  )
}
