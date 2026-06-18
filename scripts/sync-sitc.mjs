// Stream-parse SITC's Products.csv and upsert it into the `sitc_catalogue` table.
// Run by .github/workflows/sitc-sync.yml after the workflow downloads the file over FTP.
//
// Env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required — service role bypasses RLS)
//   SITC_FILE      (default "Products.csv")
//   SITC_MAX_ROWS  (optional cap, for a test run; blank = full catalogue)
//
// Memory-safe: streams the file and upserts in batches, so the 100MB+ feed never sits
// in memory at once.
import { createReadStream } from "node:fs";
import process from "node:process";
import { parse } from "csv-parse";
import { createClient } from "@supabase/supabase-js";

const FILE = process.env.SITC_FILE || "Products.csv";
const MAX_ROWS = process.env.SITC_MAX_ROWS ? parseInt(process.env.SITC_MAX_ROWS, 10) : Infinity;
const BATCH = 500;

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function distributors(rec) {
  const out = [];
  for (const i of ["1st", "2nd", "3rd", "4th", "5th"]) {
    const name = rec[`${i}CheapestDistributorName`];
    const price = num(rec[`${i}CheapestDistributorPrice`]);
    if (!name && price == null) continue;
    out.push({
      id: rec[`${i}CheapestDistributorID`] || null,
      name: name || null,
      price,
      stock: num(rec[`${i}CheapestDistributorStock`]),
      deliveryCost: num(rec[`${i}CheapestDistributorDeliveryCost`]),
      sku: rec[`${i}CheapestDistributorSKU`] || null,
    });
  }
  return out;
}

function mapRow(rec) {
  return {
    sitc_id: String(rec.ID),
    sku: rec.SKU || null,
    brand: rec.BrandName || null,
    name: rec.Name || null,
    short_description: rec.ShortDescription || null,
    stock: num(rec.Stock),
    price: num(rec.Price),
    cost: num(rec.Cost),
    currency: "GBP",
    ean: rec.EANCodes || null,
    image_url: rec.MainImageURL || null,
    category: rec.CategoryName || null,
    sub_category: rec.SubCategoryName || null,
    unspsc: rec.UNSPSC || null,
    distributors: distributors(rec),
    updated_at: new Date().toISOString(),
  };
}

let batch = [];
let total = 0;

async function flush() {
  if (!batch.length) return;
  const rows = batch;
  batch = [];
  const { error } = await sb.from("sitc_catalogue").upsert(rows, { onConflict: "sitc_id" });
  if (error) throw new Error(`upsert failed at ${total}: ${error.message}`);
  total += rows.length;
  if (total % 5000 < BATCH) console.log("upserted", total);
}

const parser = createReadStream(FILE).pipe(
  parse({ columns: true, relax_quotes: true, relax_column_count: true, skip_records_with_error: true }),
);

for await (const rec of parser) {
  if (total + batch.length >= MAX_ROWS) break;
  if (!rec.ID) continue;
  batch.push(mapRow(rec));
  if (batch.length >= BATCH) await flush();
}
await flush();
console.log("DONE — total upserted:", total);
