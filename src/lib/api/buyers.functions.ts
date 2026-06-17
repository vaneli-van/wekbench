import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

/** Find a buyer by name within a workspace, creating it if absent. Returns id. */
export async function findOrCreateBuyer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  workspaceId: string,
  name: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: Record<string, any>,
): Promise<string | null> {
  const n = (name ?? "").trim();
  if (!n) return null;
  const { data: existing } = await supabase
    .from("buyers")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", n)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("buyers")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ workspace_id: workspaceId, name: n, ...(extra ?? {}) } as any)
    .select("id")
    .single();
  if (error || !created) {
    // Likely a race on the unique (workspace_id, name) — re-fetch.
    const { data: again } = await supabase
      .from("buyers")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", n)
      .maybeSingle();
    return again?.id ?? null;
  }
  return created.id;
}

export const listBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: buyers, error } = await supabase
      .from("buyers")
      .select("id, name, contact_name, email, billing_email, phone, sector")
      .order("name");
    if (error) throw new Error(error.message);
    const [{ data: quotes }, { data: orders }, { data: rfqs }] = await Promise.all([
      supabase.from("quotes").select("buyer_id, total"),
      supabase.from("orders").select("buyer_id, value"),
      supabase.from("rfqs").select("buyer_id, status"),
    ]);
    const qCount: Record<string, number> = {};
    const oCount: Record<string, number> = {};
    const lifetime: Record<string, number> = {};
    const openRfqs: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const q of (quotes ?? []) as any[]) if (q.buyer_id) qCount[q.buyer_id] = (qCount[q.buyer_id] ?? 0) + 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const o of (orders ?? []) as any[]) if (o.buyer_id) {
      oCount[o.buyer_id] = (oCount[o.buyer_id] ?? 0) + 1;
      lifetime[o.buyer_id] = (lifetime[o.buyer_id] ?? 0) + Number(o.value ?? 0);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (rfqs ?? []) as any[]) if (r.buyer_id && r.status === "open") openRfqs[r.buyer_id] = (openRfqs[r.buyer_id] ?? 0) + 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((buyers ?? []) as any[]).map((b) => ({
      ...b,
      quotes: qCount[b.id] ?? 0,
      orders: oCount[b.id] ?? 0,
      openRfqs: openRfqs[b.id] ?? 0,
      lifetimeValue: lifetime[b.id] ?? 0,
    }));
    return { buyers: rows };
  });

export const createBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1),
        contactName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        billingEmail: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        sector: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const id = await findOrCreateBuyer(context.supabase, wsId, data.name, {
      contact_name: data.contactName || null,
      email: data.email || null,
      billing_email: data.billingEmail || null,
      phone: data.phone || null,
      sector: data.sector || null,
    });
    if (!id) throw new Error("Could not create buyer");
    return { id, name: data.name.trim() };
  });

export const updateBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z
          .object({
            name: z.string().min(1).optional(),
            contact_name: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            billing_email: z.string().nullable().optional(),
            phone: z.string().nullable().optional(),
            sector: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
          })
          .strict(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await context.supabase.from("buyers").update(data.patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- buyer contracts & agreed pricing ---------- */

export const listBuyerContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ buyerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: contracts, error } = await context.supabase
      .from("buyer_contracts")
      .select("id, title, reference, currency, starts_at, ends_at, status, notes, created_at")
      .eq("buyer_id", data.buyerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: items } = await context.supabase
      .from("buyer_contract_items")
      .select("id, contract_id, description, brand, model, mpn, unit, agreed_price, currency, min_qty")
      .eq("buyer_id", data.buyerId)
      .order("created_at", { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byContract: Record<string, any[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const it of (items ?? []) as any[]) (byContract[it.contract_id] ??= []).push(it);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((contracts ?? []) as any[]).map((c) => ({ ...c, items: byContract[c.id] ?? [] }));
    return { contracts: rows };
  });

export const createBuyerContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        buyerId: z.string().uuid(),
        title: z.string().min(1),
        reference: z.string().optional(),
        currency: z.string().optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const { data: created, error } = await context.supabase
      .from("buyer_contracts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: wsId,
        buyer_id: data.buyerId,
        title: data.title,
        reference: data.reference || null,
        currency: data.currency || null,
        starts_at: data.startsAt || null,
        ends_at: data.endsAt || null,
        notes: data.notes || null,
      } as any)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create contract");
    return { id: created.id as string };
  });

export const addContractItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        contractId: z.string().uuid(),
        buyerId: z.string().uuid(),
        description: z.string().min(1),
        brand: z.string().optional(),
        model: z.string().optional(),
        mpn: z.string().optional(),
        unit: z.string().optional(),
        agreedPrice: z.number().optional(),
        currency: z.string().optional(),
        minQty: z.number().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const wsId = await resolveWorkspaceId(context.supabase, context.userId);
    if (!wsId) throw new Error("No workspace found");
    const { error } = await context.supabase
      .from("buyer_contract_items")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id: wsId,
        contract_id: data.contractId,
        buyer_id: data.buyerId,
        description: data.description,
        brand: data.brand || null,
        model: data.model || null,
        mpn: data.mpn || null,
        unit: data.unit || null,
        agreed_price: data.agreedPrice ?? null,
        currency: data.currency || null,
        min_qty: data.minQty ?? null,
      } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteContractItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyer_contract_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBuyerContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyer_contracts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
