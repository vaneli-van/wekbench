import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  FileText,
  Trash2,
  Building2,
  Mail,
  Package,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/foundations/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";

type Supplier = {
  id: string;
  workspace_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
};

type Contract = {
  id: string;
  supplier_id: string;
  contract_type: "master" | "sla" | "pricing" | "other";
  title: string;
  file_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  terms: Record<string, unknown>;
};

function useSuppliers(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["suppliers", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
  });
}

function useContracts(supplierId: string | null) {
  return useQuery({
    queryKey: ["contracts", supplierId],
    enabled: !!supplierId,
    queryFn: async (): Promise<Contract[]> => {
      const { data, error } = await supabase
        .from("supplier_contracts")
        .select("*")
        .eq("supplier_id", supplierId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contract[];
    },
  });
}

function NewSupplierDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [hasContract, setHasContract] = useState(false);
  const [hasSla, setHasSla] = useState(false);
  const [hasInventory, setHasInventory] = useState(false);
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const tags: string[] = [];
      if (hasContract) tags.push("Has contract");
      if (hasSla) tags.push("Has SLA");
      if (hasInventory) tags.push("Inventory pending");
      const combinedNotes = [notes.trim(), tags.join(" · ")].filter(Boolean).join("\n\n");
      const { error } = await supabase.from("suppliers").insert({
        workspace_id: workspaceId,
        name: name.trim(),
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        notes: combinedNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier added");
      qc.invalidateQueries({ queryKey: ["suppliers", workspaceId] });
      setOpen(false);
      setName("");
      setContactName("");
      setContactEmail("");
      setNotes("");
      setHasContract(false);
      setHasSla(false);
      setHasInventory(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Supplier name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Distribution" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact name</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <Label>Contact email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Relationship
            </p>
            <div className="mt-2 space-y-2">
              <ToggleRow label="Existing contract with buyer?" checked={hasContract} onChange={setHasContract} />
              <ToggleRow label="SLA agreement?" checked={hasSla} onChange={setHasSla} />
              <ToggleRow label="Has inventory / products to upload?" checked={hasInventory} onChange={setHasInventory} />
            </div>
            {(hasContract || hasInventory) && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                After saving you'll be able to upload contract files and an inventory CSV from the supplier card.
              </p>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            Save supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ContractsSection({ supplier, workspaceId }: { supplier: Supplier; workspaceId: string }) {
  const { data: contracts } = useContracts(supplier.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [type, setType] = useState<Contract["contract_type"]>("master");

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const path = `${workspaceId}/${supplier.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("supplier-contracts")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("supplier_contracts").insert({
        workspace_id: workspaceId,
        supplier_id: supplier.id,
        contract_type: type,
        title: file.name,
        file_path: path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contract uploaded");
      qc.invalidateQueries({ queryKey: ["contracts", supplier.id] });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Contracts / SLAs
      </p>
      {contracts && contracts.length > 0 ? (
        <ul className="mb-2 space-y-1">
          {contracts.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1 text-xs">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="truncate flex-1">{c.title}</span>
              <Badge variant="outline" className="text-[10px]">
                {c.contract_type}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-muted-foreground">No contracts uploaded.</p>
      )}
      <div className="flex items-center gap-2">
        <select
          className="rounded border border-input bg-background px-2 py-1 text-xs"
          value={type}
          onChange={(e) => setType(e.target.value as Contract["contract_type"])}
        >
          <option value="master">Master</option>
          <option value="sla">SLA</option>
          <option value="pricing">Pricing</option>
          <option value="other">Other</option>
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
          }}
        />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
          <Upload className="size-3.5" /> Upload
        </Button>
      </div>
    </div>
  );
}

function InventoryUploadSection({ supplier, workspaceId }: { supplier: Supplier; workspaceId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) throw new Error("CSV is empty");
      const inserts = rows.map((r) => ({
        workspace_id: workspaceId,
        supplier_id: supplier.id,
        sku: r.sku || null,
        brand: r.brand || null,
        model: r.model || null,
        description: r.description || r.sku || r.model || "Untitled",
        unit_price: r.unit_price ? Number(r.unit_price) : null,
        currency: r.currency || "USD",
        lead_time_days: r.lead_time_days ? Number(r.lead_time_days) : null,
        stock_qty: r.stock_qty ? Number(r.stock_qty) : null,
        source: "supplier_upload" as const,
      }));
      const { error } = await supabase.from("catalog_items").insert(inserts);
      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (n) => {
      toast.success(`Imported ${n} catalog item(s)`);
      qc.invalidateQueries({ queryKey: ["catalog-items", workspaceId] });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Inventory
      </p>
      <p className="mb-2 text-xs text-muted-foreground">
        CSV columns: sku, brand, model, description, unit_price, currency, lead_time_days, stock_qty
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadMut.mutate(f);
        }}
      />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
        <Package className="size-3.5" /> Upload inventory CSV
      </Button>
    </div>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function SupplierCard({ supplier, workspaceId }: { supplier: Supplier; workspaceId: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").delete().eq("id", supplier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier removed");
      qc.invalidateQueries({ queryKey: ["suppliers", workspaceId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <h3 className="font-semibold">{supplier.name}</h3>
            <Badge variant={supplier.status === "active" ? "default" : "outline"} className="text-[10px]">
              {supplier.status}
            </Badge>
          </div>
          {supplier.contact_email && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3" />
              {supplier.contact_name ? `${supplier.contact_name} · ` : ""}
              {supplier.contact_email}
            </p>
          )}
          {supplier.notes && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{supplier.notes}</p>}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm(`Remove ${supplier.name}?`)) del.mutate();
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
        <ContractsSection supplier={supplier} workspaceId={workspaceId} />
        <InventoryUploadSection supplier={supplier} workspaceId={workspaceId} />
      </div>
    </Card>
  );
}

function SuppliersPage() {
  const { data: workspaceId, isLoading: wsLoading } = useWorkspaceId();
  const { data: suppliers, isLoading } = useSuppliers(workspaceId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Suppliers & Distributors"
        description="Add suppliers, store their contracts and SLAs, and upload their inventory to power AI catalog matching."
        actions={workspaceId ? <NewSupplierDialog workspaceId={workspaceId} /> : null}
      />

      <div className="mt-2 mb-4 text-xs text-muted-foreground">
        <Link to="/catalog-items" className="text-primary hover:underline">
          → View aggregated catalog
        </Link>
      </div>

      {wsLoading || isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : !suppliers?.length ? (
        <Card className="p-10">
          <EmptyState
            icon={Building2}
            title="No suppliers yet"
            description="Add your first supplier and upload their inventory to start matching incoming RFQs against real pricing."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} workspaceId={workspaceId!} />
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/suppliers")({
  component: SuppliersPage,
});
