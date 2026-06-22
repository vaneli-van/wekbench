/**
 * Server-only: OEM price-book importer.
 * Reads an uploaded price file (xlsx/csv) from the private bucket, has AI propose the
 * column mapping (which column is part/price/weight/etc + where the header row is),
 * normalizes the rows, and loads them into oem_price_items. The mapping is saved on the
 * price book so re-uploads of the next release are one click. Proven against the APC
 * "MEA R2 S2 CERT SRVC PARTNER USD" file (header row 6, ~20.9k rows).
 */
import * as XLSX from "xlsx";
import { generateText, Output } from "ai";
import { z } from "zod";

import { getFastModel } from "@/lib/ai-model.server";

export const MappingSchema = z.object({
  header_row_index: z.number(), // 0-based row that holds the column titles
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
export type ColumnMapping = z.infer<typeof MappingSchema>;

// ---- parsing helpers (mirror the validated python proof) -------------------
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function weightKg(v: unknown): number | null {
  if (v == null) return null;
  const m = String(v).match(/([\d.]+)\s*\(kilos?\)/i);
  return m ? parseFloat(m[1]) : null;
}
function dimsCm(v: unknown): string | null {
  if (v == null) return null;
  const m = String(v).match(/([\d.]+)\s*[xX]\s*([\d.]+)\s*[xX]\s*([\d.]+)\s*\(in\)/);
  if (!m) {
    // try a plain "L x W x H" with no unit (assume cm)
    const m2 = String(v).match(/([\d.]+)\s*[xX]\s*([\d.]+)\s*[xX]\s*([\d.]+)/);
    return m2 ? `${m2[1]}x${m2[2]}x${m2[3]}` : null;
  }
  const cm = m.slice(1, 4).map((x) => (parseFloat(x) * 2.54).toFixed(1));
  return `${cm[0]}x${cm[1]}x${cm[2]}`;
}
function norm(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function normalizedPart(v: unknown): string | null {
  if (v == null) return null;
  return String(v).toUpperCase().replace(/[\s\-_.]/g, "") || null;
}

/** Read a workbook buffer into an array-of-arrays (first worksheet). */
export function workbookToAoA(buf: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null }) as unknown[][];
}

/** Ask the model to locate the header row + map columns from the first ~15 rows. */
export async function proposeColumnMapping(sample: unknown[][]): Promise<ColumnMapping> {
  const preview = sample
    .slice(0, 15)
    .map((row, i) => `Row ${i}: ${row.map((c) => (c == null ? "" : String(c).slice(0, 30))).join(" | ")}`)
    .join("\n");
  const system =
    "You are mapping a supplier price file into a fixed schema. Rows are 0-indexed; columns are 0-indexed within a row. " +
    "Identify the header row (the row containing column titles like Part Number / Price), and for each target field give the 0-based COLUMN index, or null if absent. " +
    "unit_price is the vendor/partner price column; list_price only if a separate list/MSRP column exists. category is any product family / navigation-path column. Never guess a column that isn't there.";
  const userMsg = `File preview (first rows):\n${preview}`;
  try {
    const { experimental_output } = await generateText({
      model: getFastModel(),
      system,
      messages: [{ role: "user", content: userMsg }],
      experimental_output: Output.object({ schema: MappingSchema }),
    });
    return experimental_output;
  } catch {
    const { text } = await generateText({
      model: getFastModel(),
      system: system + '\n\nRespond ONLY with JSON: { "header_row_index": number, "columns": { ... 0-based indices or null ... } }',
      messages: [{ role: "user", content: userMsg }],
    });
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("Could not map columns");
    return MappingSchema.parse(JSON.parse(cleaned.slice(s, e + 1)));
  }
}

type NormItem = {
  part_number: string | null;
  normalized_part: string | null;
  model: string | null;
  description: string | null;
  category: string | null;
  unit_price: number | null;
  list_price: number | null;
  uom: string | null;
  weight_kg: number | null;
  dims: string | null;
  upc: string | null;
  supersedes: string | null;
};

/** Normalize data rows under a mapping (category is forward-filled from group headers). */
export function normalizeRows(aoa: unknown[][], mapping: ColumnMapping): NormItem[] {
  const c = mapping.columns;
  const at = (row: unknown[], idx: number | null) => (idx == null || idx >= row.length ? null : row[idx]);
  const out: NormItem[] = [];
  let lastCategory: string | null = null;
  for (let r = mapping.header_row_index + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const cat = norm(at(row, c.category));
    if (cat) lastCategory = cat; // forward-fill group header
    const part = norm(at(row, c.part_number));
    if (!part) continue; // skip non-item / spacer rows
    out.push({
      part_number: part,
      normalized_part: normalizedPart(part),
      model: norm(at(row, c.model)),
      description: norm(at(row, c.description)),
      category: lastCategory,
      unit_price: num(at(row, c.unit_price)),
      list_price: num(at(row, c.list_price)),
      uom: norm(at(row, c.uom)),
      weight_kg: weightKg(at(row, c.weight)),
      dims: dimsCm(at(row, c.dims)),
      upc: norm(at(row, c.upc)),
      supersedes: norm(at(row, c.supersedes)),
    });
  }
  return out;
}

/** Download a sample of the uploaded file and propose a mapping. */
export async function proposeMappingForFile(filePath: string): Promise<{ mapping: ColumnMapping; preview: unknown[][] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from("oem-price-books").download(filePath);
  if (error || !data) throw new Error(error?.message ?? "Could not read file");
  const buf = await data.arrayBuffer();
  const aoa = workbookToAoA(buf);
  const mapping = await proposeColumnMapping(aoa);
  return { mapping, preview: aoa.slice(0, Math.min(aoa.length, mapping.header_row_index + 4)) };
}

/**
 * Full ingest: read the file, normalize under the (confirmed) mapping, bulk-insert into
 * oem_price_items, and mark the book active with its row count + saved mapping.
 */
export async function ingestPriceBookFile(opts: {
  workspaceId: string;
  oemSupplierId: string;
  priceBookId: string;
  filePath: string;
  mapping: ColumnMapping;
  currency: string;
}): Promise<{ inserted: number; priced: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from("oem-price-books").download(opts.filePath);
  if (error || !data) throw new Error(error?.message ?? "Could not read file");
  const aoa = workbookToAoA(await data.arrayBuffer());
  const items = normalizeRows(aoa, opts.mapping);

  // Replace any previous items for this book (idempotent re-ingest).
  await supabaseAdmin.from("oem_price_items").delete().eq("price_book_id", opts.priceBookId);

  let inserted = 0;
  let priced = 0;
  const CHUNK = 1000;
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK).map((it) => {
      if (it.unit_price != null) priced++;
      return {
        workspace_id: opts.workspaceId,
        price_book_id: opts.priceBookId,
        oem_supplier_id: opts.oemSupplierId,
        currency: opts.currency,
        ...it,
        raw: null,
      };
    });
    const { error: insErr } = await supabaseAdmin.from("oem_price_items").insert(slice as never);
    if (insErr) throw new Error(`Insert failed at row ${i}: ${insErr.message}`);
    inserted += slice.length;
  }

  await supabaseAdmin
    .from("oem_price_books")
    .update({
      column_mapping: opts.mapping as never,
      row_count: inserted,
      status: "active",
    })
    .eq("id", opts.priceBookId);

  return { inserted, priced };
}
