import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listBuyers } from "@/lib/api/buyers.functions";

const CREATE_NEW = "__create_new__";

/**
 * Shown after a file upload extracts an RFQ: confirm (or pick/create) the buyer before
 * the quote is created, so an uploaded file never produces a quote with a wrong/blank buyer.
 */
export function UploadBuyerConfirmDialog({
  open,
  suggestedBuyer,
  summary,
  submitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  suggestedBuyer: string | null;
  summary: string | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (sel: { buyerId?: string; buyerName?: string }) => void;
}) {
  const listFn = useServerFn(listBuyers);
  const { data } = useQuery({ queryKey: ["buyers"], queryFn: () => listFn(), enabled: open });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buyers: any[] = (data as any)?.buyers ?? [];

  const [choice, setChoice] = useState<string>(CREATE_NEW);
  const [newName, setNewName] = useState("");

  // Default: if the extracted company matches an existing buyer, pre-select it; otherwise
  // offer to create a new buyer pre-filled with the extracted name.
  useEffect(() => {
    if (!open) return;
    const match = suggestedBuyer
      ? buyers.find((b) => (b.name ?? "").trim().toLowerCase() === suggestedBuyer.trim().toLowerCase())
      : null;
    if (match) {
      setChoice(match.id);
    } else {
      setChoice(CREATE_NEW);
      setNewName(suggestedBuyer ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data]);

  const canConfirm = choice !== CREATE_NEW || newName.trim().length > 0;

  function confirm() {
    if (choice === CREATE_NEW) onConfirm({ buyerName: newName.trim() });
    else onConfirm({ buyerId: choice });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="size-4" /> Confirm the buyer</DialogTitle>
          <DialogDescription>
            {summary ? `Extracted: “${summary}”. ` : ""}Who is this quote for? Pick an existing buyer or create a new one.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-2">
            <Label>Buyer</Label>
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {buyers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
                <SelectItem value={CREATE_NEW}>➕ Create a new buyer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {choice === CREATE_NEW && (
            <div className="grid gap-2">
              <Label htmlFor="new-buyer">New buyer name</Label>
              <Input
                id="new-buyer"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Buyer company name"
                autoFocus
              />
              {suggestedBuyer && <p className="text-xs text-muted-foreground">Suggested from the file: {suggestedBuyer}</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button onClick={confirm} disabled={submitting || !canConfirm}>
            {submitting ? "Creating quote…" : "Create quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
