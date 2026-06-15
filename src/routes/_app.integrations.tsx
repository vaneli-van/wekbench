import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"
import { useServerFn } from "@tanstack/react-start"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Mail, Database, FileSpreadsheet, MessageSquare, CreditCard, Truck, Plug, Check, Zap } from "lucide-react"
import { lookupNexar } from "@/lib/api/sourcing.functions"

type Integration = {
  id: string
  name: string
  description: string
  icon: typeof Mail
  category: string
  connected: boolean
  account?: string
}

const initialIntegrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail / Google Workspace",
    description: "Capture inbound RFQ emails directly from your shared procurement inbox.",
    icon: Mail,
    category: "Email",
    connected: true,
    account: "rfq@westernpremium.com",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Sync RFQ threads and replies from Outlook / Exchange mailboxes.",
    icon: Mail,
    category: "Email",
    connected: false,
  },
  {
    id: "sap",
    name: "SAP S/4HANA",
    description: "Push approved orders and pull master data from your ERP.",
    icon: Database,
    category: "ERP",
    connected: true,
    account: "PRD-100",
  },
  {
    id: "netsuite",
    name: "Oracle NetSuite",
    description: "Two-way sync of purchase orders, vendors, and invoices.",
    icon: Database,
    category: "ERP",
    connected: false,
  },
  {
    id: "sheets",
    name: "Google Sheets",
    description: "Export quote and landed-cost worksheets for offline review.",
    icon: FileSpreadsheet,
    category: "Productivity",
    connected: true,
    account: "Procurement Workbook 2026",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notified when high-value RFQs arrive or quotes are accepted.",
    icon: MessageSquare,
    category: "Notifications",
    connected: true,
    account: "#procurement-ops",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Collect deposits and balance payments against proforma invoices.",
    icon: CreditCard,
    category: "Payments",
    connected: false,
  },
  {
    id: "flexport",
    name: "Flexport",
    description: "Pull live freight rates and shipment milestones into landed cost.",
    icon: Truck,
    category: "Logistics",
    connected: false,
  },
]

function NexarTestCard() {
  const lookupFn = useServerFn(lookupNexar)
  const [mpn, setMpn] = useState("ACS770ECB-200U-PFF-T")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null)

  async function run() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await lookupFn({ data: { mpn: mpn.trim() } })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed")
    } finally {
      setLoading(false)
    }
  }

  const part = result?.parts?.[0]
  const offer = part?.offers?.[0]
  const pb = offer?.priceBreaks?.[0]

  return (
    <Card className="mb-6 border-primary/40">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Nexar API test</CardTitle>
            <CardDescription>Phase 1 check — look up a part by MPN and return normalized distributor offers.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={mpn} onChange={(e) => setMpn(e.target.value)} placeholder="Manufacturer part number (MPN)" />
          <Button onClick={run} disabled={loading || !mpn.trim()}>
            {loading ? "Testing…" : "Run test"}
          </Button>
        </div>
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {result && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="mb-1 font-medium">
              Match mode: {result.mode} · {result.count} part(s)
            </p>
            {part ? (
              <div className="space-y-0.5 text-muted-foreground">
                <p className="text-foreground">
                  {part.manufacturer ?? "—"} · {part.mpn ?? "—"} · {part.offers.length} offer(s)
                </p>
                {offer && (
                  <p>
                    e.g. {offer.distributorName} — stock {offer.stockQty ?? "?"}
                    {pb ? ` · ${pb.currency} ${pb.price} @ qty ${pb.quantity}` : " · no price break"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No parts returned for that MPN.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations)

  const toggle = (id: string) =>
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected, account: i.connected ? undefined : i.account } : i)),
    )

  const connectedCount = integrations.filter((i) => i.connected).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <PageHeader
        title="Integrations"
        description="Connect wekbench to the systems your procurement team already runs on."
      />

      <NexarTestCard />

      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Plug className="h-4 w-4" />
        <span>
          {connectedCount} of {integrations.length} integrations connected
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon
          return (
            <Card key={integration.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1 text-xs font-normal">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                  <Switch checked={integration.connected} onCheckedChange={() => toggle(integration.id)} />
                </div>
              </CardHeader>
              <CardContent className="mt-auto">
                <CardDescription className="mb-4 leading-relaxed">{integration.description}</CardDescription>
                {integration.connected ? (
                  <div className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-success">
                      <Check className="h-4 w-4" />
                      Connected
                    </span>
                    {integration.account && (
                      <span className="font-mono text-xs text-muted-foreground">{integration.account}</span>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => toggle(integration.id)}>
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}


export const Route = createFileRoute("/_app/integrations")({
  component: IntegrationsPage,
});
