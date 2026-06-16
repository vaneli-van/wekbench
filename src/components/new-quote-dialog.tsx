import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createQuote } from "@/lib/api/quotes.functions"
import { listBuyers, createBuyer } from "@/lib/api/buyers.functions"
import { ASSIGNEES, SECTORS } from "@/lib/pipeline"
import { toast } from "sonner"

const CREATE_NEW_BUYER = "__create_new_buyer__"

export function NewQuoteDialog({
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [title, setTitle] = useState("")
  const [buyerId, setBuyerId] = useState<string>("")
  const [sector, setSector] = useState<string>(SECTORS[0])
  const [assignee, setAssignee] = useState<string>(ASSIGNEES[0])
  const [showNewBuyer, setShowNewBuyer] = useState(false)
  const [newBuyerName, setNewBuyerName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const createQuoteFn = useServerFn(createQuote)
  const listBuyersFn = useServerFn(listBuyers)
  const createBuyerFn = useServerFn(createBuyer)

  const { data: buyersData } = useQuery({ queryKey: ["buyers"], queryFn: () => listBuyersFn() })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buyers: any[] = (buyersData as any)?.buyers ?? []
  const selectedBuyer = buyers.find((b) => b.id === buyerId)

  function reset() {
    setTitle("")
    setBuyerId("")
    setSector(SECTORS[0])
    setAssignee(ASSIGNEES[0])
    setShowNewBuyer(false)
    setNewBuyerName("")
  }

  function handleBuyerChange(value: string) {
    if (value === CREATE_NEW_BUYER) {
      setShowNewBuyer(true)
      setNewBuyerName("")
      return
    }
    setBuyerId(value)
    setShowNewBuyer(false)
  }

  const addBuyerMut = useMutation({
    mutationFn: (name: string) => createBuyerFn({ data: { name } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: async (r: any) => {
      await qc.invalidateQueries({ queryKey: ["buyers"] })
      if (r?.id) setBuyerId(r.id)
      setShowNewBuyer(false)
      setNewBuyerName("")
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add buyer"),
  })

  async function handleCreate() {
    if (!title.trim() || !selectedBuyer) {
      toast.error("Title and buyer are required")
      return
    }
    setSubmitting(true)
    try {
      const { id } = await createQuoteFn({
        data: { title: title.trim(), buyer: selectedBuyer.name, buyerId: selectedBuyer.id, sector, assignee },
      })
      toast.success("Quote created", { description: "Opened in the quote builder" })
      reset()
      setOpen(false)
      navigate({ to: "/quote/$id", params: { id } })
    } catch (err) {
      toast.error("Could not create quote", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="size-4" />
            New quote
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New quote</DialogTitle>
          <DialogDescription>
            Create a blank quote and open it in the quote builder.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nq-title">Title</Label>
            <Input
              id="nq-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Office laptops for Q3"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>Buyer</Label>
            <Select value={buyerId || undefined} onValueChange={handleBuyerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a buyer" />
              </SelectTrigger>
              <SelectContent>
                {buyers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
                <SelectItem value={CREATE_NEW_BUYER}>➕ Create new buyer</SelectItem>
              </SelectContent>
            </Select>
            {showNewBuyer && (
              <div className="flex items-center gap-2">
                <Input
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  placeholder="New buyer company name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBuyerName.trim()) {
                      e.preventDefault()
                      addBuyerMut.mutate(newBuyerName.trim())
                    }
                  }}
                  autoFocus
                />
                <Button type="button" size="sm" disabled={!newBuyerName.trim() || addBuyerMut.isPending} onClick={() => addBuyerMut.mutate(newBuyerName.trim())}>
                  {addBuyerMut.isPending ? "…" : "Add"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewBuyer(false)
                    setNewBuyerName("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Sector</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating…" : "Create & open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
