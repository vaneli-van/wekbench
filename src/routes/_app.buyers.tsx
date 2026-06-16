import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Mail, Building2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/foundations/empty-state";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { listBuyers, createBuyer } from "@/lib/api/buyers.functions";

function AddBuyerDialog({ onAdded }: { onAdded: () => void }) {
  const createFn = useServerFn(createBuyer);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const mut = useMutation({
    mutationFn: () => createFn({ data: { name: name.trim(), contactName: contact || undefined, email: email || undefined, sector: sector || undefined } }),
    onSuccess: () => { toast.success("Buyer added"); setOpen(false); setName(""); setContact(""); setEmail(""); setSector(""); onAdded(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add buyer"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> Add buyer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add buyer</DialogTitle>
          <DialogDescription>Create a buyer account you can attach to RFQs, quotes, and orders.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5"><Label>Company name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" autoFocus /></div>
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-1.5"><Label>Contact</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Jane Doe" /></div>
            <div className="grid gap-1.5"><Label>Sector</Label><Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Healthcare" /></div>
          </div>
          <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="procurement@acme.com" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || mut.isPending}>{mut.isPending ? "Adding…" : "Add buyer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function money(v: number) {
  return `GH₵ ${Number(v ?? 0).toLocaleString()}`;
}

function BuyersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBuyers);
  const { data, isLoading } = useQuery({ queryKey: ["buyers"], queryFn: () => listFn() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["buyers"] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buyers: any[] = (data as any)?.buyers ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Buyers"
        description="Buyer accounts tied to their RFQs, quotes, and orders."
        actions={<AddBuyerDialog onAdded={invalidate} />}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading buyers…</p>
      ) : buyers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No buyers yet."
          description="Add a buyer, or one is created automatically when you make a quote or approve an RFQ."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {buyers.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{b.name}</h3>
                    <p className="text-sm text-muted-foreground">{b.sector ?? "—"}</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0">{money(b.lifetimeValue)}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Open RFQs</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{b.openRfqs}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Quotes</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{b.quotes}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{b.orders}</p>
                </div>
              </div>

              {(b.contact_name || b.email) && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  {b.contact_name && <span>{b.contact_name}</span>}
                  {b.contact_name && b.email && <span className="text-foreground">·</span>}
                  {b.email && <span className="truncate">{b.email}</span>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/buyers")({
  component: BuyersPage,
});
