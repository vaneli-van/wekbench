// Normalized shipping types shared by every carrier/aggregator adapter.
// Core code only ever sees these shapes — never a provider's raw API.

export type ShippingMode = "courier" | "freight";

export type Address = {
  name?: string;
  email?: string;
  phone?: string;
  line1?: string;
  city?: string;
  state?: string;
  country: string; // ISO-2, e.g. "GH"
  zip?: string;
};

export type Parcel = {
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  description?: string;
  valueAmount?: number;
  valueCurrency?: string;
};

export type FreightSpec = {
  mode: "ocean" | "air" | "road";
  containerType?: string; // "20ft" | "40ft" | "LCL"
  volumeCbm?: number;
  weightKg?: number;
};

export type ShippingRate = {
  providerSlug: string;
  mode: ShippingMode;
  carrierName: string; // "DHL Express", "FedEx", ...
  carrierLogo?: string | null;
  service?: string | null; // "EXPRESS DOMESTIC", "Air — LCL", ...
  amount: number;
  currency: string;
  etaText?: string | null; // "Within 3 days"
  etaMinutes?: number | null;
  includesInsurance?: boolean | null;
  bookable: boolean; // courier: true; freight: often estimate-only
  rateRef?: string | null; // provider rate_id, for later booking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any;
};

export type ShippingRateInput = {
  origin: Address;
  destination: Address;
  parcel?: Parcel;
  freight?: FreightSpec;
  currency?: string; // preferred carrier currency, e.g. "GHS"
};

export interface ShippingAdapter {
  /** Stable key, matches shipping_providers.slug */
  slug: string;
  mode: ShippingMode;
  getRates(input: ShippingRateInput): Promise<ShippingRate[]>;
}
