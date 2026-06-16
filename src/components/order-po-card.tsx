import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Upload, Download, PenLine, CheckCircle2, Printer } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { useProfile } from "@/hooks/use-profile";
import { setOrderPo, acknowledgeOrderPo } from "@/lib/api/orders.functions";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? String(d) : new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function OrderPoCard({
  orderId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order,
  onChanged,
}: {
  orderId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const { data: workspaceId } = useWorkspaceId();
  const { data: profile } = useProfile();
  const setPoFn = useServerFn(setOrderPo);
  const ackFn = useServerFn(acknowledgeOrderPo);

  const [poRef, setPoRef] = useState<string>(order.buyer_po_ref ?? "");
  const [poDate, setPoDate] = useState<string>(order.buyer_po_date ?? "");
  const [uploading, setUploading] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [signer, setSigner] = useState<string>(profile?.firstName ?? "");
  const [signature, setSignature] = useState<string>("");

  const acknowledged = order.po_status === "acknowledged";
  const hasPo = order.po_status === "received" || acknowledged || !!order.buyer_po_ref;

  const refresh = () => { onChanged(); qc.invalidateQueries({ queryKey: ["order", orderId] }); };

  const saveMut = useMutation({
    mutationFn: (docPath?: string | null) =>
      setPoFn({ data: { orderId, poRef: poRef || null, poDate: poDate || null, ...(docPath !== undefined ? { poDocPath: docPath } : {}) } }),
    onSuccess: () => { toast.success("Purchase order saved"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !workspaceId) return;
    setUploading(true);
    const path = `${workspaceId}/${orderId}/po/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("documents").upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    saveMut.mutate(path);
    toast.success("PO document uploaded");
  }

  async function downloadPo() {
    if (!order.po_doc_path) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(order.po_doc_path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const ackMut = useMutation({
    mutationFn: () => ackFn({ data: { orderId, signerName: signer.trim(), signature: signature.trim() } }),
    onSuccess: () => { toast.success("PO acknowledged"); setAckOpen(false); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Acknowledgement failed"),
  });

  // Open a clean, standalone document (letter only) and print / save as PDF.
  function printAcknowledgement() {
    const esc = (s: unknown) => String(s ?? "—").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const buyer = esc(order.buyer_company ?? order.buyer_name);
    const value = `${order.currency ?? "GHS"} ${Number(order.value ?? 0).toLocaleString()}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>PO Acknowledgement — ${esc(order.order_number)}</title>
<style>
  @page { size: A4; margin: 22mm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; line-height: 1.6; font-size: 12pt; }
  h1 { font-size: 16pt; margin: 0 0 2px; }
  .muted { color: #666; }
  .rule { border: 0; border-top: 1px solid #ddd; margin: 16px 0; }
  table { border-collapse: collapse; margin: 14px 0; }
  td { padding: 2px 0; vertical-align: top; }
  td.k { color: #666; padding-right: 16px; white-space: nowrap; }
  .sig { margin-top: 40px; }
  .sig .name { font-size: 16pt; font-style: italic; font-weight: 600; margin: 4px 0 2px; }
</style></head><body>
  <h1>Purchase Order Acknowledgement</h1>
  <div class="muted">Date: ${esc(fmtDate(order.po_acknowledged_at))}</div>
  <hr class="rule" />
  <table>
    <tr><td class="k">To</td><td>${buyer}</td></tr>
    <tr><td class="k">Our order reference</td><td>${esc(order.order_number)}</td></tr>
    <tr><td class="k">Your PO number</td><td>${esc(order.buyer_po_ref)}</td></tr>
    ${order.buyer_po_date ? `<tr><td class="k">PO date</td><td>${esc(fmtDate(order.buyer_po_date))}</td></tr>` : ""}
    <tr><td class="k">Order value</td><td>${esc(value)}</td></tr>
  </table>
  <p>We confirm receipt and acceptance of the above purchase order. The order has been entered and will be
  fulfilled in accordance with its terms. Please retain this acknowledgement for your records.</p>
  <div class="sig">
    <div class="muted">Signed,</div>
    <div class="name">${esc(order.po_signature)}</div>
    <div>${esc(order.po_acknowledged_by)}</div>
    <div class="muted" style="font-size:10pt">${esc(fmtDate(order.po_acknowledged_at))}</div>
  </div>
</body></html>`;
    const w = window.open("", "_blank", "width=820,height=920");
    if (!w) { toast.error("Pop-up blocked — allow pop-ups to print the acknowledgement"); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4" /> Purchase order</h2>
        {acknowledged ? (
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">Acknowledged</Badge>
        ) : hasPo ? (
          <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">Received</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">No PO yet</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Buyer PO number</p>
          <Input value={poRef} onChange={(e) => setPoRef(e.target.value)} placeholder="e.g. PO-2026-0142" className="h-9" />
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">PO date</p>
          <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="h-9" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => saveMut.mutate(undefined)} disabled={saveMut.isPending}>
          Save PO details
        </Button>
        <label>
          <input type="file" className="hidden" onChange={onUpload} />
          <Button asChild size="sm" variant="outline" disabled={uploading}>
            <span className="cursor-pointer"><Upload className="size-3.5" /> {uploading ? "Uploading…" : "Upload buyer PO"}</span>
          </Button>
        </label>
        {order.po_doc_path && (
          <Button size="sm" variant="ghost" onClick={downloadPo}><Download className="size-3.5" /> View PO file</Button>
        )}
      </div>

      {/* Acknowledgement ("sign and revert") */}
      <div className="mt-4 border-t border-border pt-3">
        {acknowledged ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-success" />
              <span>
                Signed by <span className="font-medium">{order.po_acknowledged_by}</span> on {fmtDate(order.po_acknowledged_at)}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setLetterOpen(true)}>
              <Printer className="size-3.5" /> View / print acknowledgement
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Acknowledge the buyer&apos;s PO and produce a signed confirmation to send back.
            </p>
            <Button size="sm" onClick={() => { setSigner(profile?.firstName ?? ""); setAckOpen(true); }} disabled={!hasPo}>
              <PenLine className="size-3.5" /> Acknowledge &amp; sign
            </Button>
          </div>
        )}
      </div>

      {/* Sign dialog */}
      <Dialog open={ackOpen} onOpenChange={setAckOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledge purchase order</DialogTitle>
            <DialogDescription>
              Confirm receipt and acceptance of {order.buyer_po_ref ? `PO ${order.buyer_po_ref}` : "this PO"} for order {order.order_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Signed by (name)</p>
              <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Signature (type your name to sign)</p>
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type full name as signature" className="font-medium italic" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckOpen(false)}>Cancel</Button>
            <Button onClick={() => ackMut.mutate()} disabled={ackMut.isPending || !signer.trim() || !signature.trim()}>
              {ackMut.isPending ? "Signing…" : "Acknowledge & sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable acknowledgement letter */}
      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>PO acknowledgement</DialogTitle>
            <DialogDescription>Send this confirmation back to the buyer.</DialogDescription>
          </DialogHeader>
          <div id="po-ack-letter" className="rounded-lg border border-border bg-card p-6 text-sm leading-relaxed">
            <p className="text-base font-semibold">Purchase Order Acknowledgement</p>
            <p className="mt-1 text-xs text-muted-foreground">Date: {fmtDate(order.po_acknowledged_at)}</p>
            <div className="mt-4 space-y-1">
              <p><span className="text-muted-foreground">To:</span> {order.buyer_company ?? order.buyer_name ?? "—"}</p>
              <p><span className="text-muted-foreground">Our order reference:</span> {order.order_number}</p>
              <p><span className="text-muted-foreground">Your PO number:</span> {order.buyer_po_ref ?? "—"}</p>
              {order.buyer_po_date && <p><span className="text-muted-foreground">PO date:</span> {fmtDate(order.buyer_po_date)}</p>}
              <p><span className="text-muted-foreground">Order value:</span> {order.currency ?? "GHS"} {Number(order.value ?? 0).toLocaleString()}</p>
            </div>
            <p className="mt-4">
              We confirm receipt and acceptance of the above purchase order. The order has been entered and will be
              fulfilled in accordance with its terms. Please retain this acknowledgement for your records.
            </p>
            <div className="mt-6">
              <p className="text-muted-foreground">Signed,</p>
              <p className="mt-1 text-lg font-semibold italic">{order.po_signature}</p>
              <p className="text-sm">{order.po_acknowledged_by}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(order.po_acknowledged_at)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLetterOpen(false)}>Close</Button>
            <Button onClick={printAcknowledgement}><Printer className="size-3.5" /> Print / save as PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
