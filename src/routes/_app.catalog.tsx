import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  Package,
  ChevronDown,
  ArrowUpDown,
  Users,
  X,
  EyeOff,
  DollarSign,
  PackageCheck,
  Tag,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/foundations/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";

type CatalogItem = {
  id: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  unit: string | null;
  description: string;
  unit_price: number | null;
  currency: string | null;
  lead_time_days: number | null;
  stock_qty: number | null;
  source: "manual" | "supplier_upload" | "external_api";
  supplier_id: string | null;
  suppliers: { name: string } | null;
  created_at?: string;
};

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  supplier_upload: "Supplier upload",
  external_api: "External API",
};

type SortKey = "recent" | "price-desc" | "price-asc" | "brand";

function useCatalogItems(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["catalog-items", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select(
          "id, sku, brand, model, category, unit, description, unit_price, currency, lead_time_days, stock_qty, source, supplier_id, created_at, suppliers(name)",
        )
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CatalogItem[];
    },
  });
}

function CatalogPage() {
  const { data: workspaceId, isLoading: wsLoading } = useWorkspaceId();
  const { data: items, isLoading } = useCatalogItems(workspaceId);
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [supps, setSupps] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const brandOptions = useMemo(
    () => Array.from(new Set((items ?? []).map((i) => i.brand).filter(Boolean) as string[])).sort(),
    [items],
  );
  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set((items ?? []).map((i) => i.suppliers?.name).filter(Boolean) as string[]),
      ).sort(),
    [items],
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set((items ?? []).map((i) => i.source))),
    [items],
  );

  const filtered = useMemo(() => {
    let list = items ?? [];
    if (query.trim()) {
      const t = query.toLowerCase();
      list = list.filter((i) =>
        [i.sku, i.brand, i.model, i.category, i.description, i.suppliers?.name].some((v) =>
          v?.toLowerCase().includes(t),
        ),
      );
    }
    if (brands.size) list = list.filter((i) => i.brand && brands.has(i.brand));
    if (supps.size) list = list.filter((i) => i.suppliers?.name && supps.has(i.suppliers.name));
    if (sources.size) list = list.filter((i) => sources.has(i.source));

    list = [...list].sort((a, b) => {
      if (sortKey === "price-desc") return (b.unit_price ?? 0) - (a.unit_price ?? 0);
      if (sortKey === "price-asc") return (a.unit_price ?? 0) - (b.unit_price ?? 0);
      if (sortKey === "brand") return (a.brand ?? "").localeCompare(b.brand ?? "");
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    return list;
  }, [items, query, brands, supps, sources, sortKey]);

  const activeFilterCount = brands.size + supps.size + sources.size;
  const clearFilters = () => {
    setBrands(new Set());
    setSupps(new Set());
    setSources(new Set());
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((p) => p.id)));

  const del = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("catalog_items").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} item${ids.length === 1 ? "" : "s"} removed`);
      qc.invalidateQueries({ queryKey: ["catalog-items", workspaceId] });
      setSelected(new Set());
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-6 md:px-8">
        <PageHeader
          title="Catalog"
          description={`${items?.length ?? 0} item${items?.length === 1 ? "" : "s"} · matched against incoming RFQ line items by AI extraction.`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-transparent" asChild>
                <Link to="/suppliers">
                  <Users className="size-4" /> Manage suppliers
                </Link>
              </Button>
              {workspaceId && <NewItemDialog workspaceId={workspaceId} />}
            </div>
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 gap-0 px-4 pb-6 md:px-8">
        {/* Filter sidebar */}
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border pr-4 lg:block">
          <div className="flex items-center justify-between py-3">
            <p className="text-sm font-semibold text-foreground">Filters</p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          <FilterSection
            title="Brand"
            defaultOpen
            searchable
            items={brandOptions}
            selected={brands}
            onToggle={(v) => toggleSet(setBrands, v)}
          />
          <FilterSection
            title="Supplier"
            items={supplierOptions}
            selected={supps}
            onToggle={(v) => toggleSet(setSupps, v)}
          />
          <FilterSection
            title="Source"
            items={sourceOptions}
            labels={sourceLabels}
            selected={sources}
            onToggle={(v) => toggleSet(setSources, v)}
          />
        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col pl-0 lg:pl-5">
          <div className="flex flex-wrap items-center gap-2 py-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by SKU, brand, model, description…"
                className="pl-9"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-transparent">
                  <ArrowUpDown className="size-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortKey("recent")}>
                  Recently added
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("price-desc")}>
                  Price (high → low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("price-asc")}>
                  Price (low → high)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("brand")}>
                  Brand (A → Z)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="pb-2 text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto">
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
            ) : filtered.length === 0 ? (
              <EmptyState
                className="h-full"
                icon={Search}
                title="No items match your filters."
                description="Try clearing filters or adjusting your search."
                secondaryAction={{ label: "Clear filters", onClick: clearFilters }}
              />
            ) : (
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="w-10 px-3 py-2">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={toggleAll}
                            aria-label="Select all"
                          />
                        </th>
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
                        <tr
                          key={i.id}
                          className={cn(selected.has(i.id) && "bg-muted/30")}
                        >
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={selected.has(i.id)}
                              onCheckedChange={() => toggle(i.id)}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{i.sku ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{i.description}</span>
                              {i.category && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">{i.category}</Badge>
                              )}
                            </div>
                            {(i.brand || i.model || i.unit) && (
                              <div className="text-xs text-muted-foreground">
                                {[i.brand, i.model, i.unit ? `per ${i.unit}` : null].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {i.suppliers?.name ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {i.unit_price != null
                              ? `${i.currency ?? ""} ${i.unit_price}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {i.lead_time_days != null ? `${i.lead_time_days}d` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {i.stock_qty ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[10px]">
                              {sourceLabels[i.source] ?? i.source}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => del.mutate([i.id])}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </section>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-border bg-card px-4 py-3 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {selected.size} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() =>
                  toast.info("Bulk pricing update coming soon")
                }
              >
                <DollarSign className="size-4" /> Update pricing
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() =>
                  toast.info("Bulk availability update coming soon")
                }
              >
                <PackageCheck className="size-4" /> Update availability
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => toast.info("Tagging coming soon")}
              >
                <Tag className="size-4" /> Tag as preferred
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => del.mutate(Array.from(selected))}
              >
                <EyeOff className="size-4" /> Delete
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setSelected(new Set())}
            >
              <X className="size-4" /> Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
  setter((prev) => {
    const next = new Set(prev);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });
}

function FilterSection({
  title,
  defaultOpen = false,
  searchable = false,
  items,
  labels,
  selected,
  onToggle,
}: {
  title: string;
  defaultOpen?: boolean;
  searchable?: boolean;
  items: string[];
  labels?: Record<string, string>;
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const shown = items.filter((i) =>
    (labels?.[i] ?? i).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t border-border py-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-foreground">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">
        {searchable && items.length > 5 && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            className="mb-2 h-8 text-xs"
          />
        )}
        {shown.length === 0 ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">None</p>
        ) : (
          <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
            {shown.map((item) => (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <Checkbox
                    checked={selected.has(item)}
                    onCheckedChange={() => onToggle(item)}
                  />
                  <span className="text-muted-foreground">
                    {labels?.[item] ?? item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function NewItemDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    brand: "",
    model: "",
    category: "",
    unit: "",
    description: "",
    unit_price: "",
    currency: "USD",
    lead_time_days: "",
    stock_qty: "",
  });
  const qc = useQueryClient();
  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("catalog_items").insert({
        workspace_id: workspaceId,
        sku: form.sku || null,
        brand: form.brand || null,
        model: form.model || null,
        category: form.category || null,
        unit: form.unit || null,
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
      setForm({
        sku: "",
        brand: "",
        model: "",
        description: "",
        unit_price: "",
        currency: "USD",
        lead_time_days: "",
        stock_qty: "",
      });
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
          <Field label="SKU">
            <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Brand">
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Model">
            <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
          </Field>
          <Field label="Category">
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Toner, Laptops, Stationery" />
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. each, box, ream" />
          </Field>
          <Field label="Currency">
            <Input
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <Input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Unit price">
            <Input
              type="number"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => set("unit_price", e.target.value)}
            />
          </Field>
          <Field label="Lead time (days)">
            <Input
              type="number"
              value={form.lead_time_days}
              onChange={(e) => set("lead_time_days", e.target.value)}
            />
          </Field>
          <Field label="Stock qty">
            <Input
              type="number"
              value={form.stock_qty}
              onChange={(e) => set("stock_qty", e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>
            Add item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export const Route = createFileRoute("/_app/catalog")({
  component: CatalogPage,
});
