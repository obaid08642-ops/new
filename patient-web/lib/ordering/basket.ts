/**
 * The ordering basket (M6 Ord02/Ord04), local-first like the pharmacy cart (owner 2026-10-06): a line is only what the patient wants (a
 * catalogue id and its name for display), never a price. Prices, the split and coverage come from the quote. One list per service
 * kind, kept in this browser. Pure functions here; `components-next/ordering/use-basket.ts` wraps them for React.
 */
import type { ServiceKind } from "./quote";

export type BasketLine = { id: string; nameAr?: string; nameEn?: string };
export type Basket = Record<ServiceKind, BasketLine[]>;

export const BASKET_KEY = "nabd_ordering_basket_v1";
export const MAX_BASKET_ITEMS = 30; // the quote endpoint accepts at most 30 items
const ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const KINDS: ServiceKind[] = ["lab", "radiology", "nursing"];

export const emptyBasket = (): Basket => ({ lab: [], radiology: [], nursing: [] });

export function addLine(basket: Basket, kind: ServiceKind, line: BasketLine): Basket {
  if (!ID.test(line.id) || basket[kind].some((l) => l.id === line.id) || basket[kind].length >= MAX_BASKET_ITEMS) return basket;
  return { ...basket, [kind]: [...basket[kind], { id: line.id, nameAr: line.nameAr, nameEn: line.nameEn }] };
}

export const removeLine = (basket: Basket, kind: ServiceKind, id: string): Basket =>
  basket[kind].some((l) => l.id === id) ? { ...basket, [kind]: basket[kind].filter((l) => l.id !== id) } : basket;

export const hasLine = (basket: Basket, kind: ServiceKind, id: string) => basket[kind].some((l) => l.id === id);

export function parseBasket(raw: string | null): Basket {
  const out = emptyBasket();
  if (!raw) return out;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    for (const kind of KINDS) {
      const rows = Array.isArray(data?.[kind]) ? (data[kind] as unknown[]) : [];
      for (const r of rows) {
        const x = r as Record<string, unknown>;
        if (x && typeof x.id === "string" && ID.test(x.id) && !out[kind].some((l) => l.id === x.id) && out[kind].length < MAX_BASKET_ITEMS) {
          out[kind].push({ id: x.id, nameAr: typeof x.nameAr === "string" ? x.nameAr : undefined, nameEn: typeof x.nameEn === "string" ? x.nameEn : undefined });
        }
      }
    }
  } catch {
    return emptyBasket();
  }
  return out;
}

export const serializeBasket = (basket: Basket) => JSON.stringify(basket);

/** The chosen provider per mode, kept for the next step (time picker). Session-scoped: a new session starts from the basket. */
export type ProviderChoice = { quoteId: string; home?: string; facility?: string };
export const SELECTION_KEY = "nabd_ordering_selection_v1";

export function parseChoice(raw: string | null): ProviderChoice | null {
  try {
    const x = JSON.parse(raw ?? "null") as Record<string, unknown> | null;
    if (!x || typeof x.quoteId !== "string") return null;
    return { quoteId: x.quoteId, home: typeof x.home === "string" ? x.home : undefined, facility: typeof x.facility === "string" ? x.facility : undefined };
  } catch {
    return null;
  }
}
