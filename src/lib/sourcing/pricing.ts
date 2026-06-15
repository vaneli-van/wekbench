// Quantity-aware price selection from a normalized price-break ladder.
// Pure — safe on client or server.

export type PriceBreakLike = {
  quantity: number;
  price: number;
  currency?: string | null;
};

/**
 * Pick the unit price for a given order quantity: the price at the largest
 * break whose quantity is <= qty. If qty is below the smallest break, use the
 * smallest break (typically qty 1). Returns null if there are no usable breaks.
 */
export function priceAtQty(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breaks: any,
  qty: number,
): { price: number; currency: string } | null {
  const list: PriceBreakLike[] = Array.isArray(breaks) ? breaks : [];
  const valid = list
    .map((b) => ({ quantity: Number(b.quantity), price: Number(b.price), currency: b.currency ?? "USD" }))
    .filter((b) => Number.isFinite(b.price) && b.price > 0)
    .sort((a, b) => a.quantity - b.quantity);
  if (valid.length === 0) return null;
  const q = Number.isFinite(qty) && qty > 0 ? qty : 1;
  let chosen = valid[0];
  for (const b of valid) {
    if (b.quantity <= q) chosen = b;
    else break;
  }
  return { price: chosen.price, currency: chosen.currency };
}
