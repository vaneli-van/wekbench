import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Award,
  Check,
  Clock,
  Download,
  FileText,
  Filter,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Truck,
  Upload,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({ meta: [{ title: "Inbox — wekbench" }] }),
  component: InboxPage,
});

type Status = "captured" | "sourcing" | "quoted" | "awarded";
type Source = "email" | "upload" | "portal";

type LineItem = {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  target?: string;
};

type Quote = {
  supplier: string;
  initials: string;
  total: string;
  totalNum: number;
  lead: string;
  rating: number;
  fulfilment: number; // % items quoted
  note?: string;
  best?: boolean;
};

type RFQ = {
  id: string;
  subject: string;
  buyer: string;
  buyerEmail: string;
  source: Source;
  status: Status;
  value: string;
  items: LineItem[];
  due: string;
  receivedAt: string;
  starred?: boolean;
  quotes: Quote[];
};

const rfqs: RFQ[] = [
  {
    id: "RFQ-2841",
    subject: "Q3 bearings + seals replenishment",
    buyer: "Northwind Industrial",
    buyerEmail: "purchasing@northwind.com",
    source: "email",
    status: "quoted",
    value: "$28,400",
    due: "Jun 16",
    receivedAt: "Today · 8:42 AM",
    starred: true,
    items: [
      { sku: "BRG-6204-2RS", name: "Deep groove ball bearing 6204-2RS", qty: 240, unit: "ea", target: "$3.10" },
      { sku: "BRG-6205-ZZ", name: "Shielded ball bearing 6205-ZZ", qty: 180, unit: "ea", target: "$3.80" },
      { sku: "SEAL-TC-25", name: "Rotary shaft seal TC 25x40x7", qty: 320, unit: "ea", target: "$1.20" },
      { sku: "SEAL-TC-35", name: "Rotary shaft seal TC 35x52x7", qty: 200, unit: "ea", target: "$1.60" },
    ],
    quotes: [
      {
        supplier: "Acme Bearings Co.",
        initials: "AB",
        total: "$26,180",
        totalNum: 26180,
        lead: "5 days",
        rating: 4.8,
        fulfilment: 100,
        note: "Stocked locally, can ship partial Monday.",
        best: true,
      },
      {
        supplier: "Pacific Seal & Bearing",
        initials: "PS",
        total: "$27,940",
        totalNum: 27940,
        lead: "8 days",
        rating: 4.5,
        fulfilment: 100,
        note: "Volume discount available at 500+ units.",
      },
      {
        supplier: "Forge Industrial Supply",
        initials: "FI",
        total: "$29,610",
        totalNum: 29610,
        lead: "4 days",
        rating: 4.2,
        fulfilment: 75,
        note: "Cannot source 6205-ZZ in time.",
      },
    ],
  },
  {
    id: "RFQ-2840",
    subject: "Hydraulic hose replacements — site 4",
    buyer: "Pacific Mining Co.",
    buyerEmail: "ops@pacmining.com",
    source: "email",
    status: "sourcing",
    value: "$11,950",
    due: "Jun 14",
    receivedAt: "Today · 7:51 AM",
    items: [
      { sku: "HYD-1IN-50FT", name: '1" hydraulic hose, 50 ft reel', qty: 12, unit: "reel" },
      { sku: "HYD-FIT-1IN", name: '1" JIC swivel fittings', qty: 48, unit: "ea" },
      { sku: "HYD-CLAMP", name: "Hose clamps, heavy duty", qty: 60, unit: "ea" },
    ],
    quotes: [],
  },
  {
    id: "RFQ-2839",
    subject: "Aerospace fasteners pack — program H7",
    buyer: "Helios Aerospace",
    buyerEmail: "supply@helios.aero",
    source: "portal",
    status: "awarded",
    value: "$74,210",
    due: "Jun 20",
    receivedAt: "Yesterday · 4:12 PM",
    items: [
      { sku: "FAS-NAS-1004", name: "NAS 1004 bolt", qty: 5000, unit: "ea" },
      { sku: "FAS-MS21044", name: "MS21044 self-locking nut", qty: 5000, unit: "ea" },
    ],
    quotes: [
      {
        supplier: "Acme Bearings Co.",
        initials: "AB",
        total: "$71,800",
        totalNum: 71800,
        lead: "10 days",
        rating: 4.8,
        fulfilment: 100,
        best: true,
      },
      {
        supplier: "Apex Aero Supply",
        initials: "AA",
        total: "$73,420",
        totalNum: 73420,
        lead: "9 days",
        rating: 4.7,
        fulfilment: 100,
      },
    ],
  },
  {
    id: "RFQ-2838",
    subject: "Pump motor — emergency replacement",
    buyer: "Brightwater Utilities",
    buyerEmail: "maint@brightwater.gov",
    source: "email",
    status: "quoted",
    value: "$4,120",
    due: "Jun 12",
    receivedAt: "Yesterday · 2:08 PM",
    items: [
      { sku: "MOT-3HP-460V", name: "3HP motor, 460V 3-phase", qty: 1, unit: "ea" },
      { sku: "MOT-COUP-A", name: "Flexible coupling, type A", qty: 1, unit: "ea" },
    ],
    quotes: [
      {
        supplier: "Forge Industrial Supply",
        initials: "FI",
        total: "$3,980",
        totalNum: 3980,
        lead: "2 days",
        rating: 4.2,
        fulfilment: 100,
        best: true,
      },
      {
        supplier: "Cascade Motors",
        initials: "CM",
        total: "$4,210",
        totalNum: 4210,
        lead: "1 day",
        rating: 4.6,
        fulfilment: 100,
        note: "Next-day air available.",
      },
    ],
  },
  {
    id: "RFQ-2837",
    subject: "Robotic gripper spares — quarterly",
    buyer: "Cascade Robotics",
    buyerEmail: "procurement@cascade-robotics.com",
    source: "upload",
    status: "captured",
    value: "$18,640",
    due: "Jun 22",
    receivedAt: "Yesterday · 11:34 AM",
    items: [
      { sku: "GRP-FNG-V2", name: "Gripper finger V2", qty: 120, unit: "ea" },
      { sku: "GRP-SPRG-7", name: "Return spring, type 7", qty: 240, unit: "ea" },
      { sku: "GRP-PCB-IO", name: "I/O board revision C", qty: 30, unit: "ea" },
    ],
    quotes: [],
  },
];

const statusTone: Record<Status, string> = {
  captured: "border-border bg-muted text-muted-foreground",
  sourcing: "border-warning/30 bg-warning/10 text-warning",
  quoted: "border-info/30 bg-info/10 text-info",
  awarded: "border-success/30 bg-success/10 text-success",
};

const statusLabel: Record<Status, string> = {
  captured: "Captured",
  sourcing: "Sourcing",
  quoted: "Quoted",
  awarded: "Awarded",
};

const sourceIcon: Record<Source, typeof Mail> = {
  email: Mail,
  upload: Upload,
  portal: FileText,
};

function InboxPage() {
  const [selectedId, setSelectedId] = useState(rfqs[0].id);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | Status>("all");

  const filtered = useMemo(() => {
    return rfqs.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q)
      );
    });
  }, [query, tab]);

  const selected = rfqs.find((r) => r.id === selectedId) ?? rfqs[0];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card/40 px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Inbox</h1>
            <p className="text-xs text-muted-foreground">
              RFQs captured from email, uploads, and connected portals
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search RFQs, buyers, parts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-64 pl-8"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="size-4" /> Filter
            </Button>
            <Button size="sm">
              <Plus className="size-4" /> New RFQ
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-3">
          <TabsList>
            <TabsTrigger value="all">All <span className="ml-1.5 text-muted-foreground">{rfqs.length}</span></TabsTrigger>
            <TabsTrigger value="captured">Captured</TabsTrigger>
            <TabsTrigger value="sourcing">Sourcing</TabsTrigger>
            <TabsTrigger value="quoted">Quoted</TabsTrigger>
            <TabsTrigger value="awarded">Awarded</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[360px_1fr]">
        <aside className="overflow-y-auto border-r border-border bg-card/20">
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const SourceIcon = sourceIcon[r.source];
              const active = r.id === selectedId;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${
                      active ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground">{r.id}</span>
                        {r.starred && <Star className="size-3 fill-warning text-warning" />}
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${statusTone[r.status]}`}>
                        {statusLabel[r.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">{r.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.buyer}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <SourceIcon className="size-3" /> {r.receivedAt}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">{r.value}</span>
                    </div>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-muted-foreground">No RFQs match your filters.</li>
            )}
          </ul>
        </aside>

        <section className="overflow-y-auto bg-background">
          <RfqDetail rfq={selected} />
        </section>
      </div>
    </div>
  );
}

function RfqDetail({ rfq }: { rfq: RFQ }) {
  const bestQuote = rfq.quotes.find((q) => q.best);
  const target = rfq.quotes[0]?.totalNum;
  const compareTo = Number(rfq.value.replace(/[^0-9.]/g, ""));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{rfq.id}</span>
          <Badge variant="outline" className={statusTone[rfq.status]}>{statusLabel[rfq.status]}</Badge>
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" /> Due {rfq.due}
          </Badge>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{rfq.subject}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              From <span className="font-medium text-foreground">{rfq.buyer}</span> · {rfq.buyerEmail}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <MessageSquare className="size-4" /> Reply
            </Button>
            <Button variant="outline" size="sm">
              <Download className="size-4" /> Export
            </Button>
            <Button size="sm">
              <Send className="size-4" /> Send to suppliers
            </Button>
          </div>
        </div>
      </header>

      {rfq.quotes.length > 0 && bestQuote && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-success/15 text-success">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Recommended: award to <span className="text-success">{bestQuote.supplier}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {bestQuote.total} · {bestQuote.lead} lead time ·{" "}
                  {target && compareTo
                    ? `${Math.round(((compareTo - target) / compareTo) * 100)}% under your target`
                    : "best overall match"}
                </p>
              </div>
            </div>
            <Button size="sm" className="gap-1.5">
              <Award className="size-4" /> Award & generate PO
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="border-border/70">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">Line items</h3>
            <span className="text-xs text-muted-foreground">{rfq.items.length} items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">SKU</th>
                  <th className="px-3 py-2.5 text-left font-medium">Item</th>
                  <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-5 py-2.5 text-right font-medium">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rfq.items.map((i) => (
                  <tr key={i.sku} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{i.sku}</td>
                    <td className="px-3 py-3 text-foreground">{i.name}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {i.qty} <span className="text-muted-foreground">{i.unit}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{i.target ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-border/70">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Summary</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Internal only — not sent to suppliers</p>
            </div>
            <Separator />
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated value</dt>
                <dd className="font-medium text-foreground tabular-nums">{rfq.value}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="text-foreground capitalize">{rfq.source}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Received</dt>
                <dd className="text-foreground">{rfq.receivedAt}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Quotes</dt>
                <dd className="text-foreground">{rfq.quotes.length}</dd>
              </div>
            </dl>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Attachments</p>
              <div className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-xs">
                <Paperclip className="size-3.5 text-muted-foreground" />
                <span className="flex-1 truncate text-foreground">specs-{rfq.id.toLowerCase()}.pdf</span>
                <span className="text-muted-foreground">214 KB</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Quotes <span className="text-muted-foreground">· {rfq.quotes.length}</span>
          </h3>
          {rfq.quotes.length === 0 && (
            <Button variant="outline" size="sm">
              <Send className="size-4" /> Request quotes
            </Button>
          )}
        </div>

        {rfq.quotes.length === 0 ? (
          <Card className="border-dashed border-border/70 bg-muted/20">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Truck className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">No quotes yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Suggested suppliers are ready. Send this RFQ to start collecting quotes — replies are matched automatically.
              </p>
              <Button size="sm" className="mt-2">
                <Send className="size-4" /> Send to 6 suggested suppliers
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rfq.quotes.map((q) => (
              <Card
                key={q.supplier}
                className={`border-border/70 ${q.best ? "ring-1 ring-success/40" : ""}`}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {q.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{q.supplier}</p>
                        <p className="text-xs text-muted-foreground">
                          ★ {q.rating.toFixed(1)} · {q.fulfilment}% covered
                        </p>
                      </div>
                    </div>
                    {q.best && (
                      <Badge className="bg-success text-success-foreground hover:bg-success">Best</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold tabular-nums text-foreground">{q.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lead time</p>
                      <p className="text-lg font-semibold tabular-nums text-foreground">{q.lead}</p>
                    </div>
                  </div>
                  {q.note && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{q.note}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1">
                      View detail
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Check className="size-4" /> Award
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
