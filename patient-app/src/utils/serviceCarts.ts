/**
 * One cart per service (owner, 2026-10-26). The app keeps the pharmacy cart (CartContext) and the diagnostics cart
 * (DiagnosticsCartContext, whose lines say `lab` or `radiology`); home nursing has no cart (a visit is booked straight away).
 * The header cart button is drawn only on the screens where something can be added (pharmacy list and product, labs, radiology
 * and their item screens), opens the cart of that service and counts only it. Home, consultations, the doctor profile, the account
 * and every other screen have none. The rule lives here, with no React, the same as the website's lib/cart/service-carts.ts.
 */
export type CartService = 'pharmacy' | 'lab' | 'radiology';
export type CartCounts = Record<CartService, number>;

export function cartRoute(service: CartService): string {
  return service === 'pharmacy' ? '/pharmacy/cart' : '/diagnostics/cart';
}

/** The lines of the diagnostics cart counted per service (a line's `qty` counts). */
export function diagnosticsCounts(items: ReadonlyArray<{ kind: 'lab' | 'radiology'; qty?: number }>): { lab: number; radiology: number } {
  let lab = 0;
  let radiology = 0;
  for (const item of items) {
    const n = item.qty && item.qty > 0 ? item.qty : 1;
    if (item.kind === 'radiology') radiology += n;
    else lab += n;
  }
  return { lab, radiology };
}

export type CartTarget = { kind: 'cart'; service: CartService; route: string; count: number } | { kind: 'none' };

/** The button exists only where something can be added (owner review 2026-10-27, G1): on a screen of no service there is none. */
export function cartTargetFor(pageService: CartService | null, counts: CartCounts): CartTarget {
  if (!pageService) return { kind: 'none' };
  return { kind: 'cart', service: pageService, route: cartRoute(pageService), count: counts[pageService] };
}
