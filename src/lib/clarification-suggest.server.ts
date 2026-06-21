/**
 * Server-only: draft RFQ-specific clarification questions with AI, grounded in a
 * bid-engineer rubric + this workspace's own past questions, and cached by a hash of the
 * line items so re-running an unchanged RFQ costs no credit. Uses the cheaper fast model.
 */
import { generateText, Output } from "ai";
import { z } from "zod";

import { getFastModel } from "./ai-model.server";

const SuggestSchema = z.object({
  questions: z.array(
    z.object({
      line_no: z.number().nullable().optional(),
      question: z.string(),
    }),
  ),
});

const RUBRIC = `You are a senior bid engineer for a B2B procurement vendor serving oil & gas / FPSO, marine, industrial, electrical and IT buyers. A buyer's RFQ has been parsed into line items. Produce the SHORT list of clarification questions a careful bid engineer would actually send the buyer for THIS specific RFQ — only where information genuinely needed to quote correctly is missing or ambiguous.

For each line, consider (and ask ONLY if the RFQ does not already state it):
- Certifications / standards: hazardous-area electrical (ATEX/IECEx — gas group IIA/IIB/IIC, temperature class, protection type Ex d/e/ia); marine & life-saving (SOLAS / MED "Wheelmark"); metallic material certs (EN 10204 3.1 vs 3.2); sour service (NACE MR0175 / ISO 15156); valves (API 6D, API 607 fire-safe); offshore lifting (DNV 2.7-1 / EN 12079); cables (IEC 60092, fire-resistant).
- Electrical: voltage / phase / frequency / hazardous-area classification.
- Process / service conditions: medium, pressure & temperature rating, oxygen service (oxygen-cleaning), SIL rating.
- Valves / wetted parts: trim and seat material, end connection, pressure class.
- Quantity / unit ambiguity (e.g. metres vs drums); whether an equivalent brand/model is acceptable.
- Delivery: feasibility of the requested date for long-lead certified items; partial delivery.
- Documentation: required test certificates / MTRs, country of origin, SDS.

RULES — important:
- Ask ONLY what is necessary to quote THIS RFQ correctly and is not already stated.
- Reference the specific line/item in each question.
- Do NOT ask generic, textbook, or "best-practice" questions, and do NOT ask about anything the RFQ already specifies.
- If a line is fully specified, produce no question for it. If nothing genuinely needs clarifying, return an empty list.
- One concise sentence per question, plain professional English.`;

export async function suggestQuestionsForQuote(
  quoteId: string,
): Promise<{ created: number; cached: boolean; clarificationId: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: q } = await supabaseAdmin
    .from("quotes")
    .select("id, workspace_id, rfq_id, title")
    .eq("id", quoteId)
    .single();
  if (!q) throw new Error("Quote not found");

  const { data: items } = await supabaseAdmin
    .from("quote_line_items")
    .select("line_no, description, brand, model, qty, unit")
    .eq("quote_id", quoteId)
    .order("line_no");
  const lines = items ?? [];
  if (lines.length === 0) return { created: 0, cached: false, clarificationId: null };

  // Find or create the open clarification for this quote.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clar: any;
  const { data: existing } = await supabaseAdmin
    .from("quote_clarifications")
    .select("id, suggest_hash")
    .eq("quote_id", quoteId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    clar = existing;
  } else {
    const { data: created } = await supabaseAdmin
      .from("quote_clarifications")
      .insert({ workspace_id: q.workspace_id, quote_id: quoteId, rfq_id: q.rfq_id ?? null, status: "draft" })
      .select("id, suggest_hash")
      .single();
    clar = created;
  }
  if (!clar) throw new Error("Could not create clarification");

  const contentHash = hashLines(lines);

  // Cache: same line items already suggested → reuse, no AI call.
  const { count: agentCount } = await supabaseAdmin
    .from("clarification_questions")
    .select("id", { count: "exact", head: true })
    .eq("clarification_id", clar.id)
    .eq("source", "agent");
  if (clar.suggest_hash === contentHash && (agentCount ?? 0) > 0) {
    return { created: 0, cached: true, clarificationId: clar.id };
  }

  // Few-shot grounding: this workspace's own recent agent questions (cheap DB read).
  const { data: examples } = await supabaseAdmin
    .from("clarification_questions")
    .select("question")
    .eq("workspace_id", q.workspace_id)
    .eq("source", "agent")
    .order("created_at", { ascending: false })
    .limit(8);

  const itemsText = lines
    .map(
      (li) =>
        `Line ${li.line_no}: ${li.description ?? ""}` +
        `${li.brand ? ` | brand ${li.brand}` : ""}${li.model ? ` | model ${li.model}` : ""}` +
        ` | qty ${li.qty ?? "?"} ${li.unit ?? ""}`.trimEnd(),
    )
    .join("\n");
  const exampleText = (examples ?? []).map((e) => `- ${e.question}`).join("\n");
  const userMsg =
    `RFQ: ${q.title ?? ""}\n\nLine items:\n${itemsText}` +
    (exampleText
      ? `\n\nExamples of clarification questions this vendor has asked before (mirror this style; reuse only if genuinely relevant to a line above):\n${exampleText}`
      : "");

  const model = getFastModel();
  let questions: Array<{ line_no?: number | null; question: string }> = [];
  try {
    const { experimental_output } = await generateText({
      model,
      system: RUBRIC,
      messages: [{ role: "user", content: userMsg }],
      experimental_output: Output.object({ schema: SuggestSchema }),
    });
    questions = experimental_output.questions ?? [];
  } catch {
    const { text } = await generateText({
      model,
      system: RUBRIC + `\n\nRespond ONLY with JSON: { "questions": [ { "line_no": number|null, "question": string } ] }`,
      messages: [{ role: "user", content: userMsg }],
    });
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      try {
        const parsed = JSON.parse(cleaned.slice(s, e + 1));
        questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      } catch {
        questions = [];
      }
    }
  }

  // Refresh: clear prior un-answered agent suggestions, insert the fresh set.
  await supabaseAdmin
    .from("clarification_questions")
    .delete()
    .eq("clarification_id", clar.id)
    .eq("source", "agent")
    .is("buyer_answer", null);

  let created = 0;
  const rows = questions
    .filter((x) => x.question && x.question.trim())
    .map((x, idx) => ({
      clarification_id: clar.id,
      workspace_id: q.workspace_id,
      question: x.question.trim(),
      line_no: x.line_no ?? null,
      source: "agent",
      included: true,
      sort: idx,
    }));
  if (rows.length) {
    await supabaseAdmin.from("clarification_questions").insert(rows);
    created = rows.length;
  }

  await supabaseAdmin
    .from("quote_clarifications")
    .update({ suggest_hash: contentHash, suggested_at: new Date().toISOString() })
    .eq("id", clar.id);

  if (created > 0) {
    await supabaseAdmin.from("workspace_agent_memory").insert({
      workspace_id: q.workspace_id,
      kind: "clarification_suggestion",
      quote_id: quoteId,
      rfq_id: q.rfq_id ?? null,
      title: q.title ?? null,
      summary: `${created} clarification question(s) suggested`,
      facts: { questions: rows.map((r) => r.question) } as never,
    });
  }

  return { created, cached: false, clarificationId: clar.id };
}

function hashLines(
  lines: Array<{
    line_no: number | null;
    description: string | null;
    brand: string | null;
    model: string | null;
    qty: number | null;
    unit: string | null;
  }>,
): string {
  const s = lines.map((l) => `${l.line_no}|${l.description}|${l.brand}|${l.model}|${l.qty}|${l.unit}`).join("\n");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
