import { addLine, hasLine, MAX_BASKET_ITEMS, type Basket, type BasketLine } from "./basket";
import type { ServiceKind } from "./quote";

/**
 * Owner decision 2026-11-08 (2), the ordering screens: the items of the patient's doctor's order are PRE-CHECKED (not locked: any of them can be
 * unticked, which only removes it from the basket; the item stays open in "My medical orders"). The Order button of an order group reaches the
 * basket with the order's id and its catalogue ids (`order`, `pre`); these helpers read them and seed the local basket.
 */
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const ORDER_ID = /^[A-Za-z0-9-]{8,64}$/;
export const MAX_PREFILL = 12;

/** The catalogue ids of the `pre` query: a comma list, each a plain id, no duplicates, at most MAX_PREFILL. */
export function parsePrefillIds(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").filter((id) => ID.test(id)))].slice(0, MAX_PREFILL);
}
export const parseOrderId = (value: unknown): string | null => (typeof value === "string" && ORDER_ID.test(value) ? value : null);

/** The catalogue ids the backend's order action put in `prefill.items` (POST /medical-orders/:id/items/:itemId/order). */
export function prefillCatalogIds(payload: unknown): string[] {
  const items = ((payload as { prefill?: { items?: unknown } } | null)?.prefill?.items ?? []) as unknown;
  if (!Array.isArray(items)) return [];
  return parsePrefillIds(items.map((i) => (i && typeof i === "object" ? (i as { catalog_id?: unknown }).catalog_id : undefined)).filter((v): v is string => typeof v === "string").join(","));
}

/** Where the Order button sends the patient: the basket with the order and its items in the address (only for the basket; any other target is left as it is). */
export function prefillTarget(back: URL, orderId: string, payload: unknown): URL {
  const ids = prefillCatalogIds(payload);
  if (!back.pathname.endsWith("/labs/basket") || ids.length === 0 || !ORDER_ID.test(orderId)) return back;
  const target = new URL(back.toString());
  target.searchParams.set("order", orderId);
  target.searchParams.set("pre", ids.join(","));
  return target;
}

/** The basket with every prefilled line added (a line already in it is kept as it is; the basket keeps its own limit). */
export function seedBasket(basket: Basket, kind: ServiceKind, lines: BasketLine[]): Basket {
  return lines.slice(0, MAX_BASKET_ITEMS).reduce((b, line) => (hasLine(b, kind, line.id) ? b : addLine(b, kind, line)), basket);
}
