import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileBarChart, Printer, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { getBuyerStatement, sendBuyerStatement } from "@/lib/api/invoices.functions";
import { parseUpgrade, type UpgradeFeature } from "@/lib/plans";
import { UpgradeDialog } from "@/components/upgrade-dialog";

export function BuyerStatementDialog({ buyerId, buyerName }: { buyerId: string; buyerName: string }) {
  const [open, setOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<UpgradeFeature | null>(null);
  const getFn = useServerFn(getBuyerStatement);
  const sendFn = useServerFn(sendBuyerStatement);

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-statement", buyerId],
    enabled: open,
    queryFn: () => getFn({ data: { buyerId } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: any[] = s?.invoices ?? [];
  const currency = s?.currency ?? "GHS";
  const total = s?.totalOutstanding ?? 0;
  const aging = s?.aging ?? { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  const recipient = s?.recipient ?? null;

  const fmt = (v: number) => `${currency === "GHS" ? "GH₵" : currency + " "}${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const sendMut = useMutation({
    mutationFn: () => sendFn({ data: { buyerId } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (r: any) => {
      if (r?.sent) toast.success(`Statement sent to ${r.recipient}`);
      else if (r?.skipped) toast.message(`Email not configured (${r.skipped}). Recipient would be ${r.recipient}.`);
      else toast.error(r?.error ?? "Could not send statement");
    },
    onError: (e) => {
      const f = parseUpgrade(e);
      if (f) { setOpen(false); setUpgradeFeature(f); return; }
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });

  function printStatement() {
    const esc = (x: unknown) => String(x ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const rows = invoices.map((r) => `<tr>
      <td>${esc(r.invoice_number)}</td><td>${esc(r.issued_at ?? "—")}</td><td>${esc(r.due_date ?? "—")}</td>
      <td class="r">${esc(fmt(r.outstanding))}</td>${r.isOverdue ? `<td class="od">${r.daysOverdue}d overdue</td>` : "<td></td>"}</tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Statement — ${esc(buyerName)}</title>
<style>@page{size:A4;margin:18mm} body{font-family:system-ui,Arial,sans-serif;color:#1a1a1a;font-size:12pt}
  h1{font-size:16pt;margin:0} .muted{color:#666} table{width:100%;border-collapse:collapse;margin-top:16px;font-size:11pt}
  th{text-align:left;border-bottom:1px solid #ccc;padding:6px 4px;color:#666} td{padding:6px 4px;border-bottom:1px solid #eee}
  .r{text-align:right} .od{color:#b3261e} .tot{margin-top:14px;text-align:right;font-size:13pt}</style></head><body>
  <h1>Statement of Account</h1><div class="muted">${esc(buyerName)} · ${esc(new Date().toLocaleDateString())}</div>
  <table><thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th class="r">Outstanding</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot"><strong>Total outstanding: ${esc(fmt(total))}</strong></div>
</body></html>`;
    const w = window.open("", "_blank", "width=860,height=1000");
    if (!w) { toast.error("Pop-up blocked — allow pop-ups to print the statement"); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }

  const buckets = [
    { label: "Current", v: aging.current },
    { label: "1–30d", v: aging.d30 },
    { label: "31–60d", v: aging.d60 },
    { label: "61–90d", v: aging.d90 },
    { label: "90d+", v: aging.d90plus },
  ];

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <FileBarChart className="size-3.5" /> Statement of account
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Statement — {buyerName}</DialogTitle>
          <DialogDescription>Open invoices and outstanding balance.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No outstanding invoices for this buyer.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Total outstanding</p>
                <p className="text-2xl font-semibold tabular-nums">{fmt(total)}</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {buckets.map((b) => (
                  <span key={b.label} className={b.label === "Current" ? "text-muted-foreground" : ""}>
                    {b.label} <span className="font-medium tabular-nums text-foreground">{fmt(b.v)}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2 text-left">Invoice</th><th className="py-2 text-left">Due</th><th className="py-2 text-right">Outstanding</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2">{r.invoice_number}</td>
                      <td className={`py-2 ${r.isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {r.due_date ?? "—"}{r.isOverdue ? ` · ${r.daysOverdue}d` : ""}
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmt(r.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {!recipient && invoices.length > 0 && (
            <span className="mr-auto self-center text-xs text-muted-foreground">No billing email on this buyer — add one to email it.</span>
          )}
          <Button variant="outline" size="sm" onClick={printStatement} disabled={invoices.length === 0}>
            <Printer className="size-3.5" /> Print / PDF
          </Button>
          <Button size="sm" onClick={() => sendMut.mutate()} disabled={sendMut.isPending || invoices.length === 0 || !recipient}>
            <Send className="size-3.5" /> {sendMut.isPending ? "Sending…" : "Email statement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <UpgradeDialog
      feature={upgradeFeature}
      onOpenChange={(o) => {
        if (!o) setUpgradeFeature(null);
      }}
    />
    </>
  );
}
