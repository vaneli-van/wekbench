import { useMemo, useState } from "react"
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, AlertCircle, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Column<T> = {
  key: string
  header: string
  sortable?: boolean
  align?: "left" | "right"
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
}

export type RowAction<T> = {
  label: string
  onSelect: (row: T) => void
}

type SortState = { key: string; dir: "asc" | "desc" } | null

export function DataTable<T extends { id: string }>({
  columns,
  data,
  rowActions,
  searchKeys,
  pageSize = 6,
  loading = false,
  error,
  emptyState,
  getRowHref,
}: {
  columns: Column<T>[]
  data: T[]
  rowActions?: RowAction<T>[]
  searchKeys?: ((row: T) => string)[]
  pageSize?: number
  loading?: boolean
  error?: string
  emptyState?: React.ReactNode
  getRowHref?: (row: T) => string
}) {
  const [sort, setSort] = useState<SortState>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!query || !searchKeys) return data
    const q = query.toLowerCase()
    return data.filter((row) => searchKeys.some((fn) => fn(row).toLowerCase().includes(q)))
  }, [data, query, searchKeys])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return filtered
    const out = [...filtered].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (av < bv) return sort.dir === "asc" ? -1 : 1
      if (av > bv) return sort.dir === "asc" ? 1 : -1
      return 0
    })
    return out
  }, [filtered, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return null
    })
  }

  const allOnPageSelected = paged.length > 0 && paged.every((r) => selected.has(r.id))
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) paged.forEach((r) => next.delete(r.id))
      else paged.forEach((r) => next.add(r.id))
      return next
    })
  }
  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const colSpan = columns.length + 1 + (rowActions ? 1 : 0)

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        {searchKeys && (
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Filter..."
            className="h-8 w-56"
          />
        )}
        {selected.size > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{selected.size} selected</span>
        )}
      </div>

      {/* Table */}
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2.5 text-left">
                <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        col.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === "asc" ? (
                          <ChevronUp className="size-3.5" />
                        ) : (
                          <ChevronDown className="size-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {rowActions && <th className="w-10 px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-3">
                    <Skeleton className="size-4 rounded" />
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                  {rowActions && <td />}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <AlertCircle className="size-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Couldn&apos;t load data</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                    <Button size="sm" variant="outline" className="mt-1 bg-transparent">
                      Retry
                    </Button>
                  </div>
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-12">
                  {emptyState ?? (
                    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                      <Inbox className="size-6" />
                      <p className="text-sm">No results</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={row.id} className="group transition-colors hover:bg-muted/50">
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={() => toggleRow(row.id)}
                      aria-label="Select row"
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-3 py-2.5", col.align === "right" && "text-right tabular-nums")}
                    >
                      {getRowHref && col.key === columns[0].key ? (
                        <a href={getRowHref(row)} className="hover:underline">
                          {col.render(row)}
                        </a>
                      ) : (
                        col.render(row)
                      )}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Row actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {rowActions.map((a) => (
                            <DropdownMenuItem key={a.label} onSelect={() => a.onSelect(row)}>
                              {a.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !error && sorted.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 bg-transparent"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="px-2 text-xs text-muted-foreground tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 bg-transparent"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
