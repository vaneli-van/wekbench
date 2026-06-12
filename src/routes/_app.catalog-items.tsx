import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2, Package } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

type CatalogItem = {
  id: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  description: string;
  unit_price: number | null;
  currency: string | null;
  lead_time_days: number | null;
  stock_qty: number | null;
  source: "manual" | "supplier_upload" | "external_api";
  supplier_id: string | null;
  suppliers: { name: string } | null;
};

function useCatalogItems(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["catalog-items", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("id, sku, brand, model, description, unit_price, currency, lead_time_days, stock_qty, source, supplier_id, suppliers(name)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CatalogItem[];
    },
  });
}

function NewItemDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    brand: "",
    model: "",
    description: "",
    unit_price: "",
    currency: "USD",
    lead_time_days: "",
    stock_qty: "",
  });
  const qc = useQueryClient();
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("catalog_items").insert({
        workspace_id: workspaceId,
        sku: form.sku || null,
        brand: form.brand || null,
        model: form.model || null,
        description: form.description || form.model || form.sku || "Untitled",
        unit_price: form.unit_price ? Number(form.unit_price) : null,
        currency: form.currency || null,
        lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
        stock_qty: form.stock_qty ? Number(form.stock_qty) : null,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item added");
      qc.invalidateQueries({ queryKey: ["catalog-items", workspaceId] });
      setOpen(false);
      setForm({ sku: "", brand: "", model: "", description: "", unit_price: "", currency: "USD", lead_time_days: "", stock_qty: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Add item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add catalog item</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU"><Input value={form.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
          <Field label="Brand"><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          <Field label="Model"><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Currency"><Input value={form.currency} onChange={(e) => set("currency", e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="Description"><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
          </div>
          <Field label="Unit price"><Input type="number" step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} /></Field>
          <Field label="Lead time (days)"><Input type="number" value={form.lead_time_days} onChange={(e) => set("lead_time_days", e.target.value)} /></Field>
          <Field label="Stock qty"><Input type="number" value={form.stock_qty} onChange={(e) => set("stock_qty", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>Add item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function CatalogItemsPage() {
  const { data: workspaceId, isLoading: wsLoading } = useWorkspaceId();
  const { data: items, isLoading } = useCatalogItems(workspaceId);
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const filtered = useMemo(() => {
    if (!q.trim()) return items ?? [];
    const t = q.toLowerCase();
    return (items ?? []).filter((i) =>
      [i.sku, i.brand, i.model, i.description, i.suppliers?.name].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [items, q]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("catalog_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removed");
      qc.invalidateQueries({ queryKey: ["catalog-items", workspaceId] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <PageHeader
        title="Catalog Items"
        description="Internal catalog of products you can quote. AI extractions match incoming RFQ line items against this list."
        actions={workspaceId ? <NewItemDialog workspaceId={workspaceId} /> : null}
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by SKU, brand, model…" className="pl-8" />
        </div>
      </Card>

      {wsLoading || isLoading ? (
        <Skeleton className="h-64" />
      ) : !items?.length ? (
        <Card className="p-10">
          <EmptyState
            icon={Package}
            title="No catalog items yet"
            description="Add items manually, or upload a supplier's inventory CSV from the Suppliers page."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Supplier</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Lead</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2 font-mono text-xs">{i.sku ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{i.description}</div>
                    {(i.brand || i.model) && (
                      <div className="text-xs text-muted-foreground">
                        {[i.brand, i.model].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{i.suppliers?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {i.unit_price != null ? `${i.currency ?? ""} ${i.unit_price}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {i.lead_time_days != null ? `${i.lead_time_days}d` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{i.stock_qty ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-[10px]">{i.source}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(i.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/catalog-items")({
  component: CatalogItemsPage,
});
