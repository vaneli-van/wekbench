import { createFileRoute } from "@tanstack/react-router";

/**
 * SendGrid Inbound Parse webhook.
 *
 * SendGrid POSTs each received email as multipart/form-data with fields:
 *   from, to, subject, text, html, envelope, headers, attachments (count),
 *   attachment1, attachment2, ... (File parts), attachment-info, spam_score, ...
 *
 * Configure SendGrid Inbound Parse to POST to:
 *   https://<your-domain>/api/public/inbound-email?secret=<INBOUND_EMAIL_WEBHOOK_SECRET>
 */
export const Route = createFileRoute("/api/public/inbound-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Verify shared secret (SendGrid doesn't sign requests, so we use a URL secret)
          const url = new URL(request.url);
          const providedSecret = url.searchParams.get("secret");
          const expected = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
          if (!expected) {
            console.error("[inbound-email] INBOUND_EMAIL_WEBHOOK_SECRET not set");
            return new Response("Server misconfigured", { status: 500 });
          }
          if (providedSecret !== expected) {
            return new Response("Unauthorized", { status: 401 });
          }

          // 2. Parse multipart payload
          const form = await request.formData();
          const fromRaw = (form.get("from") as string) ?? "";
          const toRaw = (form.get("to") as string) ?? "";
          const subject = (form.get("subject") as string) ?? null;
          const textBody = (form.get("text") as string) ?? null;
          const htmlBody = (form.get("html") as string) ?? null;
          const envelopeRaw = (form.get("envelope") as string) ?? null;
          const headersRaw = (form.get("headers") as string) ?? null;
          const spamScoreRaw = (form.get("spam_score") as string) ?? null;

          const envelope = safeJson(envelopeRaw);
          const headers = headersRaw ? { raw: headersRaw } : null;
          const spamScore = spamScoreRaw ? Number(spamScoreRaw) : null;

          const { name: fromName, email: fromAddress } = parseAddress(fromRaw);
          const { email: toAddress } = parseAddress(toRaw);

          if (!fromAddress || !toAddress) {
            return new Response("Missing from/to", { status: 400 });
          }

          // 3. Load admin client (handler-local; never top-level)
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          // 4. Resolve workspace by the recipient address.
          // Convention: <slug>@inbox.wekbench.com → workspace slug or buyer routing.
          // For now we leave workspace_id null when no match; a follow-up will wire routing.
          const workspaceId = await resolveWorkspaceForAddress(
            supabaseAdmin,
            toAddress,
          );

          // 5. Insert the email row first so we have an ID to scope attachments.
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from("inbound_emails")
            .insert({
              workspace_id: workspaceId,
              to_address: toAddress,
              from_address: fromAddress,
              from_name: fromName,
              subject,
              text_body: textBody,
              html_body: htmlBody,
              envelope: envelope as never,
              headers,
              spam_score: spamScore,
              attachments: [],
              status: "received",
            })
            .select("id")
            .single();

          if (insertError || !inserted) {
            console.error("[inbound-email] insert failed", insertError);
            return new Response("DB error", { status: 500 });
          }

          // 6. Upload attachments and collect metadata
          const attachmentCount = Number(form.get("attachments") ?? 0);
          const attachmentMeta: Array<{
            filename: string;
            contentType: string;
            size: number;
            path: string;
          }> = [];

          const folder = workspaceId ?? "unrouted";
          for (let i = 1; i <= attachmentCount; i++) {
            const file = form.get(`attachment${i}`);
            if (!(file instanceof File)) continue;
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `${folder}/${inserted.id}/${i}-${safeName}`;
            const { error: uploadError } = await supabaseAdmin.storage
              .from("inbound-email-attachments")
              .upload(path, file, {
                contentType: file.type || "application/octet-stream",
                upsert: false,
              });
            if (uploadError) {
              console.error("[inbound-email] attachment upload failed", uploadError);
              continue;
            }
            attachmentMeta.push({
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              size: file.size,
              path,
            });
          }

          if (attachmentMeta.length > 0) {
            await supabaseAdmin
              .from("inbound_emails")
              .update({ attachments: attachmentMeta })
              .eq("id", inserted.id);
          }

          // 7. Kick off AI extraction in the background — don't block the webhook ack.
          if (workspaceId) {
            (async () => {
              try {
                const { runExtractionForEmail } = await import(
                  "@/lib/extraction.server"
                );
                await runExtractionForEmail(inserted.id);
              } catch (err) {
                console.error("[inbound-email] extraction failed", err);
              }
            })();
          }

          return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[inbound-email] unexpected error", err);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});

function safeJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

/** Parse "Name <email@x.com>" or bare "email@x.com". */
function parseAddress(input: string): { name: string | null; email: string | null } {
  if (!input) return { name: null, email: null };
  const match = input.match(/^\s*(?:"?([^"<]*?)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?\s*$/);
  if (!match) return { name: null, email: input.trim().toLowerCase() || null };
  const name = (match[1] || "").trim() || null;
  const email = (match[2] || "").trim().toLowerCase() || null;
  return { name, email };
}

/**
 * Look up the workspace for a given inbound address.
 * Today: returns null (unrouted) — wire to a per-buyer mapping table once routing UX is built.
 */
async function resolveWorkspaceForAddress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  to: string,
): Promise<string | null> {
  const normalized = to.trim().toLowerCase();
  if (!normalized) return null;
  const { data, error } = await admin
    .from("inbound_addresses")
    .select("workspace_id, active")
    .eq("full_address", normalized)
    .maybeSingle();
  if (error) {
    console.error("[inbound-email] address lookup failed", error);
    return null;
  }
  if (!data || data.active === false) return null;
  return data.workspace_id as string;
}
