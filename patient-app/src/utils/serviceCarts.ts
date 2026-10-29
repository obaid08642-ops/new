/**
 * One cart per service (owner, 2026-10-26). The app keeps the pharmacy cart (CartContext) and the diagnostics cart
 * (DiagnosticsCartContext, whose lines say `lab` or `radiology`); home nursing has no cart (a visit is booked straight away).
 * On the screens where something can be added (pharmacy list and product, labs, radiology and their item screens) the header cart
 * button opens that service's cart with its own count. On every other screen it appears only when some cart has items (badge =
 * total) and opens a "Your carts" chooser of the non-empty carts. The rule lives here, with no React, the same as the website's lib/cart/service-carts.ts.
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
  | { kind: 'chooser'; carts: Array<{ service: CartService; count: number; route: string }>; count: number }
  | { kind: 'none' };

/**
 * On a screen where something can be added: that service's cart, always shown, with its own count. On every other screen (Home,
 * consultations, search): nothing while every cart is empty (owner, 2026-10-27); otherwise a "Your carts" chooser of the
 * non-empty carts whose badge is the total.
 */
export function cartTargetFor(pageService: CartService | null, counts: CartCounts): CartTarget {
  if (pageService) return { kind: 'cart', service: pageService, route: cartRoute(pageService), count: counts[pageService] };
  const carts = CART_SERVICES.flatMap((service) => (counts[service] > 0 ? [{ service, count: counts[service], route: cartRoute(service) }] : []));
  if (carts.length === 0) return { kind: 'none' };
  return { kind: 'chooser', carts, count: carts.reduce((n, cart) => n + cart.count, 0) };
}
