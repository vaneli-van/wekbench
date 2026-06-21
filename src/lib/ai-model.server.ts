/**
 * Server-only: the language model used for AI extraction / feedback.
 *
 * Prefers your own Anthropic (Claude) account when ANTHROPIC_API_KEY is set; otherwise
 * falls back to the Lovable AI gateway. Switching providers is therefore just a matter of
 * setting (or removing) the ANTHROPIC_API_KEY secret — no code change required.
 *
 * Optional overrides:
 *   ANTHROPIC_MODEL  (default "claude-sonnet-4-6")  — any Claude model id
 *   LOVABLE_MODEL    (default "google/gemini-3-flash-preview")
 */
import { createAnthropic } from "@ai-sdk/anthropic";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export function getExtractionModel() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6");
  }
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    throw new Error("No AI provider configured — set ANTHROPIC_API_KEY (Claude) or LOVABLE_API_KEY");
  }
  return createLovableAiGatewayProvider(lovableKey)(process.env.LOVABLE_MODEL || "google/gemini-3-flash-preview");
}

/**
 * A cheaper / faster model for lightweight text-only tasks (e.g. drafting clarification
 * questions) — keeps AI spend down vs. the full extraction model. Override with
 * ANTHROPIC_FAST_MODEL / LOVABLE_FAST_MODEL.
 */
export function getFastModel() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    return anthropic(process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001");
  }
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    throw new Error("No AI provider configured — set ANTHROPIC_API_KEY (Claude) or LOVABLE_API_KEY");
  }
  return createLovableAiGatewayProvider(lovableKey)(process.env.LOVABLE_FAST_MODEL || "google/gemini-3-flash-preview");
}

/** Which provider getExtractionModel() will use, given the current env. For diagnostics. */
export function activeAiProvider(): "anthropic" | "lovable" | "none" {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.LOVABLE_API_KEY) return "lovable";
  return "none";
}
