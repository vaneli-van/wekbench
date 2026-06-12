import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/foundations/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ProductDrawer } from "@/components/catalog/product-drawer"
import { AddProductDialog } from "@/components/catalog/add-product-dialog"
import { EmptyState } from "@/components/foundations/empty-state"
import {
  catalogProducts,
  categoryTree,
  catalogBrands,
  catalogSuppliers,
  sourceLabels,
  availabilityLabels,
  catalogStats,
  type CatalogProduct,
  type ProductSource,
  type Availability,
  type AuthStatus,
} from "@/lib/catalog"
import {
  Plus,
  ChevronDown,
  Search,
  LayoutGrid,
  List,
  Table as TableIcon,
  Star,
  Eye,
  EyeOff,
  Pencil,
  Users,
  Tag,
  DollarSign,
  PackageCheck,
  X,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = "grid" | "list" | "table"

function fmt(currency: string, n: number) {
  return `${currency === "USD" ? "$" : currency + " "}${n.toLocaleString()}`
}

const availabilityTone: Record<Availability, "success" | "warning" | "error" | "neutral"> = {
  "in-stock": "success",
  "low-stock": "warning",
  "out-of-stock": "error",
  "on-request": "neutral",
}

function CatalogPage() {
  const [view, setView] = useState<ViewMode>("table")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeProduct, setActiveProduct] = useState<CatalogProduct | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [sortKey, setSortKey] = useState<"price" | "updatedAt" | "brand">("updatedAt")

  // filters
  const [cats, setCats] = useState<Set<string>>(new Set())
  const [brands, setBrands] = useState<Set<string>>(new Set())
  const [supps, setSupps] = useState<Set<string>>(new Set())
  const [sources, setSources] = useState<Set<ProductSource>>(new Set())
  const [avails, setAvails] = useState<Set<Availability>>(new Set())
  const [auths, setAuths] = useState<Set<AuthStatus>>(new Set())

  const filtered = useMemo(() => {
    let list = catalogProducts.filter((p) => !p.hidden)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(
        (p) =>
          p.model.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      )
    }
    if (cats.size) list = list.filter((p) => p.categoryPath.some((c) => cats.has(c)))
    if (brands.size) list = list.filter((p) => brands.has(p.brand))
    if (supps.size) list = list.filter((p) => supps.has(p.supplier))
    if (sources.size) list = list.filter((p) => sources.has(p.source))
    if (avails.size) list = list.filter((p) => avails.has(p.availability))
    if (auths.size) list = list.filter((p) => auths.has(p.authStatus))

    list = [...list].sort((a, b) => {
      if (sortKey === "price") return b.price - a.price
      if (sortKey === "brand") return a.brand.localeCompare(b.brand)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return list
  }, [query, cats, brands, supps, sources, avails, auths, sortKey])

  const open = (p: CatalogProduct) => {
    setActiveProduct(p)
    setDrawerOpen(true)
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))
  const toggleAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((p) => p.id)))
  }

  const activeFilterCount =
    cats.size + brands.size + supps.size + sources.size + avails.size + auths.size
  const clearFilters = () => {
    setCats(new Set())
    setBrands(new Set())
    setSupps(new Set())
    setSources(new Set())
    setAvails(new Set())
    setAuths(new Set())
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-6 md:px-8">
        <PageHeader
          title="Catalog"
          description={`${catalogStats.totalSkus.toLocaleString()} SKUs · last updated ${catalogStats.lastUpdated}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-transparent" asChild>
                <Link to="/suppliers"><Users className="size-4" /> Manage suppliers</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4" /> Add product
                    <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setAddOpen(true)}>Manual entry</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAddOpen(true)}>Upload CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAddOpen(true)}>Sync supplier feed</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Category tree */}
          <FilterSection title="Category" defaultOpen>
            <ul className="flex flex-col gap-0.5">
              {categoryTree.map((cat) => (
                <CategoryNode
                  key={cat.name}
                  cat={cat}
                  selected={cats}
                  onToggle={(name) =>
                    setCats((prev) => {
                      const next = new Set(prev)
                      next.has(name) ? next.delete(name) : next.add(name)
                      return next
                    })
                  }
                />
              ))}
            </ul>
          </FilterSection>

          <FilterSection title="Brand" searchable items={catalogBrands} selected={brands} onToggle={(v) => toggleSet(setBrands, v)} />
          <FilterSection title="Supplier" items={catalogSuppliers} selected={supps} onToggle={(v) => toggleSet(setSupps, v)} />
          <FilterSection
            title="Availability"
            items={Object.keys(availabilityLabels)}
            labels={availabilityLabels}
            selected={avails}
            onToggle={(v) => toggleSet(setAvails as never, v)}
          />
          <FilterSection
            title="Source"
            items={Object.keys(sourceLabels)}
            labels={sourceLabels}
            selected={sources}
            onToggle={(v) => toggleSet(setSources as never, v)}
          />
          <FilterSection
            title="Authorisation"
            items={["authorised", "unauthorised", "pending"]}
            labels={{ authorised: "Authorised", unauthorised: "Unauthorised", pending: "Pending review" }}
            selected={auths}
            onToggle={(v) => toggleSet(setAuths as never, v)}
          />
        </aside>

        {/* Main */}
        <section className="flex min-w-0 flex-1 flex-col pl-0 lg:pl-5">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 py-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by model, brand, SKU…"
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
                <DropdownMenuItem onClick={() => setSortKey("updatedAt")}>Last updated</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("price")}>Price (high → low)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortKey("brand")}>Brand (A → Z)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle */}
            <div className="flex items-center rounded-md border border-border p-0.5">
              {([
                { id: "grid", icon: LayoutGrid },
                { id: "list", icon: List },
                { id: "table", icon: TableIcon },
              ] as const).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  aria-label={`${v.id} view`}
                  className={cn(
                    "flex size-7 items-center justify-center rounded",
                    view === v.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <v.icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="pb-2 text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </p>

          {/* Views */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <EmptyState
                className="h-full"
                icon={Search}
                title="No products match your filters."
                description="Try clearing filters or add a product to your catalog."
                action={{ label: "Add product", onClick: () => setAddOpen(true) }}
                secondaryAction={{ label: "Clear filters", onClick: clearFilters }}
              />
            ) : view === "table" ? (
              <TableView
                products={filtered}
                selected={selected}
                allSelected={allVisibleSelected}
                onToggleAll={toggleAll}
                onToggle={toggle}
                onOpen={open}
              />
            ) : view === "grid" ? (
              <GridView products={filtered} onOpen={open} selected={selected} onToggle={toggle} />
            ) : (
              <ListView products={filtered} onOpen={open} selected={selected} onToggle={toggle} />
            )}
          </div>
        </section>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 z-20 border-t border-border bg-card px-4 py-3 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="bg-transparent" onClick={() => toast.success(`Updated pricing for ${selected.size} products`)}>
                <DollarSign className="size-4" /> Update pricing
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent" onClick={() => toast.success(`Updated availability for ${selected.size} products`)}>
                <PackageCheck className="size-4" /> Update availability
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent" onClick={() => toast.success(`${selected.size} products tagged as preferred`)}>
                <Tag className="size-4" /> Tag as preferred
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent" onClick={() => { toast.success(`${selected.size} products hidden`); setSelected(new Set()); }}>
                <EyeOff className="size-4" /> Hide from catalog
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
              <X className="size-4" /> Clear
            </Button>
          </div>
        </div>
      )}

      <ProductDrawer product={activeProduct} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <AddProductDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
  setter((prev) => {
    const next = new Set(prev)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  })
}

/* ---------- Filter primitives ---------- */
function FilterSection({
  title,
  defaultOpen = false,
  searchable = false,
  items,
  labels,
  selected,
  onToggle,
  children,
}: {
  title: string
  defaultOpen?: boolean
  searchable?: boolean
  items?: string[]
  labels?: Record<string, string>
  selected?: Set<string>
  onToggle?: (v: string) => void
  children?: React.ReactNode
}) {
  const [q, setQ] = useState("")
  const shown = items?.filter((i) => (labels?.[i] ?? i).toLowerCase().includes(q.toLowerCase()))
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t border-border py-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1.5 text-sm font-medium text-foreground">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">
        {searchable && (
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="mb-2 h-8 text-xs" />
        )}
        {children ?? (
          <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
            {shown?.map((item) => (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <Checkbox checked={selected?.has(item)} onCheckedChange={() => onToggle?.(item)} />
                  <span className="text-muted-foreground">{labels?.[item] ?? item}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function CategoryNode({
  cat,
  selected,
  onToggle,
}: {
  cat: { name: string; count: number; children?: { name: string; count: number }[] }
  selected: Set<string>
  onToggle: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <div className="flex items-center gap-1">
        {cat.children ? (
          <button onClick={() => setOpen((o) => !o)} className="text-muted-foreground">
            <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
          <Checkbox checked={selected.has(cat.name)} onCheckedChange={() => onToggle(cat.name)} />
          <span className="flex-1 text-muted-foreground">{cat.name}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground/60">{cat.count}</span>
        </label>
      </div>
      {cat.children && open && (
        <ul className="ml-5 flex flex-col gap-0.5 border-l border-border pl-2">
          {cat.children.map((c) => (
            <li key={c.name}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                <Checkbox checked={selected.has(c.name)} onCheckedChange={() => onToggle(c.name)} />
                <span className="flex-1 text-muted-foreground">{c.name}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground/60">{c.count}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/* ---------- Table view ---------- */
function TableView({
  products,
  selected,
  allSelected,
  onToggleAll,
  onToggle,
  onOpen,
}: {
  products: CatalogProduct[]
  selected: Set<string>
  allSelected: boolean
  onToggleAll: () => void
  onToggle: (id: string) => void
  onOpen: (p: CatalogProduct) => void
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2.5">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
            </th>
            <th className="px-3 py-2.5 text-left font-medium">Product</th>
            <th className="px-3 py-2.5 text-left font-medium">Category</th>
            <th className="px-3 py-2.5 text-left font-medium">Supplier</th>
            <th className="px-3 py-2.5 text-right font-medium">Price</th>
            <th className="px-3 py-2.5 text-left font-medium">Lead time</th>
            <th className="px-3 py-2.5 text-left font-medium">Source</th>
            <th className="px-3 py-2.5 text-left font-medium">Updated</th>
            <th className="w-10 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((p) => (
            <tr
              key={p.id}
              className="group cursor-pointer hover:bg-muted/40"
              onClick={() => onOpen(p)}
            >
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => onToggle(p.id)} aria-label={`Select ${p.model}`} />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    <img src={p.image || "/placeholder.svg"} alt="" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{p.brand}</span>
                      {p.preferred && <Star className="size-3 fill-foreground text-foreground" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{p.model} · {p.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{p.category}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{p.supplier}</td>
              <td className="px-3 py-2.5 text-right font-medium tabular-nums text-foreground">
                {fmt(p.currency, p.price)}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{p.leadTime}</td>
              <td className="px-3 py-2.5">
                <StatusBadge variant="neutral" dot={false}>
                  {sourceLabels[p.source]}
                </StatusBadge>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{p.updatedAt}</td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <RowActions product={p} onOpen={onOpen} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RowActions() {
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <Button variant="ghost" size="icon" className="size-7" aria-label="View">
        <Eye className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" aria-label="Edit">
        <Pencil className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" aria-label="Set preferred">
        <Star className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" aria-label="Hide">
        <EyeOff className="size-3.5" />
      </Button>
    </div>
  )
}

/* ---------- Grid view ---------- */
function GridView({
  products,
  onOpen,
  selected,
  onToggle,
}: {
  products: CatalogProduct[]
  onOpen: (p: CatalogProduct) => void
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(p)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onOpen(p)
            }
          }}
          className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-[4/3] bg-muted">
            <img src={p.image || "/placeholder.svg"} alt={p.model} className="object-cover" />
            <div className="absolute left-2 top-2" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selected.has(p.id)}
                onCheckedChange={() => onToggle(p.id)}
                className="border-foreground/30 bg-background/80"
                aria-label={`Select ${p.model}`}
              />
            </div>
            {p.preferred && (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                <Star className="size-2.5" /> Preferred
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col p-3">
            <span className="text-xs text-muted-foreground">{p.brand}</span>
            <p className="line-clamp-1 text-sm font-medium text-foreground">{p.model}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{fmt(p.currency, p.price)}</span>
              <StatusBadge variant={availabilityTone[p.availability]} dot={false}>
                {availabilityLabels[p.availability]}
              </StatusBadge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- List view ---------- */
function ListView({
  products,
  onOpen,
  selected,
  onToggle,
}: {
  products: CatalogProduct[]
  onOpen: (p: CatalogProduct) => void
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {products.map((p) => (
        <li
          key={p.id}
          onClick={() => onOpen(p)}
          className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-card p-3 hover:bg-muted/40"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={selected.has(p.id)} onCheckedChange={() => onToggle(p.id)} aria-label={`Select ${p.model}`} />
          </div>
          <div className="relative size-14 shrink-0 overflow-hidden rounded border border-border bg-muted">
            <img src={p.image || "/placeholder.svg"} alt="" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{p.brand}</span>
              {p.preferred && <Star className="size-3 fill-foreground text-foreground" />}
            </div>
            <p className="truncate text-sm font-medium text-foreground">{p.model}</p>
            <p className="truncate text-xs text-muted-foreground">{p.description}</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-foreground">{fmt(p.currency, p.price)}</p>
            <p className="text-xs text-muted-foreground">{p.leadTime}</p>
          </div>
          <StatusBadge variant={availabilityTone[p.availability]} dot={false}>
            {availabilityLabels[p.availability]}
          </StatusBadge>
        </li>
      ))}
    </ul>
  )
}


export const Route = createFileRoute("/_app/catalog")({
  component: CatalogPage,
});
