/**
 * One cart per service (owner, 2026-10-26). The website keeps four carts, each in its own place in this browser:
 *   pharmacy  - lib/cart/cart-store (local-first), opened at /cart
 *   lab       - the ordering basket's `lab` list, opened at /labs/basket
 *   radiology - the ordering basket's `radiology` list, opened at /labs/basket?kind=radiology
 *   nursing   - the ordering basket's `nursing` list, opened at /labs/basket?kind=nursing
 * The header cart icon opens the cart of the page's service and its badge shows that service's count; on Home (and on any
 * page that belongs to no service) it opens a chooser of the carts that are not empty. The rule is here, in one place, with no React.
 */
export type CartService = "pharmacy" | "lab" | "radiology" | "nursing";
export const CART_SERVICES: readonly CartService[] = ["pharmacy", "lab", "radiology", "nursing"];

export type CartCounts = Record<CartService, number>;

/** The service a page belongs to, from its path (`/ar/diagnostics/radiology` -> "radiology"), or null on Home and on pages of no service. */
export function serviceOfPath(pathname: string, kindParam?: string | null): CartService | null {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second] = parts[0] && /^[a-z]{2,3}$/i.test(parts[0]) ? [parts[1], parts[2]] : [parts[0], parts[1]];
  switch (first) {
    case "c": case "p": case "pharmacy": case "medicines": case "medicine-catalog": case "cart":
      return "pharmacy";
    case "nursing": case "home-care":
      return "nursing";
    case "diagnostics":
      return second === "radiology" ? "radiology" : "lab";
    case "labs":
      return kindParam === "radiology" ? "radiology" : kindParam === "nursing" ? "nursing" : "lab";
    default:
      return null;
  }
}

/** Where a service's cart opens. */
export function cartHref(service: CartService, locale: string): string {
  if (service === "pharmacy") return `/${locale}/cart`;
  return `/${locale}/labs/basket${service === "lab" ? "" : `?kind=${service}`}`;
}

/** The count of the carts that are not empty, in the fixed order of CART_SERVICES. */
export function nonEmptyCarts(counts: CartCounts): Array<{ service: CartService; count: number }> {
  return CART_SERVICES.flatMap((service) => (counts[service] > 0 ? [{ service, count: counts[service] }] : []));
}

/** What the header button does for this page: open one cart (with its badge count), or offer the chooser of non-empty carts. */
export type CartTarget =
  | { kind: "cart"; service: CartService; href: string; count: number }
  | { kind: "chooser"; carts: Array<{ service: CartService; count: number; href: string }>; count: number };

export function cartTarget(pageService: CartService | null, counts: CartCounts, locale: string): CartTarget {
  if (pageService) return { kind: "cart", service: pageService, href: cartHref(pageService, locale), count: counts[pageService] };
  const carts = nonEmptyCarts(counts);
  const count = carts.reduce((n, c) => n + c.count, 0);
  // exactly one cart has something in it: open it straight away; none: the pharmacy cart's empty screen
  if (carts.length <= 1) {
    const service = carts[0]?.service ?? "pharmacy";
    return { kind: "cart", service, href: cartHref(service, locale), count };
  }
  return { kind: "chooser", carts: carts.map((c) => ({ ...c, href: cartHref(c.service, locale) })), count };
}
