/**
 * One cart per service (owner, 2026-10-26). The website keeps four carts, each in its own place in this browser:
 *   pharmacy  - lib/cart/cart-store (local-first), opened at /cart
 *   lab       - the ordering basket's `lab` list, opened at /labs/basket
 *   radiology - the ordering basket's `radiology` list, opened at /labs/basket?kind=radiology
 *   nursing   - the ordering basket's `nursing` list, opened at /labs/basket?kind=nursing
 * On the pages where something can be added (pharmacy list and product, labs, radiology, nursing and their item pages) the header
 * cart icon opens that service's cart with that service's count. On every other page it appears only when some cart has items
 * (badge = total) and opens a "Your carts" chooser of the non-empty carts. The rule is here, in one place, with no React.
 */
export type CartService = "pharmacy" | "lab" | "radiology" | "nursing";
export const CART_SERVICES: readonly CartService[] = ["pharmacy", "lab", "radiology", "nursing"];

/** The two diagnostics carts, shown as the Lab tests and Scans groups of one sheet; each completes its own booking flow. */
export const DIAGNOSTICS_SERVICES = ["lab", "radiology"] as const;
export const isDiagnostics = (service: CartService): service is (typeof DIAGNOSTICS_SERVICES)[number] => service === "lab" || service === "radiology";

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

/** What the header button does for this page: open the cart of the page's service, open a "Your carts" chooser of the non-empty carts, or not be drawn. */
export type CartTarget =
  | { kind: "cart"; service: CartService; href: string; count: number }
  | { kind: "chooser"; carts: Array<{ service: CartService; href: string; count: number }>; count: number }
  | { kind: "none" };

/**
 * On a page where something can be added: that service's cart, always shown, with its own count. On every other page (Home,
 * consultations, the doctor profile, the account, search): nothing while every cart is empty (owner, 2026-10-27); otherwise a
 * chooser of the non-empty carts whose badge is the total.
 */
export function cartTarget(pageService: CartService | null, counts: CartCounts, locale: string): CartTarget {
  // the labs and radiology pages own both carts (owner, 2026-10-30): one chooser of the non-empty groups, the badge counts both
  if (pageService === "lab" || pageService === "radiology") {
    const groups = DIAGNOSTICS_SERVICES.flatMap((service) => (counts[service] > 0 ? [{ service, href: cartHref(service, locale), count: counts[service] }] : []));
    if (groups.length === 0) return { kind: "cart", service: "lab", href: cartHref("lab", locale), count: 0 };
    return { kind: "chooser", carts: groups, count: counts.lab + counts.radiology };
  }
  if (pageService) return { kind: "cart", service: pageService, href: cartHref(pageService, locale), count: counts[pageService] };
  const carts = CART_SERVICES.flatMap((service) => (counts[service] > 0 ? [{ service, href: cartHref(service, locale), count: counts[service] }] : []));
  if (carts.length === 0) return { kind: "none" };
  return { kind: "chooser", carts, count: carts.reduce((n, cart) => n + cart.count, 0) };
}
