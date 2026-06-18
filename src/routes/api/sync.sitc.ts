import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

// Secured ingestion endpoint for the SITC catalogue. The sync job (GitHub Action) pulls
// the FTP file and POSTs batches of rows here; this endpoint writes them with the app's
// own service-role credentials — so the database key never has to leave Lovable Cloud.
//
//   POST /api/sync/sitc?key=<SITC_SYNC_SECRET>   body: { rows: [ {...}, ... ] }
//
// App env (Lovable Cloud → Secrets): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
// SITC_SYNC_SECRET (falls back to CRON_SECRET if you'd rather reuse that one).

const MAX_BATCH = 1000;

function authorized(request: Request): boolean {
  const secret = process.env.SITC_SYNC_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const u = new URL(request.url);
  const key = u.searchParams.get("key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return key === secret;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanRow(r: any) {
  return {
    sitc_id: String(r.sitc_id),
    sku: r.sku ?? null,
    brand: r.brand ?? null,
    name: r.name ?? null,
    short_description: r.short_description ?? null,
    stock: r.stock ?? null,
    price: r.price ?? null,
    cost: r.cost ?? null,
    currency: r.currency ?? "GBP",
    ean: r.ean ?? null,
    image_url: r.image_url ?? null,
    category: r.category ?? null,
    sub_category: r.sub_category ?? null,
    unspsc: r.unspsc ?? null,
    distributors: Array.isArray(r.distributors) ? r.distributors : [],
    updated_at: new Date().toISOString(),
  };
}

async function handle(request: Request): Promise<Response> {
  if (!authorized(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ ok: false, error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const rawRows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rawRows) return Response.json({ ok: false, error: "expected { rows: [...] }" }, { status: 400 });
  if (rawRows.length > MAX_BATCH) return Response.json({ ok: false, error: `batch too large (max ${MAX_BATCH})` }, { status: 400 });

  // De-dupe within the batch (the feed lists products on multiple rows; the same
  // sitc_id twice in one upsert is a hard error). Last write wins.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map<string, any>();
  for (const r of rawRows) {
    if (r?.sitc_id == null || String(r.sitc_id) === "") continue;
    byId.set(String(r.sitc_id), cleanRow(r));
  }
  const rows = Array.from(byId.values());
  if (rows.length === 0) return Response.json({ ok: true, upserted: 0 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await supabase.from("sitc_catalogue").upsert(rows, { onConflict: "sitc_id" });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, upserted: rows.length });
}

export const Route = createFileRoute("/api/sync/sitc")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
    },
  },
});
