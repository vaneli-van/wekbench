import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ emailId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // ensure the caller owns the email's workspace
    const { data: email, error } = await context.supabase
      .from("inbound_emails")
      .select("id, workspace_id")
      .eq("id", data.emailId)
      .maybeSingle();
    if (error || !email) throw new Error("Email not found or access denied");

    const { runExtractionForEmail } = await import("@/lib/extraction.server");
    return await runExtractionForEmail(data.emailId);
  });
