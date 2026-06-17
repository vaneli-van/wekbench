import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BookOpen, Search, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { searchCatalog, addQuoteLineFromCatalog } from "@/lib/api/catalog.functions";

export function CatalogPickerDialog({ quoteId, onAdded }: { quoteId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const qc = useQueryClient();
  const searchFn = useServerFn(searchCatalog);
  const addFn = useServerFn(addQuoteLineFromCatalog);

  const { data, isLoading } = useQuery({
    queryKey: ["catalog-search", query],
    enabled: open,
    queryFn: () => searchFn({ data: { query: query || undefined } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = (data as any)?.items ?? [];

  const addMut = useMutation({
    mutationFn: (catalogItemId: string) => addFn({ data: { quoteId, catalogItemId } }),
    onMutate: (id: string) => setAddingId(id),
    onSuccess: () => {
      toast.success("Added to quote");
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      onAdded();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add"),
    onSettled: () => setAddingId(null),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <BookOpen className="size-3.5" /> From catalog
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add from catalog</DialogTitle>
          <DialogDescription>Pick a product — its price converts into the quote currency automatically.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, brand, model, SKU, category…"
            className="pl-9"
          />
        </div>

        <div className="mt-3 max-h-[55vh] overflow-y-auto rounded-lg border border-border">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Searching…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {query ? "No matching catalog items." : "Your catalog is empty — add items on the Catalog page."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{it.description}</p>
                      {it.category && <Badge variant="outline" className="text-[10px] text-muted-foreground">{it.category}</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[it.brand, it.model, it.sku].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {it.unit_price != null ? `${it.currency ?? ""} ${Number(it.unit_price).toLocaleString()}` : "no price"}
                      {it.unit ? ` /${it.unit}` : ""}
                    </span>
                    <Button size="sm" variant="outline" disabled={addMut.isPending && addingId === it.id} onClick={() => addMut.mutate(it.id)}>
                      <Plus className="size-3.5" /> {addMut.isPending && addingId === it.id ? "Adding…" : "Add"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
