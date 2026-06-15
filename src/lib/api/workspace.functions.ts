import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VENDOR_TYPES = ["distributor", "system_integrator", "vendor"] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];

/**
 * Resolve the caller's workspace via membership (user_roles), falling back to
 * ownership. Shared by every server function that needs "the current workspace".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveWorkspaceId(supabase: any, userId: string): Promise<string | null> {
  const { data: m } = await supabase
    .from("user_roles")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (m?.workspace_id) return m.workspace_id;
  const { data: w } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  return w?.id ?? null;
}

export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) return { workspace: null };
    const { data, error } = await context.supabase
      .from("workspaces")
      .select(
        "id, name, account_type, country, vendor_types, onboarding_completed_at",
      )
      .eq("id", wsId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { workspace: data };
  });

/** Claim any pending invites matching the signed-in user's email. Call on load. */
export const claimInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_workspace_invites");
    if (error) throw new Error(error.message);
    return { claimed: Number(data ?? 0) };
  });

/** Members + pending invites for the caller's workspace. */
export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: members, error } = await context.supabase.rpc("list_workspace_members");
    if (error) throw new Error(error.message);
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    let invites: unknown[] = [];
    if (wsId) {
      const { data: inv } = await context.supabase
        .from("workspace_invites")
        .select("id, email, role, status, created_at")
        .eq("workspace_id", wsId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      invites = inv ?? [];
    }
    return { members: members ?? [], invites, currentUserId: context.userId };
  });

/** Invite a teammate by email (owner/admin only, enforced by RLS). */
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email(),
        role: z.enum(["admin", "member"]).default("member"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const email = data.email.trim().toLowerCase();
    const { error } = await context.supabase
      .from("workspace_invites")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(
        {
          workspace_id: wsId,
          email,
          role: data.role,
          status: "pending",
          invited_by: context.userId,
        } as any,
        { onConflict: "workspace_id,email" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, email };
  });

/** Cancel a pending invite. */
export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ inviteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_invites")
      .delete()
      .eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove a member (owner/admin only). Cannot remove the workspace owner. */
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("workspace_id", wsId)
      .eq("user_id", data.userId)
      .neq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true };
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
