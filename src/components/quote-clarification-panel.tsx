import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  MessageSquareText,
  Copy,
  Plus,
  Trash2,
  Send,
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  Paperclip,
  Upload,
  FileText,
  Sparkles,
  RefreshCw,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  createClarification,
  getQuoteClarification,
  addClarificationQuestion,
  updateClarificationQuestion,
  deleteClarificationQuestion,
  sendClarification,
  applyClarificationChange,
  recordClarificationAttachment,
  postClarificationMessage,
  runClarificationFeedback,
} from "@/lib/api/clarifications.functions";

function FeedbackList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="ml-4 list-disc">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const CLAR_BUCKET = "clarification-uploads";
function publicUrl(path: string) {
  return supabase.storage.from(CLAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-amber-100 text-amber-700",
    answered: "bg-success/10 text-success",
    closed: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = {
    draft: "Draft",
    sent: "Awaiting buyer",
    answered: "Answered",
    closed: "Closed",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {label[status] ?? status}
    </span>
  );
}

function fmt(d: string | null | undefined) {
  if (!d) return "";
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? "" : new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function QuoteClarificationPanel({ quoteId, onApplied }: { quoteId: string; onApplied?: () => void }) {
  const qc = useQueryClient();
  const key = ["clarification", quoteId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const getFn = useServerFn(getQuoteClarification);
  const createFn = useServerFn(createClarification);
  const addQFn = useServerFn(addClarificationQuestion);
  const updateQFn = useServerFn(updateClarificationQuestion);
  const deleteQFn = useServerFn(deleteClarificationQuestion);
  const sendFn = useServerFn(sendClarification);
  const applyFn = useServerFn(applyClarificationChange);
  const recordAttachFn = useServerFn(recordClarificationAttachment);
  const postMsgFn = useServerFn(postClarificationMessage);
  const feedbackFn = useServerFn(runClarificationFeedback);

  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => getFn({ data: { quoteId } }) });
  const clar = (data as Any)?.clarification as Any;
  const questions: Any[] = useMemo(() => (data as Any)?.questions ?? [], [data]);
  const changes: Any[] = useMemo(() => (data as Any)?.changes ?? [], [data]);
  const events: Any[] = useMemo(() => (data as Any)?.events ?? [], [data]);
  const attachments: Any[] = useMemo(() => (data as Any)?.attachments ?? [], [data]);
  const messages: Any[] = useMemo(() => (data as Any)?.messages ?? [], [data]);
  const aiFeedback = (clar as Any)?.ai_feedback as Any;

  const [newQ, setNewQ] = useState("");
  const [showActivity, setShowActivity] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const createMut = useMutation({ mutationFn: () => createFn({ data: { quoteId } }), onSuccess: invalidate });
  const addQMut = useMutation({
    mutationFn: () => addQFn({ data: { clarificationId: clar.id, question: newQ.trim() } }),
    onSuccess: () => { setNewQ(""); invalidate(); },
  });
  const toggleMut = useMutation({
    mutationFn: (v: { id: string; included: boolean }) => updateQFn({ data: v }),
    onSuccess: invalidate,
  });
  const editMut = useMutation({
    mutationFn: (v: { id: string; question: string }) => updateQFn({ data: v }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({ mutationFn: (id: string) => deleteQFn({ data: { id } }), onSuccess: invalidate });
  const sendMut = useMutation({
    mutationFn: () => sendFn({ data: { clarificationId: clar.id } }),
    onSuccess: () => { invalidate(); toast.success("Clarification ready — share the buyer link"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send"),
  });
  const applyMut = useMutation({
    mutationFn: (changeId: string) => applyFn({ data: { changeId } }),
    onSuccess: () => { invalidate(); onApplied?.(); toast.success("Applied to quote"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not apply"),
  });
  const postMsgMut = useMutation({
    mutationFn: () => postMsgFn({ data: { clarificationId: clar.id, body: newMessage.trim() } }),
    onSuccess: () => { setNewMessage(""); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not post message"),
  });
  const feedbackMut = useMutation({
    mutationFn: () => feedbackFn({ data: { clarificationId: clar.id } }),
    onSuccess: () => invalidate(),
  });

  // Auto-summarize the buyer's feedback when there's new buyer activity since the last run.
  const lastBuyerAt = useMemo(() => {
    const times: number[] = [];
    if (clar?.answered_at) times.push(new Date(clar.answered_at).getTime());
    for (const m of messages) if (m.author === "buyer" && m.created_at) times.push(new Date(m.created_at).getTime());
    return times.length ? Math.max(...times) : 0;
  }, [clar?.answered_at, messages]);
  useEffect(() => {
    if (!clar || clar.status === "draft") return;
    const aiTime = clar.ai_feedback_at ? new Date(clar.ai_feedback_at).getTime() : 0;
    if (lastBuyerAt > 0 && lastBuyerAt > aiTime && !feedbackMut.isPending) feedbackMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clar?.id, lastBuyerAt, clar?.ai_feedback_at]);

  const token = clar?.share_token as string | undefined;
  const link = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${token}` : "";
  const isDraft = clar?.status === "draft";

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !clar) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: over 10MB`);
          continue;
        }
        const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
        const path = `${token}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage
          .from(CLAR_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) {
          toast.error(`${file.name}: ${error.message}`);
          continue;
        }
        await recordAttachFn({
          data: { clarificationId: clar.id, filePath: path, fileName: file.name, contentType: file.type || undefined, sizeBytes: file.size },
        });
      }
      invalidate();
      toast.success("Attached");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="mt-4 p-4">
        <p className="text-sm text-muted-foreground">Loading clarification…</p>
      </Card>
    );
  }

  // No clarification yet — offer to start one (optional, non-blocking).
  if (!clar) {
    return (
      <Card className="mt-4 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareText className="size-4" /> Buyer clarification
          </p>
          <p className="text-xs text-muted-foreground">
            Confirm specs, quantities or certifications with the buyer before you quote — optional, and never blocks sourcing.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
          <Plus className="size-3.5" /> Start clarification
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText className="size-4" /> Buyer clarification
        </h3>
        <StatusBadge status={clar.status} />
      </div>

      {/* Questions */}
      <div className="space-y-2">
        {questions.length === 0 && (
          <p className="text-xs text-muted-foreground">No questions yet — add the points you need the buyer to confirm.</p>
        )}
        {questions.map((q) => (
          <div key={q.id} className="flex items-start gap-2 rounded-md border border-border p-2">
            {isDraft && (
              <input
                type="checkbox"
                checked={q.included}
                onChange={(e) => toggleMut.mutate({ id: q.id, included: e.target.checked })}
                className="mt-1.5"
                title="Include this question"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {q.line_no != null && <span className="text-xs text-muted-foreground">Line {q.line_no}</span>}
                {q.source === "agent" && (
                  <span className="rounded bg-primary/10 px-1.5 text-[10px] font-medium text-primary">AI-suggested</span>
                )}
              </div>
              {isDraft ? (
                <Input
                  defaultValue={q.question}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== q.question) editMut.mutate({ id: q.id, question: v });
                  }}
                  className={`mt-1 h-8 text-sm ${q.included ? "" : "line-through opacity-50"}`}
                />
              ) : (
                <p className="mt-0.5 text-sm">{q.question}</p>
              )}
              {/* Buyer answer */}
              {!isDraft && (
                <p className={`mt-1 text-sm ${q.buyer_answer ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Answer: </span>
                  {q.buyer_answer ?? "—"}
                </p>
              )}
            </div>
            {isDraft && (
              <button
                onClick={() => delMut.mutate(q.id)}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                aria-label="Remove question"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add question (draft only) */}
      {isDraft && (
        <div className="mt-2 flex gap-2">
          <Input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newQ.trim()) { e.preventDefault(); addQMut.mutate(); }
            }}
            placeholder="Add a clarification question…"
            className="h-8 text-sm"
          />
          <Button size="sm" variant="outline" onClick={() => addQMut.mutate()} disabled={!newQ.trim() || addQMut.isPending}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
      )}

      {/* Buyer comment */}
      {clar.buyer_comment && (
        <div className="mt-3 rounded-md bg-muted/40 p-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Buyer note: </span>
          {clar.buyer_comment}
        </div>
      )}

      {/* Proposed changes with Apply */}
      {changes.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed changes</p>
          <div className="space-y-1.5">
            {changes.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                <span>
                  {ch.kind === "qty" ? (
                    <>Change line {ch.line_no} quantity to <strong>{ch.payload?.qty}</strong></>
                  ) : (
                    <>Add item: <strong>{ch.payload?.description}</strong> × {ch.payload?.qty ?? 1}</>
                  )}
                </span>
                {ch.vendor_applied ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="size-3.5" /> Applied</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => applyMut.mutate(ch.id)} disabled={applyMut.isPending}>
                    Apply to quote
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI buyer feedback */}
      {!isDraft && (aiFeedback || feedbackMut.isPending) && (
        <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" /> AI buyer feedback
            </p>
            <button
              onClick={() => feedbackMut.mutate()}
              disabled={feedbackMut.isPending}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`size-3 ${feedbackMut.isPending ? "animate-spin" : ""}`} /> {feedbackMut.isPending ? "Summarizing…" : "Re-run"}
            </button>
          </div>
          {aiFeedback ? (
            <div className="space-y-1.5 text-sm">
              <p>{aiFeedback.summary}</p>
              <FeedbackList label="Confirmed" items={aiFeedback.confirmed_specs} />
              <FeedbackList label="New requirements" items={aiFeedback.new_requirements} />
              <FeedbackList label="Changes" items={aiFeedback.changes} />
              <FeedbackList label="Risks" items={aiFeedback.risks} />
              {aiFeedback.next_action && (
                <p className="pt-0.5 text-xs"><span className="font-medium">Next:</span> {aiFeedback.next_action}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Summarizing the buyer&apos;s response…</p>
          )}
        </div>
      )}

      {/* Attachments — both directions (buyer pictures/datasheets + your reference files) */}
      <div className="mt-3">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Paperclip className="size-3.5" /> Attachments
        </p>
        {attachments.length > 0 ? (
          <ul className="space-y-1">
            {attachments.map((a) => (
              <li key={a.file_path} className="flex items-center gap-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <a href={publicUrl(a.file_path)} target="_blank" rel="noreferrer" className="min-w-0 truncate underline">
                  {a.file_name}
                </a>
                <span className="rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  {a.uploader === "buyer" ? "From buyer" : "You"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No files yet. Buyer pictures/datasheets and your reference files appear here.</p>
        )}
        <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground">
          <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Add a reference file"}
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      </div>

      {/* Follow-up conversation — both directions */}
      {!isDraft && (
        <div className="mt-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MessageSquareText className="size-3.5" /> Conversation
          </p>
          {messages.length > 0 ? (
            <ul className="space-y-1.5">
              {messages.map((m, i) => (
                <li key={i} className={`rounded-md border border-border p-2 text-sm ${m.author === "buyer" ? "bg-muted/40" : ""}`}>
                  <div className="mb-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{m.author === "buyer" ? m.author_name || "Buyer" : m.author_name || "You"}</span>
                    <span>· {fmt(m.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No messages yet — ask the buyer a follow-up.</p>
          )}
          <div className="mt-2 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Reply to the buyer…"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newMessage.trim()) { e.preventDefault(); postMsgMut.mutate(); }
              }}
            />
            <Button size="sm" variant="outline" onClick={() => postMsgMut.mutate()} disabled={postMsgMut.isPending || !newMessage.trim()}>
              <Send className="size-3.5" /> Send
            </Button>
          </div>
        </div>
      )}

      {/* Send / link */}
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
        {isDraft ? (
          <>
            <p className="text-xs text-muted-foreground">Optional — send the buyer a no-login link, or just skip and go straight to sourcing.</p>
            <Button size="sm" onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
              <Send className="size-3.5" /> Send to buyer
            </Button>
          </>
        ) : (
          <>
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {clar.status === "answered" ? (
                <>Answered{clar.answered_by ? ` by ${clar.answered_by}` : ""}{clar.answered_at ? ` · ${fmt(clar.answered_at)}` : ""}</>
              ) : clar.opened_at ? (
                <>Opened by buyer · {fmt(clar.opened_at)}</>
              ) : (
                <>Sent · awaiting response</>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { navigator.clipboard?.writeText(link); toast.success("Buyer link copied"); }}
              >
                <Copy className="size-3.5" /> Copy link
              </Button>
              <a href={link} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost">Preview</Button>
              </a>
            </div>
          </>
        )}
      </div>

      {/* Audit trail */}
      {events.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <button
            onClick={() => setShowActivity((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showActivity ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            Activity ({events.length})
          </button>
          {showActivity && (
            <ul className="mt-2 space-y-1">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span className="font-medium capitalize text-foreground">{ev.action}</span>
                  <span>· {ev.detail?.by || (ev.actor === "buyer" ? "buyer" : "you")}</span>
                  <span>· {fmt(ev.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
