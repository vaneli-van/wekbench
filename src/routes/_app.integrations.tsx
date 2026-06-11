import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Mail, Database, FileSpreadsheet, MessageSquare, CreditCard, Truck, Plug, Check } from "lucide-react"

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
