import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
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
import { addManualQuote } from "@/lib/manual-quotes"
import { ASSIGNEES, SECTORS } from "@/lib/pipeline"
import { buyers } from "@/lib/data"
import { addSessionBuyer, useSessionBuyers } from "@/lib/session-buyers"
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
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [title, setTitle] = useState("")
  const [buyer, setBuyer] = useState("")
  const [sector, setSector] = useState<string>(SECTORS[0])
  const [assignee, setAssignee] = useState<string>(ASSIGNEES[0])
  const [showNewBuyer, setShowNewBuyer] = useState(false)
  const [newBuyerName, setNewBuyerName] = useState("")

  const sessionBuyers = useSessionBuyers()
  const buyerOptions = useMemo(() => {
    const all = [...sessionBuyers, ...buyers.map((b) => b.company)]
    return Array.from(new Set(all))
  }, [sessionBuyers])

  function reset() {
    setTitle("")
    setBuyer("")
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
    setBuyer(value)
    setShowNewBuyer(false)
  }

  function handleAddNewBuyer() {
    const added = addSessionBuyer(newBuyerName)
    if (!added) return
    setBuyer(added)
    setShowNewBuyer(false)
    setNewBuyerName("")
  }

  function handleCreate() {
    if (!title.trim() || !buyer.trim()) {
      toast.error("Title and buyer are required")
      return
    }
    const quote = addManualQuote({
      title: title.trim(),
      buyer: buyer.trim(),
      sector,
      assignee,
    })
    toast.success(`${quote.id} created`, { description: "Opened in the quote builder" })
    reset()
    setOpen(false)
    navigate({ to: "/quote/$id", params: { id: quote.id } })
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
            <Select
              value={buyer || undefined}
              onValueChange={handleBuyerChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a buyer" />
              </SelectTrigger>
              <SelectContent>
                {buyerOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
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
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddNewBuyer()
                    }
                  }}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddNewBuyer}>
                  Add
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
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create &amp; open</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
