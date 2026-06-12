import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Mailgun Inbound Routes webhook (Fully parsed / "Forward" store-and-notify).
 *
 * Mailgun POSTs each received email as multipart/form-data with fields:
 *   recipient, sender, from, subject, body-plain, body-html, stripped-text,
 *   stripped-html, Message-Headers (JSON), attachment-count, attachment-1...,
 *   timestamp, token, signature.
 *
 * Configure a Mailgun Route to POST to:
 *   https://wekbench.com/api/public/inbound-email?secret=<INBOUND_EMAIL_WEBHOOK_SECRET>
 *
 * If MAILGUN_WEBHOOK_SIGNING_KEY is set, we additionally verify Mailgun's
 * HMAC signature (timestamp + token signed with the HTTP webhook signing key).
 */
export const Route = createFileRoute("/api/public/inbound-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Verify shared URL secret
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

          // 3. Optional Mailgun HMAC signature verification
          const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
          if (signingKey) {
            const timestamp = (form.get("timestamp") as string) ?? "";
            const token = (form.get("token") as string) ?? "";
            const signature = (form.get("signature") as string) ?? "";
            if (!timestamp || !token || !signature) {
              return new Response("Missing Mailgun signature fields", { status: 401 });
            }
            const expectedSig = createHmac("sha256", signingKey)
              .update(timestamp + token)
              .digest("hex");
            const a = Buffer.from(signature, "hex");
            const b = Buffer.from(expectedSig, "hex");
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
              return new Response("Invalid Mailgun signature", { status: 401 });
            }
          }

          // 4. Mailgun field names
          const fromRaw = (form.get("from") as string) ?? (form.get("sender") as string) ?? "";
          const toRaw = (form.get("recipient") as string) ?? (form.get("To") as string) ?? "";
          const subject = (form.get("subject") as string) ?? null;
          const textBody =
            (form.get("body-plain") as string) ??
            (form.get("stripped-text") as string) ??
            null;
          const htmlBody =
            (form.get("body-html") as string) ??
            (form.get("stripped-html") as string) ??
            null;
          const headersRaw = (form.get("Message-Headers") as string) ?? null;

          const headers = safeJson(headersRaw);
          const envelope = {
            sender: (form.get("sender") as string) ?? null,
            recipient: (form.get("recipient") as string) ?? null,
          };

          const { name: fromName, email: fromAddress } = parseAddress(fromRaw);
          const { email: toAddress } = parseAddress(toRaw);

          if (!fromAddress || !toAddress) {
            return new Response("Missing from/to", { status: 400 });
          }

          // 5. Load admin client (handler-local; never top-level)
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          // 6. Resolve workspace by the recipient address.
          const workspaceId = await resolveWorkspaceForAddress(
            supabaseAdmin,
            toAddress,
          );

          // 7. Insert the email row first so we have an ID to scope attachments.
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
              headers: headers as never,
              spam_score: null,
              attachments: [],
              status: "received",
            })
            .select("id")
            .single();

          if (insertError || !inserted) {
            console.error("[inbound-email] insert failed", insertError);
            return new Response("DB error", { status: 500 });
          }

          // 8. Upload attachments and collect metadata. Mailgun uses
          //    `attachment-count` and `attachment-1`, `attachment-2`, ...
          const attachmentCount = Number(
            form.get("attachment-count") ?? form.get("attachments") ?? 0,
          );
          const attachmentMeta: Array<{
            filename: string;
            contentType: string;
            size: number;
            path: string;
          }> = [];

          const folder = workspaceId ?? "unrouted";
          for (let i = 1; i <= attachmentCount; i++) {
            const file =
              form.get(`attachment-${i}`) ?? form.get(`attachment${i}`);
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

          // 9. Run AI extraction before acknowledging so serverless runtimes do
          //    not terminate the task after the HTTP response is sent.
          if (workspaceId) {
            try {
              const { runExtractionForEmail } = await import(
                "@/lib/extraction.server"
              );
              await runExtractionForEmail(inserted.id);
            } catch (err) {
              console.error("[inbound-email] extraction failed", err);
            }
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
  const trimmed = input.trim();
  // Prefer the angle-bracket form: "Name <email>"
  const angle = trimmed.match(/^\s*(?:"?([^"]*?)"?\s*)?<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (angle) {
    const name = (angle[1] || "").trim() || null;
    const email = (angle[2] || "").trim().toLowerCase() || null;
    return { name, email };
  }
  // Otherwise treat the whole string as a bare email address.
  const bare = trimmed.match(/^([^<>\s]+@[^<>\s]+)$/);
  if (bare) return { name: null, email: bare[1].toLowerCase() };
  return { name: null, email: trimmed.toLowerCase() || null };
}

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
