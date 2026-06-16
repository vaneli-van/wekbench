// Minimal transactional email sender. SERVER ONLY.
//
// Uses Resend's HTTP API (https://resend.com). Configure in the server env:
//   RESEND_API_KEY  — your Resend API key (required to actually send)
//   EMAIL_FROM      — verified sender, e.g. "Western Premium <quotes@yourdomain.com>"
//
// If RESEND_API_KEY is not set, send() is a no-op that reports skipped, so the
// rest of the app works fine before email is configured.
import process from "node:process";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendEmailResult = { sent: boolean; skipped?: string; error?: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, skipped: "RESEND_API_KEY not configured" };
  const from = process.env.EMAIL_FROM || "Wekbench <onboarding@resend.dev>";
  const to = Array.isArray(input.to) ? input.to : [input.to];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { sent: false, error: `Email API ${res.status}: ${t.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/** Escape a string for safe inclusion in HTML email bodies. */
export function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
