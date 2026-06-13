import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Paperclip, Upload, Trash2, Download, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  listQuoteAttachments,
  recordQuoteAttachment,
  getQuoteAttachmentUrl,
  deleteQuoteAttachment,
} from "@/lib/api/quote-attachments.functions";

type Kind = "datasheet" | "warranty" | "compliance" | "other";

const KIND_LABEL: Record<Kind, string> = {
  datasheet: "Datasheet",
  warranty: "Warranty",
  compliance: "Compliance",
  other: "Other",
};

function fmtSize(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function QuoteAttachmentsCard({
  quoteId,
  workspaceId,
  editable,
}: {
  quoteId: string;
  workspaceId: string;
  editable: boolean;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listQuoteAttachments);
  const recordFn = useServerFn(recordQuoteAttachment);
  const urlFn = useServerFn(getQuoteAttachmentUrl);
  const delFn = useServerFn(deleteQuoteAttachment);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [kind, setKind] = useState<Kind>("datasheet");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["quote-attachments", quoteId],
    queryFn: () => listFn({ data: { quoteId } }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["quote-attachments", quoteId] });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { attachmentId: id } }),
    onSuccess: () => {
      toast.success("Attachment removed");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name}: exceeds 20MB`);
          continue;
        }
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const path = `${workspaceId}/${quoteId}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("quote-attachments")
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`);
          continue;
        }
        await recordFn({
          data: {
            quoteId,
            filePath: path,
            fileName: file.name,
            mimeType: file.type || undefined,
            sizeBytes: file.size,
            kind,
          },
        });
      }
      toast.success("Uploaded");
      invalidate();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDownload(id: string) {
    try {
      const { url } = await urlFn({ data: { attachmentId: id } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  const items = data?.attachments ?? [];

  return (
    <Card className="mt-4 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4" /> Attachments
          <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
        </h3>
        {editable && (
          <div className="flex items-center gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                  <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="py-3 text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          No attachments yet. Add OEM datasheets, warranty terms, or compliance docs to send with this quote.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => handleDownload(a.id)}
                  className="block truncate text-left text-sm font-medium hover:underline"
                >
                  {a.file_name}
                </button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{KIND_LABEL[a.kind as Kind]}</Badge>
                  <span>{fmtSize(a.size_bytes)}</span>
                  <span>· {new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => handleDownload(a.id)}>
                <Download className="size-3.5" />
              </Button>
              {editable && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => {
                    if (confirm(`Delete ${a.file_name}?`)) delMut.mutate(a.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
