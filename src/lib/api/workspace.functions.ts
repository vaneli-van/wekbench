import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VENDOR_TYPES = ["distributor", "system_integrator", "vendor"] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];

export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workspaces")
      .select(
        "id, name, account_type, country, vendor_types, onboarding_completed_at",
      )
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { workspace: data };
  });

export const updateWorkspaceVendorTypes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ vendorTypes: z.array(z.enum(VENDOR_TYPES)).min(1).max(3) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const unique = Array.from(new Set(data.vendorTypes));
    const { error } = await context.supabase
      .from("workspaces")
      .update({ vendor_types: unique })
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, vendorTypes: unique };
  });
