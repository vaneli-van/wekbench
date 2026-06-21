/**
 * Server-only: distill a buyer's clarification responses into structured feedback
 * with AI, cache it on the clarification, and seed the per-workspace agent memory.
 * Mirrors extraction.server.ts (Lovable AI gateway + structured output).
 */
import { generateText, Output } from "ai";
import { z } from "zod";

import { getExtractionModel } from "./ai-model.server";

const FeedbackSchema = z.object({
  summary: z.string(),
  confirmed_specs: z.array(z.string()),
  new_requirements: z.array(z.string()),
  changes: z.array(z.string()),
  risks: z.array(z.string()),
  next_action: z.string(),
});
export type ClarificationFeedback = z.infer<typeof FeedbackSchema>;

const SYSTEM_PROMPT = `You are a bid engineer for a B2B procurement vendor. The buyer has responded to clarification questions on a quote. Distill their feedback into structured, actionable points for the salesperson preparing the quote. Be precise and concise; never invent details. Use empty arrays where nothing applies.
- summary: one or two sentences capturing what the buyer confirmed or changed
- confirmed_specs: specifications/requirements the buyer confirmed (voltage, certification, model, material, etc.)
- new_requirements: any new requirements or constraints the buyer introduced
- changes: quantity or item changes the buyer requested
- risks: anything that could cause a wrong quote or delivery (ambiguity, missing info, tight deadline, compliance gap)
- next_action: the single most important next step for the vendor`;

export async function extractClarificationFeedback(clarificationId: string): Promise<ClarificationFeedback> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: c } = await supabaseAdmin
    .from("quote_clarifications")
    .select("id, quote_id, workspace_id, buyer_comment, answered_by")
    .eq("id", clarificationId)
    .single();
  if (!c) throw new Error("Clarification not found");
  const { data: q } = await supabaseAdmin
    .from("quotes")
    .select("title, quote_number, rfq_id")
    .eq("id", c.quote_id)
    .single();

  const [questionsRes, changesRes, messagesRes] = await Promise.all([
    supabaseAdmin.from("clarification_questions").select("question, buyer_answer").eq("clarification_id", clarificationId).eq("included", true),
    supabaseAdmin.from("clarification_changes").select("kind, line_no, payload").eq("clarification_id", clarificationId),
    supabaseAdmin.from("clarification_messages").select("author, author_name, body").eq("clarification_id", clarificationId).order("created_at"),
  ]);

  const lines: string[] = [`Quote: ${q?.title ?? q?.quote_number ?? ""}`];
  if (c.buyer_comment) lines.push(`Buyer overall note: ${c.buyer_comment}`);
  lines.push("", "Questions and buyer answers:");
  for (const qq of questionsRes.data ?? []) {
    lines.push(`- Q: ${qq.question}`, `  A: ${qq.buyer_answer ?? "(no answer)"}`);
  }
  if ((changesRes.data ?? []).length) {
    lines.push("", "Buyer-proposed changes:");
    for (const ch of changesRes.data ?? []) {
      lines.push(`- ${ch.kind}${ch.line_no ? ` (line ${ch.line_no})` : ""}: ${JSON.stringify(ch.payload)}`);
    }
  }
  if ((messagesRes.data ?? []).length) {
    lines.push("", "Follow-up conversation:");
    for (const m of messagesRes.data ?? []) {
      lines.push(`- ${m.author}${m.author_name ? ` (${m.author_name})` : ""}: ${m.body}`);
    }
  }
  const input = lines.join("\n").slice(0, 16000);

  const model = getExtractionModel();

  let feedback: ClarificationFeedback;
  try {
    const { experimental_output } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: input }],
      experimental_output: Output.object({ schema: FeedbackSchema }),
    });
    feedback = experimental_output;
  } catch {
    const { text } = await generateText({
      model,
      system:
        SYSTEM_PROMPT +
        "\n\nRespond ONLY with a single JSON object — no prose, no markdown fences:\n" +
        "{ summary: string, confirmed_specs: string[], new_requirements: string[], changes: string[], risks: string[], next_action: string }",
      messages: [{ role: "user", content: input }],
    });
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("Model returned no JSON object");
    feedback = FeedbackSchema.parse(JSON.parse(cleaned.slice(s, e + 1)));
  }

  await supabaseAdmin
    .from("quote_clarifications")
    .update({ ai_feedback: feedback as never, ai_feedback_at: new Date().toISOString() })
    .eq("id", clarificationId);

  // Seed the per-workspace agent memory so similar future RFQs can draw on it.
  await supabaseAdmin.from("workspace_agent_memory").insert({
    workspace_id: c.workspace_id,
    kind: "clarification_feedback",
    quote_id: c.quote_id,
    rfq_id: q?.rfq_id ?? null,
    title: q?.title ?? q?.quote_number ?? null,
    summary: feedback.summary,
    facts: feedback as never,
  });

  return feedback;
}
