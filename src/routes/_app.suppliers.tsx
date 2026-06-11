import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { suppliers } from "@/lib/data"
import { Plus, MapPin, Clock, ShieldCheck } from "lucide-react"

function SuppliersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Suppliers & Distributors"
        description="Authorized distributors and OEM channels used for sourcing. Reliability scores drive matching recommendations."
        actions={
          <Button size="sm">
            <Plus className="size-4" />
            Add supplier
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {suppliers.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <Badge variant="outline" className="mt-1">
                  {s.type}
                </Badge>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-success">
                  <ShieldCheck className="size-4" />
                  <span className="text-lg font-semibold tabular-nums">{s.reliability}%</span>
                </div>
                <p className="text-xs text-muted-foreground">reliability</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {s.oems.map((oem) => (
                <Badge key={oem} variant="secondary" className="font-normal">
                  {oem}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {s.region}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {s.leadTime}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}


export const Route = createFileRoute("/_app/suppliers")({
  component: SuppliersPage,
});
