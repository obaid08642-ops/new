/**
 * One cart per service (owner, 2026-10-26). The website keeps four carts, each in its own place in this browser:
 *   pharmacy  - lib/cart/cart-store (local-first), opened at /cart
 *   lab       - the ordering basket's `lab` list, opened at /labs/basket
 *   radiology - the ordering basket's `radiology` list, opened at /labs/basket?kind=radiology
 *   nursing   - the ordering basket's `nursing` list, opened at /labs/basket?kind=nursing
 * The header cart icon is drawn only on the pages where something can be added (pharmacy list and product, labs, radiology,
 * nursing and their item pages); it opens that service's cart and its badge shows that service's count. Home, consultations,
 * the doctor profile, the account and every other page have none. The rule is here, in one place, with no React.
 */
export type CartService = "pharmacy" | "lab" | "radiology" | "nursing";
export const CART_SERVICES: readonly CartService[] = ["pharmacy", "lab", "radiology", "nursing"];

export type CartCounts = Record<CartService, number>;

const PHARMACY_FLOW = new Set(["broadcast-status", "chat", "final-quote", "insurance-decision", "order-confirm", "payment", "waiting-for-pharmacy", "request", "reorder", "rx-order", "manual-order"]);

/** The service a page belongs to, from its path (`/ar/diagnostics/radiology` -> "radiology"), or null on Home and on pages where nothing can be added. */
export function serviceOfPath(pathname: string, kindParam?: string | null): CartService | null {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second] = parts[0] && /^[a-z]{2,3}$/i.test(parts[0]) ? [parts[1], parts[2]] : [parts[0], parts[1]];
  switch (first) {
    case "c": case "p": case "medicines": case "medicine-catalog":
      return "pharmacy";
    // the pharmacy order flow (offers, quote, payment, ...) adds nothing; only its catalogue pages do
    case "pharmacy":
      return second && PHARMACY_FLOW.has(second) ? null : "pharmacy";
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

/** What the header button does for this page: open the cart of the page's service (with its badge count), or not be drawn. */
export type CartTarget =
  | { kind: "cart"; service: CartService; href: string; count: number }
  | { kind: "none" };

/** The button exists only where something can be added (owner review 2026-10-27, G1): on a page of no service there is none. */
export function cartTarget(pageService: CartService | null, counts: CartCounts, locale: string): CartTarget {
  if (!pageService) return { kind: "none" };
  return { kind: "cart", service: pageService, href: cartHref(pageService, locale), count: counts[pageService] };
}
