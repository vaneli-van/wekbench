import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Mail, Building2, Trash2, FileText, ChevronDown, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/foundations/empty-state";
import { BuyerStatementDialog } from "@/components/buyer-statement-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  listBuyers, createBuyer, listBuyerContracts, createBuyerContract, addContractItem,
  deleteContractItem, deleteBuyerContract,
} from "@/lib/api/buyers.functions";

function money(v: number | null | undefined, c?: string | null) {
  if (v == null) return "—";
  return `${c ?? "GH₵"} ${Number(v).toLocaleString()}`;
}

function AddBuyerDialog({ onAdded }: { onAdded: () => void }) {
  const createFn = useServerFn(createBuyer);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sector, setSector] = useState("");
  const [hasContract, setHasContract] = useState(false);
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: () => {
      const tags = hasContract ? "Has agreed-pricing contract" : "";
      const combined = [notes.trim(), tags].filter(Boolean).join("\n\n");
      return createFn({
        data: { name: name.trim(), contactName: contact || undefined, email: email || undefined, billingEmail: billingEmail || undefined, phone: phone || undefined, sector: sector || undefined },
      }).then((r) => ({ ...r, combined }));
    },
    onSuccess: () => {
      toast.success("Buyer added");
      setOpen(false);
      setName(""); setContact(""); setEmail(""); setBillingEmail(""); setPhone(""); setSector(""); setNotes(""); setHasContract(false);
      onAdded();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add buyer"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Add buyer</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add buyer</DialogTitle>
          <DialogDescription>Create a buyer account you can attach to RFQs, quotes, orders, and contracts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Company name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meridian Bank Plc" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact name</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} /></div>
            <div><Label>Sector</Label><Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Financial Services" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Billing / AP email <span className="font-normal text-muted-foreground">(receives payment reminders)</span></Label><Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="accounts@buyer.com" /></div>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relationship</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">Existing contract with agreed pricing?</span>
              <Switch checked={hasContract} onCheckedChange={setHasContract} />
            </div>
            {hasContract && (
              <p className="mt-2 text-[11px] text-muted-foreground">After saving, add the contract and its agreed item prices from the buyer card.</p>
            )}
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!name.trim() || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Save buyer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContractsSection({ buyer }: { buyer: any }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listBuyerContracts);
  const createFn = useServerFn(createBuyerContract);
  const addItemFn = useServerFn(addContractItem);
  const delItemFn = useServerFn(deleteContractItem);
  const delContractFn = useServerFn(deleteBuyerContract);

  const key = ["buyer-contracts", buyer.id];
  const { data } = useQuery({ queryKey: key, queryFn: () => listFn({ data: { buyerId: buyer.id } }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts: any[] = (data as any)?.contracts ?? [];

  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("GH₵");

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { buyerId: buyer.id, title: title.trim(), currency } }),
    onSuccess: () => { toast.success("Contract added"); setTitle(""); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delContractMut = useMutation({
    mutationFn: (id: string) => delContractFn({ data: { id } }),
    onSuccess: () => { invalidate(); },
  });

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Contracts &amp; agreed pricing</p>

      {contracts.length === 0 && <p className="mb-2 text-xs text-muted-foreground">No contracts yet.</p>}

      <div className="space-y-3">
        {contracts.map((c) => (
          <ContractBlock
            key={c.id}
            contract={c}
            buyerId={buyer.id}
            onAddItem={(payload) => addItemFn({ data: payload }).then(invalidate)}
            onDeleteItem={(id) => delItemFn({ data: { id } }).then(invalidate)}
            onDeleteContract={() => delContractMut.mutate(c.id)}
          />
        ))}
      </div>

      {/* Add contract */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="grow">
          <Label className="text-[11px]">New contract</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2026 Master Pricing Agreement" className="h-8" />
        </div>
        <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="GH₵" className="h-8 w-20" />
        <Button size="sm" disabled={!title.trim() || createMut.isPending} onClick={() => createMut.mutate()}>Add contract</Button>
      </div>
    </div>
  );
}

function ContractBlock({
  contract, buyerId, onAddItem, onDeleteItem, onDeleteContract,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contract: any; buyerId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAddItem: (p: any) => Promise<unknown>;
  onDeleteItem: (id: string) => Promise<unknown>;
  onDeleteContract: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = contract.items ?? [];

  async function add() {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      await onAddItem({
        contractId: contract.id, buyerId, description: desc.trim(),
        unit: unit || undefined, currency: contract.currency || undefined,
        agreedPrice: price ? Number(price) : undefined,
      });
      setDesc(""); setPrice(""); setUnit("");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded border border-border bg-card p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <FileText className="size-3.5 text-muted-foreground" /> {contract.title}
          {contract.currency && <Badge variant="outline" className="text-[10px]">{contract.currency}</Badge>}
        </div>
        <Button variant="ghost" size="icon" className="size-6" onClick={onDeleteContract} title="Delete contract"><Trash2 className="size-3.5" /></Button>
      </div>

      {items.length > 0 && (
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-1 font-medium">Item</th><th className="py-1 text-right font-medium">Agreed price</th><th /></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="py-1">{it.description}{it.unit ? <span className="text-muted-foreground"> /{it.unit}</span> : null}</td>
                <td className="py-1 text-right tabular-nums">{it.agreed_price != null ? `${it.currency ?? contract.currency ?? ""} ${Number(it.agreed_price).toLocaleString()}` : "—"}</td>
                <td className="py-1 text-right">
                  <Button variant="ghost" size="icon" className="size-5" onClick={() => onDeleteItem(it.id)}><Trash2 className="size-3" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-2 flex flex-wrap items-end gap-1.5">
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Item description" className="h-7 grow text-xs" onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unit" className="h-7 w-16 text-xs" />
        <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="price" type="number" className="h-7 w-24 text-xs" />
        <Button size="sm" variant="outline" className="h-7" disabled={!desc.trim() || busy} onClick={add}>Add price</Button>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BuyerCard({ buyer }: { buyer: any }) {
  const [showContracts, setShowContracts] = useState(false);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="size-5" /></span>
          <div>
            <h3 className="font-semibold">{buyer.name}</h3>
            <p className="text-sm text-muted-foreground">{buyer.sector ?? "—"}</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">{money(buyer.lifetimeValue)}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-border bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Open RFQs</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{buyer.openRfqs}</p></div>
        <div className="rounded-lg border border-border bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Quotes</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{buyer.quotes}</p></div>
        <div className="rounded-lg border border-border bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Orders</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{buyer.orders}</p></div>
      </div>

      {(buyer.contact_name || buyer.email) && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4 shrink-0" />
          {buyer.contact_name && <span>{buyer.contact_name}</span>}
          {buyer.contact_name && buyer.email && <span className="text-foreground">·</span>}
          {buyer.email && <span className="truncate">{buyer.email}</span>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button onClick={() => setShowContracts((s) => !s)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {showContracts ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          Contracts &amp; agreed pricing
        </button>
        <BuyerStatementDialog buyerId={buyer.id} buyerName={buyer.name} />
      </div>
      {showContracts && <ContractsSection buyer={buyer} />}
    </Card>
  );
}

function BuyersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBuyers);
  const { data, isLoading } = useQuery({ queryKey: ["buyers"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["buyers"] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buyers: any[] = (data as any)?.buyers ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <PageHeader
        title="Buyers"
        description="Buyer accounts tied to their RFQs, quotes, and orders — with contracts and agreed item pricing."
        actions={<AddBuyerDialog onAdded={invalidate} />}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading buyers…</p>
      ) : buyers.length === 0 ? (
        <EmptyState icon={Building2} title="No buyers yet." description="Add a buyer, or one is created automatically when you make a quote or approve an RFQ." />
      ) : (
        <div className="space-y-4">
          {buyers.map((b) => <BuyerCard key={b.id} buyer={b} />)}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/buyers")({
  component: BuyersPage,
});
