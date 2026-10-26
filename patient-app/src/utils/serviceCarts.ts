/**
 * One cart per service (owner, 2026-10-26). The app keeps the pharmacy cart (CartContext) and the diagnostics cart
 * (DiagnosticsCartContext, whose lines say `lab` or `radiology`); home nursing has no cart (a visit is booked straight away).
 * The header cart button opens the cart of the screen's service with that service's count; Home and the screens of no service
 * get a chooser of the carts that are not empty. The rule lives here, with no React, the same as the website's lib/cart/service-carts.ts.
 */
export type CartService = 'pharmacy' | 'lab' | 'radiology';
export const CART_SERVICES: readonly CartService[] = ['pharmacy', 'lab', 'radiology'];
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

export type CartTarget =
  | { kind: 'cart'; service: CartService; route: string; count: number }
  | { kind: 'chooser'; carts: Array<{ service: CartService; count: number; route: string }>; count: number };

export function cartTargetFor(pageService: CartService | null, counts: CartCounts): CartTarget {
  if (pageService) return { kind: 'cart', service: pageService, route: cartRoute(pageService), count: counts[pageService] };
  const carts = CART_SERVICES.flatMap((service) => (counts[service] > 0 ? [{ service, count: counts[service], route: cartRoute(service) }] : []));
  const count = carts.reduce((n, cart) => n + cart.count, 0);
  // exactly one cart has something in it: open it at once; none: the pharmacy cart's empty screen
  if (carts.length <= 1) {
    const service = carts[0]?.service ?? 'pharmacy';
    return { kind: 'cart', service, route: cartRoute(service), count };
  }
  return { kind: 'chooser', carts, count };
}
