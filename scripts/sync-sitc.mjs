// Stream-parse SITC's Products.csv and load it into the sitc_catalogue table.
// Run by .github/workflows/sitc-sync.yml after the workflow downloads the file over FTP.
//
// TWO MODES (auto-selected from env):
//   • Endpoint mode (recommended): set WEKBENCH_SYNC_URL (+ SITC_SYNC_SECRET). POSTs
//     batches to the app's /api/sync/sitc, which writes them with the app's own DB key —
//     so no Supabase service key is needed in GitHub.
//   • Direct mode: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to upsert straight to the DB.
//
// Other env:
//   SITC_FILE      (default "Products.csv")
//   SITC_MAX_ROWS  (optional cap for a test run; blank = full catalogue)
//
// The feed lists each product on multiple rows, so we de-dupe by sitc_id within each
// batch (the same id twice in one upsert is a hard error). Memory-safe streaming.
import { createReadStream } from "node:fs";
import process from "node:process";
import { parse } from "csv-parse";

const FILE = process.env.SITC_FILE || "Products.csv";
const MAX_ROWS = process.env.SITC_MAX_ROWS ? parseInt(process.env.SITC_MAX_ROWS, 10) : Infinity;
const BATCH = 500;

const SYNC_URL = process.env.WEKBENCH_SYNC_URL;
const SYNC_SECRET = process.env.SITC_SYNC_SECRET || process.env.CRON_SECRET;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const mode = SYNC_URL ? "endpoint" : SB_URL && SB_KEY ? "direct" : null;
if (!mode) {
  console.error("Configure either WEKBENCH_SYNC_URL (+SITC_SYNC_SECRET) or SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
console.log("sync mode:", mode);

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function clean(v) {
  return v == null ? null : String(v).replace(/\r|\n/g, " ").trim() || null;
}
function distributors(rec) {
  const out = [];
  for (const i of ["1st", "2nd", "3rd", "4th", "5th"]) {
    const name = rec[`${i}CheapestDistributorName`];
    const price = num(rec[`${i}CheapestDistributorPrice`]);
    if (!name && price == null) continue;
    out.push({
      id: rec[`${i}CheapestDistributorID`] || null,
      name: clean(name),
      price,
      stock: num(rec[`${i}CheapestDistributorStock`]),
      deliveryCost: num(rec[`${i}CheapestDistributorDeliveryCost`]),
      sku: rec[`${i}CheapestDistributorSKU`] || null,
    });
  }
  return out;
}
// Best-effort dimension parse from free-text specs: finds the first "L x W x H (unit)"
// pattern and normalises to cm. Conservative — returns nulls when nothing clear is found.
function parseDims(text) {
  if (!text) return { length_cm: null, width_cm: null, height_cm: null };
  const m = String(text).match(
    /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?/i,
  );
  if (!m) return { length_cm: null, width_cm: null, height_cm: null };
  const unit = (m[4] || "cm").toLowerCase();
  const f = unit === "mm" ? 0.1 : unit === "m" ? 100 : 1; // → cm
  const conv = (v) => {
    const n = Number(v) * f;
    return Number.isFinite(n) && n > 0 && n < 100000 ? Number(n.toFixed(2)) : null;
  };
  return { length_cm: conv(m[1]), width_cm: conv(m[2]), height_cm: conv(m[3]) };
}

function mapRow(rec) {
  const specs = clean(rec.Specifications);
  const dims = parseDims(specs);
  return {
    sitc_id: String(rec.ID),
    sku: clean(rec.SKU),
    brand: clean(rec.BrandName),
    name: clean(rec.Name),
    short_description: clean(rec.ShortDescription),
    stock: num(rec.Stock),
    price: num(rec.Price),
    cost: num(rec.Cost),
    currency: "GBP",
    ean: clean(rec.EANCodes),
    image_url: clean(rec.MainImageURL),
    category: clean(rec.CategoryName),
    sub_category: clean(rec.SubCategoryName),
    unspsc: clean(rec.UNSPSC),
    distributors: distributors(rec),
    weight_kg: num(rec.Weight),
    specs: specs ? specs.slice(0, 2000) : null,
    length_cm: dims.length_cm,
    width_cm: dims.width_cm,
    height_cm: dims.height_cm,
  };
}

// Lazily create the direct-mode client only when needed.
let sb = null;
async function directUpsert(rows) {
  if (!sb) {
    const { createClient } = await import("@supabase/supabase-js");
    sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  }
  const { error } = await sb.from("sitc_catalogue").upsert(rows, { onConflict: "sitc_id" });
  if (error) throw new Error("upsert failed: " + error.message);
}
async function endpointUpsert(rows) {
  const res = await fetch(`${SYNC_URL.replace(/\/$/, "")}/api/sync/sitc?key=${encodeURIComponent(SYNC_SECRET || "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`endpoint ${res.status}: ${t.slice(0, 200)}`);
  }
}

let pending = new Map(); // sitc_id -> row (de-dupes within a batch)
let total = 0;
async function flush() {
  if (pending.size === 0) return;
  const rows = Array.from(pending.values());
  pending = new Map();
  if (mode === "endpoint") await endpointUpsert(rows);
  else await directUpsert(rows);
  total += rows.length;
  if (total % 5000 < BATCH) console.log("upserted", total);
}

const parser = createReadStream(FILE).pipe(
  parse({ columns: true, relax_quotes: true, relax_column_count: true, skip_records_with_error: true }),
);
let scanned = 0;
for await (const rec of parser) {
  if (scanned >= MAX_ROWS) break;
  scanned += 1;
  if (!rec.ID) continue;
  pending.set(String(rec.ID), mapRow(rec));
  if (pending.size >= BATCH) await flush();
}
await flush();
console.log("DONE — rows upserted:", total);
