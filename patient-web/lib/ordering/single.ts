/**
 * "Order now" on one test or scan (owner review G4): it SKIPS the cart. The ordering pages take `item=<catalogue id>` in the URL and then
 * work on that one item instead of the basket's lines; the basket (this browser's list) is neither read nor changed on the way, so the
 * patient's cart stays as it was. The patient still chooses the lab or home visit, the time and the payment in the normal steps.
 * The item's names (display only; the server prices and books by id) travel in this tab's session storage next to the id.
 */
import { cleanNames, type BasketLine } from "./basket";

export const SINGLE_KEY = "nabd_ordering_single_v1";
const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** The `item` query value if it is a plausible catalogue id, else undefined (a hand-edited URL falls back to the basket). */
export function parseSingleItem(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" && ID.test(v) ? v : undefined;
}

/** `href` with `item=<id>` added (the query string is kept). */
export function withItem(href: string, id: string | undefined): string {
  if (!id || !ID.test(id)) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("item", id);
  return `${path}?${params.toString()}`;
}

/** The lines the ordering steps work on: the one item when `single` is set, else the basket's lines of that kind (untouched). */
export function orderLines(basketLines: BasketLine[], single: string | undefined, known?: BasketLine | null): BasketLine[] {
  if (!single) return basketLines;
  return known && known.id === single ? [known] : [{ id: single }];
}

export const serializeSingle = (line: BasketLine): string => JSON.stringify({ id: line.id, nameAr: line.nameAr, nameEn: line.nameEn, names: cleanNames(line.names) });

/** The stored line of the one-item order, or null (nothing stored, bad JSON, or another id). */
export function parseSingle(raw: string | null, id: string): BasketLine | null {
  try {
    const x = JSON.parse(raw ?? "null") as Record<string, unknown> | null;
    if (!x || x.id !== id) return null;
    const names = cleanNames(x.names);
    return { id, nameAr: typeof x.nameAr === "string" ? x.nameAr : undefined, nameEn: typeof x.nameEn === "string" ? x.nameEn : undefined, ...(names ? { names } : {}) };
  } catch {
    return null;
  }
}
