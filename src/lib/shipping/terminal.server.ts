// Terminal Africa (TShip) shipping adapter. SERVER ONLY — never import from client code.
//
// Auth: a single secret key sent as `Authorization: Bearer <key>`.
//   Required env: TERMINAL_AFRICA_API_KEY
//
// Terminal's rate flow is a documented chain, not a single call:
//   1. POST /addresses   -> create pickup address   (returns address_id "AD-…")
//   2. POST /addresses   -> create delivery address
//   3. POST /packaging   -> create a box            (returns packaging_id "PA-…")
//   4. POST /parcels     -> create parcel w/ items  (returns parcel_id "PC-…")
//   5. POST /rates/shipment -> { pickup_address, delivery_address, parcel_id }
//                            -> data.rates[] across DHL Express / FedEx / UPS / Aramex
//
// The normalized rate shape mirrors the `data.rates[]` objects in Terminal's docs
// (amount, carrier_name, carrier_logo, currency, delivery_time, delivery_eta,
// rate_id, includes_insurance). Field names are kept in one place so they're easy
// to tune against the live API once the key is in.
import process from "node:process";

import type { Address, Parcel, ShippingAdapter, ShippingRate, ShippingRateInput } from "./types";

const BASE = "https://api.terminal.africa/v1";

function getApiKey(): string {
  const key = process.env.TERMINAL_AFRICA_API_KEY;
  if (!key) {
    throw new Error(
      "Terminal Africa credentials missing. Set TERMINAL_AFRICA_API_KEY in the server environment.",
    );
  }
  return key;
}

async function call<T = unknown>(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: T }
    | null;
  if (!res.ok || !json || json.status === false) {
    throw new Error(json?.message || `Terminal Africa ${method} ${path} failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

function splitName(name?: string): { first: string; last: string } {
  const n = (name ?? "").trim();
  if (!n) return { first: "Wekbench", last: "Buyer" };
  const parts = n.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

async function createAddress(a: Address): Promise<string> {
  const { first, last } = splitName(a.name);
  const data = await call<{ address_id?: string; id?: string }>("/addresses", "POST", {
    first_name: first,
    last_name: last,
    email: a.email || "ops@wekbench.app",
    phone: a.phone || "+233000000000",
    line1: a.line1 || a.city || a.country,
    city: a.city || "",
    state: a.state || a.city || "",
    country: a.country, // ISO-2
    zip: a.zip || "",
    is_residential: false,
  });
  const id = data.address_id ?? data.id;
  if (!id) throw new Error("Terminal Africa: address creation returned no id");
  return id;
}

async function createPackaging(p: Parcel): Promise<string> {
  const data = await call<{ packaging_id?: string; id?: string }>("/packaging", "POST", {
    type: "box",
    name: "Wekbench parcel",
    length: p.lengthCm ?? 30,
    width: p.widthCm ?? 25,
    height: p.heightCm ?? 15,
    size_unit: "cm",
    weight: 0.2,
    weight_unit: "kg",
  });
  const id = data.packaging_id ?? data.id;
  if (!id) throw new Error("Terminal Africa: packaging creation returned no id");
  return id;
}

async function createParcel(p: Parcel, packagingId: string): Promise<string> {
  const data = await call<{ parcel_id?: string; id?: string }>("/parcels", "POST", {
    description: p.description || "General merchandise",
    weight_unit: "kg",
    packaging: packagingId,
    items: [
      {
        name: p.description || "Item",
        description: p.description || "General merchandise",
        currency: p.valueCurrency || "USD",
        value: p.valueAmount ?? 1,
        quantity: 1,
        weight: p.weightKg,
        hs_code: "",
      },
    ],
  });
  const id = data.parcel_id ?? data.id;
  if (!id) throw new Error("Terminal Africa: parcel creation returned no id");
  return id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRate(r: any): ShippingRate {
  const etaMinutes =
    typeof r.delivery_eta === "number"
      ? r.delivery_eta
      : Number.isFinite(Number(r.delivery_eta))
        ? Number(r.delivery_eta)
        : null;
  return {
    providerSlug: "terminal-africa",
    mode: "courier",
    carrierName: r.carrier_name ?? r.carrier_slug ?? "Carrier",
    carrierLogo: r.carrier_logo ?? null,
    service: r.carrier_rate_description ?? r.rate_description ?? null,
    amount: Number(r.amount ?? r.total_amount ?? 0),
    currency: r.currency ?? "NGN",
    etaText: r.delivery_time ?? null,
    etaMinutes,
    includesInsurance: r.includes_insurance ?? null,
    bookable: true,
    rateRef: r.rate_id ?? r.rate_reference ?? null,
    raw: r,
  };
}

async function getRates(input: ShippingRateInput): Promise<ShippingRate[]> {
  if (!input.parcel) throw new Error("A parcel (weight) is required for courier rates");
  const [pickup, delivery] = await Promise.all([
    createAddress(input.origin),
    createAddress(input.destination),
  ]);
  const packagingId = await createPackaging(input.parcel);
  const parcelId = await createParcel(input.parcel, packagingId);

  const data = await call<{ rates?: unknown[] }>("/rates/shipment", "POST", {
    pickup_address: pickup,
    delivery_address: delivery,
    parcel_id: parcelId,
    currency: input.currency || "GHS",
  });
  const rates = Array.isArray(data.rates) ? data.rates : [];
  return rates
    .map(normalizeRate)
    .filter((r) => r.amount > 0)
    .sort((a, b) => a.amount - b.amount);
}

export const terminalAfricaAdapter: ShippingAdapter = {
  slug: "terminal-africa",
  mode: "courier",
  getRates,
};
