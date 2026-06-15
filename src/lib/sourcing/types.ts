// Normalized sourcing types shared by every provider adapter.
// Core code only ever sees these shapes — never a provider's raw API.

export type NormalizedPriceBreak = {
  quantity: number;
  price: number;
  currency: string;
  convertedPrice?: number | null;
  convertedCurrency?: string | null;
};

export type NormalizedOffer = {
  distributorName: string;
  distributorExternalId?: string | null;
  distributorSku?: string | null;
  stockQty?: number | null;
  moq?: number | null;
  orderMultiple?: number | null;
  packaging?: string | null;
  leadTimeDays?: number | null;
  priceBreaks: NormalizedPriceBreak[];
  buyUrl?: string | null;
  isAuthorised?: boolean | null;
};

export type NormalizedPart = {
  externalPartId?: string | null;
  mpn?: string | null;
  manufacturer?: string | null;
  lifecycleStatus?: string | null;
  datasheetUrl?: string | null;
  imageUrl?: string | null;
  offers: NormalizedOffer[];
};

export type SourcingMatchInput = {
  mpn: string;
  manufacturer?: string;
  qty?: number;
  currency?: string;
  country?: string;
  /** Max parts to return (defaults are provider-specific). */
  limit?: number;
};

export type SourcingSearchInput = {
  query: string;
  qty?: number;
  currency?: string;
  country?: string;
  limit?: number;
};

export type ProviderKind = "api" | "catalog" | "manual";

export interface SourcingAdapter {
  /** Stable key, matches sourcing_providers.key */
  key: string;
  kind: ProviderKind;
  /** Categories this adapter serves, matches sourcing_providers.categories */
  categories: string[];
  /** Exact identity match — cheapest and most precise. Preferred path. */
  matchByMpn(input: SourcingMatchInput): Promise<NormalizedPart[]>;
  /** Fuzzy fallback used when no MPN is known. */
  search(input: SourcingSearchInput): Promise<NormalizedPart[]>;
}
