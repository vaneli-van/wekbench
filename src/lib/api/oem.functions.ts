import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveWorkspaceId } from "./workspace.functions";

const mappingZod = z.object({
  header_row_index: z.number(),
  columns: z.object({
    part_number: z.number().nullable(),
    model: z.number().nullable(),
    description: z.number().nullable(),
    category: z.number().nullable(),
    unit_price: z.number().nullable(),
    list_price: z.number().nullable(),
    uom: z.number().nullable(),
    weight: z.number().nullable(),
    dims: z.number().nullable(),
    upc: z.number().nullable(),
    supersedes: z.number().nullable(),
  }),
});

async function wsId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<string> {
  const id = await resolveWorkspaceId(supabase, userId);
  if (!id) throw new Error("No workspace");
  return id;
}

/* ---------- OEM suppliers ---------- */

export const createOemSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        brand: z.string().max(120).optional(),
        region: z.string().max(120).optional(),
        partnerId: z.string().max(120).optional(),
        relationship: z.enum(["authorized_distributor", "certified_partner", "reseller"]).optional(),
        currency: z.string().max(8).optional(),
        contactName: z.string().max(200).optional(),
        contactEmail: z.string().max(200).optional(),
        contactPhone: z.string().max(64).optional(),
        portalUrl: z.string().max(500).optional(),
        notes: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const brand = (data.brand ?? data.name).toLowerCase().replace(/[^a-z0-9]/g, "");
    const { data: row, error } = await context.supabase
      .from("oem_suppliers")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id,
        name: data.name,
        brand,
        region: data.region ?? null,
        partner_id: data.partnerId ?? null,
        relationship: data.relationship ?? "authorized_distributor",
        currency: data.currency ?? "USD",
        primary_contact_name: data.contactName ?? null,
        primary_contact_email: data.contactEmail ?? null,
        primary_contact_phone: data.contactPhone ?? null,
        portal_url: data.portalUrl ?? null,
        notes: data.notes ?? null,
      } as any)
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create OEM");
    return { id: row.id as string };
  });

export const listOemSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("oem_suppliers")
      .select(
        "id, name, brand, region, partner_id, relationship, currency, primary_contact_name, primary_contact_email, portal_url, created_at",
      )
      .order("name");
    if (error) throw new Error(error.message);
    // attach price-book + item counts
    const suppliers = data ?? [];
    const ids = suppliers.map((s) => s.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let books: any[] = [];
    if (ids.length) {
      const { data: bk } = await context.supabase
        .from("oem_price_books")
        .select("id, oem_supplier_id, label, status, row_count, currency, effective_to, uploaded_at")
        .in("oem_supplier_id", ids)
        .order("uploaded_at", { ascending: false });
      books = bk ?? [];
    }
    return { suppliers, books };
  });

/* ---------- Price books ---------- */

export const createPriceBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        oemSupplierId: z.string().uuid(),
        label: z.string().min(1).max(200),
        scopeNote: z.string().max(500).optional(),
        currency: z.string().max(8).optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("oem_price_books")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id,
        oem_supplier_id: data.oemSupplierId,
        label: data.label,
        scope_note: data.scopeNote ?? null,
        currency: data.currency ?? "USD",
        effective_from: data.effectiveFrom ?? null,
        effective_to: data.effectiveTo ?? null,
        status: "draft",
      } as any)
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create price book");
    return { id: row.id as string, uploadPrefix: `${workspace_id}/${row.id}` };
  });

/** Propose a column mapping from the uploaded file (AI). */
export const proposePriceBookMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ priceBookId: z.string().uuid(), filePath: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    if (!data.filePath.startsWith(`${workspace_id}/`)) throw new Error("Invalid file path");
    const { data: book } = await context.supabase
      .from("oem_price_books")
      .select("id")
      .eq("id", data.priceBookId)
      .single();
    if (!book) throw new Error("Price book not found");
    const { proposeMappingForFile } = await import("@/lib/oem/import.server");
    const { mapping, preview } = await proposeMappingForFile(data.filePath);
    return { mapping, preview };
  });

/** Ingest the file under the confirmed mapping. */
export const ingestPriceBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        priceBookId: z.string().uuid(),
        filePath: z.string().min(3),
        mapping: mappingZod,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    if (!data.filePath.startsWith(`${workspace_id}/`)) throw new Error("Invalid file path");
    const { data: book } = await context.supabase
      .from("oem_price_books")
      .select("id, oem_supplier_id, currency")
      .eq("id", data.priceBookId)
      .single();
    if (!book) throw new Error("Price book not found");
    // persist the file path on the book
    await context.supabase
      .from("oem_price_books")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ source_file_path: data.filePath } as any)
      .eq("id", data.priceBookId);

    const { ingestPriceBookFile } = await import("@/lib/oem/import.server");
    const res = await ingestPriceBookFile({
      workspaceId: workspace_id,
      oemSupplierId: book.oem_supplier_id,
      priceBookId: data.priceBookId,
      filePath: data.filePath,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapping: data.mapping as any,
      currency: book.currency,
    });
    try {
      const { emitProductEvent } = await import("@/lib/telemetry.server");
      await emitProductEvent(context.supabase, {
        workspaceId: workspace_id,
        userId: context.userId,
        event: "price_book_ingested",
        props: { inserted: res.inserted, priced: res.priced },
      });
    } catch {
      /* best-effort */
    }
    return res;
  });

export const listPriceBookItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ priceBookId: z.string().uuid(), limit: z.number().int().max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("oem_price_items")
      .select("part_number, model, description, category, unit_price, currency, uom, weight_kg, dims, upc")
      .eq("price_book_id", data.priceBookId)
      .order("part_number")
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

/* ---------- Discount schedules ---------- */

export const addDiscountSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        oemSupplierId: z.string().uuid(),
        category: z.string().max(160).optional(),
        discountPct: z.number().min(0).max(100),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspace_id = await wsId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("oem_discount_schedules")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        workspace_id,
        oem_supplier_id: data.oemSupplierId,
        category: data.category?.trim() || "ALL",
        discount_pct: data.discountPct,
        basis: "off_list",
        effective_from: data.effectiveFrom ?? null,
        effective_to: data.effectiveTo ?? null,
        notes: data.notes ?? null,
      } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDiscountSchedules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ oemSupplierId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("oem_discount_schedules")
      .select("id, category, discount_pct, basis, effective_from, effective_to, notes")
      .eq("oem_supplier_id", data.oemSupplierId)
      .order("category");
    if (error) throw new Error(error.message);
    return { schedules: rows ?? [] };
  });
