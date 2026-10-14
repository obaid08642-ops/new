/** The discount of a product: only when the API sends an old price above the price (spec: never invent one). */
export function discountPercent(price: number, oldPrice: number | null) {
  return oldPrice && price > 0 && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
}

/** Every spelling of "needs a prescription" a product, card, cart line or wishlist row carries on the web. */
export type RxFlagged = { rx?: boolean | null; is_rx?: boolean | null; requires_prescription?: boolean | null; requiresPrescription?: boolean | null };

/**
 * Owner decision 10 (C11): a prescription item carries no offer, discount, crossed-out price, points or promo badge.
 * The one question every price block asks before it draws any of them. The public product answers still send `old_price`
 * for a prescription item (backend med-i18n.ts), so the client must not rely on the server to withhold it.
 */
export function canShowPromo(item: RxFlagged): boolean {
  return !(item.rx === true || item.is_rx === true || item.requires_prescription === true || item.requiresPrescription === true);
}

/** The discount percent to draw: 0 for a prescription item, otherwise the real one (see `discountPercent`). */
export function promoPercent(item: RxFlagged, price: number, oldPrice: number | null) {
  return canShowPromo(item) ? discountPercent(price, oldPrice) : 0;
}

/** The crossed-out price to draw: only beside a real discount on an item that may show one. */
export function promoOldPrice(item: RxFlagged, price: number, oldPrice: number | null): number | null {
  return promoPercent(item, price, oldPrice) > 0 ? oldPrice : null;
}
