/** The discount of a product: only when the API sends an old price above the price (spec: never invent one). */
export function discountPercent(price: number, oldPrice: number | null) {
  return oldPrice && price > 0 && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
}
