import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Download, Upload, Trash2, Check, Send, FolderArchive } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/foundations/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listOrders } from "@/lib/api/orders.functions";
import { listDocuments, addDocument, updateDocumentStatus, deleteDocument } from "@/lib/api/documents.functions";

const STANDARD = [
  { type: "commercial_invoice", label: "Commercial Invoice" },
  { type: "proforma_invoice", label: "Proforma Invoice" },
  { type: "delivery_note", label: "Delivery Note" },
  { type: "waybill", label: "Waybill" },
  { type: "certificate_of_origin", label: "Certificate of Origin" },
  { type: "packing_list", label: "Packing List" },
];

const STATUS_TONE: Record<string, string> = {
  missing: "bg-muted text-muted-foreground",
  uploaded: "bg-info/15 text-info border-info/30",
  sent: "bg-warning/15 text-warning border-warning/30",
  accepted: "bg-success/15 text-success border-success/30",
};

function DocsPage() {
  const qc = useQueryClient();
  const { data: workspaceId } = useWorkspaceId();
  const listOrdersFn = useServerFn(listOrders);
  const listDocsFn = useServerFn(listDocuments);
  const addDocFn = useServerFn(addDocument);
  const statusFn = useServerFn(updateDocumentStatus);
  const delFn = useServerFn(deleteDocument);

  const { data: ordersData } = useQuery({ queryKey: ["orders"], queryFn: () => listOrdersFn() });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders: any[] = (ordersData as any)?.orders ?? [];
  const [orderId, setOrderId] = useState<string>("");
  const activeOrderId = orderId || orders[0]?.id || "";
  const activeOrder = orders.find((o) => o.id === activeOrderId);

  const { data: docsData } = useQuery({
    queryKey: ["documents", activeOrderId],
    enabled: !!activeOrderId,
    queryFn: () => listDocsFn({ data: { orderId: activeOrderId } }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs: any[] = (docsData as any)?.documents ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["documents", activeOrderId] });

  const fileRef = useRef<HTMLInputElement>(null);
  const pending = useRef<{ docType: string; label: string } | null>(null);

  async function pickFile(docType: string, label: string) {
    pending.current = { docType, label };
    fileRef.current?.click();
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pending.current || !workspaceId || !activeOrderId) return;
    const { docType, label } = pending.current;
    const path = `${workspaceId}/${activeOrderId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) { toast.error(error.message); return; }
    try {
      await addDocFn({ data: { orderId: activeOrderId, name: file.name, docType, filePath: path, status: "uploaded" } });
      toast.success(`${label} uploaded`);
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record document");
    }
  }

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: string }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statusFn({ data: v as any }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: invalidate,
  });

  async function download(filePath: string | null) {
    if (!filePath) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(filePath, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  // Merge standard checklist with actual docs (by doc_type), plus extras.
  const byType: Record<string, typeof docs> = {};
  for (const d of docs) (byType[d.doc_type] ??= []).push(d);
  const extras = docs.filter((d) => !STANDARD.some((s) => s.type === d.doc_type));

  const counts = { accepted: 0, sent: 0, uploaded: 0, missing: 0 };
  for (const s of STANDARD) {
    const d = byType[s.type]?.[0];
    if (!d) counts.missing += 1;
    else if (d.status === "accepted") counts.accepted += 1;
    else if (d.status === "sent") counts.sent += 1;
    else counts.uploaded += 1;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
      <PageHeader
        title="Document pack"
        description="The documents a buyer needs to accept delivery — generated, uploaded and tracked per order."
        actions={
          orders.length > 0 ? (
            <Select value={activeOrderId} onValueChange={setOrderId}>
              <SelectTrigger className="h-9 w-64"><SelectValue placeholder="Select an order" /></SelectTrigger>
              <SelectContent>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_number} · {o.buyer_company ?? o.buyer_name ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={FolderArchive}
          title="No orders yet."
          description="Document packs are organised per order. Accept a quote to create an order, then upload its documents here."
          action={{ label: "Go to orders", href: "/orders" }}
        />
      ) : (
        <>
          {activeOrder && (
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              {activeOrder.order_number} · {activeOrder.buyer_company ?? activeOrder.buyer_name ?? "—"}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Accepted", v: counts.accepted, tone: "text-success" },
              { label: "Sent", v: counts.sent, tone: "text-warning" },
              { label: "Uploaded", v: counts.uploaded, tone: "text-info" },
              { label: "Missing", v: counts.missing, tone: "text-destructive" },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className={`text-3xl font-semibold tabular-nums ${s.tone}`}>{s.v}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Document checklist</h2>
            </div>
            <ul className="divide-y divide-border">
              {STANDARD.map((s) => {
                const doc = byType[s.type]?.[0];
                return (
                  <li key={s.type} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        {doc && <p className="text-xs text-muted-foreground">{doc.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Badge variant="outline" className={`capitalize ${doc ? STATUS_TONE[doc.status] : STATUS_TONE.missing}`}>
                        {doc ? doc.status : "missing"}
                      </Badge>
                      {!doc ? (
                        <Button size="sm" variant="outline" onClick={() => pickFile(s.type, s.label)}>
                          <Upload className="size-3.5" /> Upload
                        </Button>
                      ) : (
                        <>
                          {doc.file_path && (
                            <Button size="icon" variant="ghost" className="size-8" title="Download" onClick={() => download(doc.file_path)}>
                              <Download className="size-4" />
                            </Button>
                          )}
                          {doc.status === "uploaded" && (
                            <Button size="icon" variant="ghost" className="size-8" title="Mark sent" onClick={() => statusMut.mutate({ id: doc.id, status: "sent" })}>
                              <Send className="size-4" />
                            </Button>
                          )}
                          {doc.status === "sent" && (
                            <Button size="icon" variant="ghost" className="size-8" title="Mark accepted" onClick={() => statusMut.mutate({ id: doc.id, status: "accepted" })}>
                              <Check className="size-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-8" title="Remove" onClick={() => delMut.mutate(doc.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}

              {extras.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><FileText className="size-4" /></div>
                    <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">Other</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`capitalize ${STATUS_TONE[d.status]}`}>{d.status}</Badge>
                    {d.file_path && <Button size="icon" variant="ghost" className="size-8" onClick={() => download(d.file_path)}><Download className="size-4" /></Button>}
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => delMut.mutate(d.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-3">
              <Button size="sm" variant="ghost" onClick={() => pickFile("other", "Document")}>
                <Upload className="size-3.5" /> Upload another document
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/documents")({
  component: DocsPage,
});
