import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

/** Client-callable telemetry: record an adoption event (best-effort). */
export const trackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        event: z.string().min(1).max(64),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: z.record(z.any()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const wsId = await resolveWorkspaceId(context.supabase, context.userId);
      await context.supabase.from("product_events").insert({
        workspace_id: wsId ?? null,
        user_id: context.userId,
        event: data.event,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: (data.props ?? {}) as any,
      });
    } catch (e) {
      console.error("[telemetry] trackEvent failed", e);
    }
    return { ok: true };
  });
