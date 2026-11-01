/**
 * The ordering basket (M6 Ord02/Ord04), local-first like the pharmacy cart (owner 2026-10-06): a line is only what the patient wants (a
 * catalogue id and its name for display), never a price. Prices, the split and coverage come from the quote. One list per service
 * kind, kept in this browser. Pure functions here; `components-next/ordering/use-basket.ts` wraps them for React.
 */
import type { ServiceKind } from "./quote";

/** The names a line carries in the other website languages (issue 1832). The Arabic and English names stay the fallback. */
export type LineNames = { ur?: string; hi?: string; bn?: string; fil?: string };
export type BasketLine = { id: string; nameAr?: string; nameEn?: string; names?: LineNames };
const NAME_LOCALES = ["ur", "hi", "bn", "fil"] as const;

/** Keeps only the non-empty string names of the known locales. */
export function cleanNames(v: unknown): LineNames | undefined {
  if (!v || typeof v !== "object") return undefined;
  const out: LineNames = {};
  for (const l of NAME_LOCALES) {
    const x = (v as Record<string, unknown>)[l];
    if (typeof x === "string" && x.trim()) out[l] = x;
  }
  return Object.keys(out).length ? out : undefined;
}
export type Basket = Record<ServiceKind, BasketLine[]>;

export const BASKET_KEY = "nabd_ordering_basket_v1";
export const MAX_BASKET_ITEMS = 30; // the quote endpoint accepts at most 30 items
const ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const KINDS: ServiceKind[] = ["lab", "radiology", "nursing"];

export const emptyBasket = (): Basket => ({ lab: [], radiology: [], nursing: [] });

export function addLine(basket: Basket, kind: ServiceKind, line: BasketLine): Basket {
  if (!ID.test(line.id) || basket[kind].some((l) => l.id === line.id) || basket[kind].length >= MAX_BASKET_ITEMS) return basket;
  const names = cleanNames(line.names);
  return { ...basket, [kind]: [...basket[kind], { id: line.id, nameAr: line.nameAr, nameEn: line.nameEn, ...(names ? { names } : {}) }] };
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
          const names = cleanNames(x.names);
          out[kind].push({ id: x.id, nameAr: typeof x.nameAr === "string" ? x.nameAr : undefined, nameEn: typeof x.nameEn === "string" ? x.nameEn : undefined, ...(names ? { names } : {}) });
        }
      }
    }
  } catch {
    return emptyBasket();
  }
  return out;
}

export const serializeBasket = (basket: Basket) => JSON.stringify(basket);

/**
 * What the provider step hands to the time and confirm steps. `home` / `facility` are the chosen provider ids (what POST /ordering/bookings
 * takes); `groups` is a snapshot of the quote's own answer for the chosen provider of each mode (names, item ids, the totals the server
 * computed; `lines`, the home fee and the insurance share exist only when the chosen provider is the quote's best match). Session-scoped.
 */
export type ChosenGroup = {
  providerId: string; nameAr: string | null; nameEn: string | null; itemIds: string[]; total: number;
  lines?: Array<{ catalogId: string; price: number; coverage?: "covered" | "needs_approval" | "not_covered" }>; homeFee?: number; estimatedInsuranceShare?: number; patientShare?: number;
};
export type ProviderChoice = { quoteId: string; home?: string; facility?: string; groups?: { home?: ChosenGroup; facility?: ChosenGroup } };
export const SELECTION_KEY = "nabd_ordering_selection_v1";

type Raw = Record<string, unknown>;
const COVS = new Set(["covered", "needs_approval", "not_covered"]);
const strOrNull = (v: unknown) => (typeof v === "string" ? v : null);

function parseChosen(v: unknown): ChosenGroup | undefined {
  const x = v && typeof v === "object" ? (v as Raw) : null;
  if (!x || typeof x.providerId !== "string" || typeof x.total !== "number" || !Array.isArray(x.itemIds)) return undefined;
  const lines = Array.isArray(x.lines)
    ? x.lines.flatMap((l) => {
        const r = l as Raw | null;
        return r && typeof r.catalogId === "string" && typeof r.price === "number"
          ? [{ catalogId: r.catalogId, price: r.price, ...(typeof r.coverage === "string" && COVS.has(r.coverage) ? { coverage: r.coverage as "covered" } : {}) }]
          : [];
      })
    : undefined;
  const n = (k: string) => (typeof x[k] === "number" ? (x[k] as number) : undefined);
  return {
    providerId: x.providerId, nameAr: strOrNull(x.nameAr), nameEn: strOrNull(x.nameEn), total: x.total,
    itemIds: x.itemIds.filter((i): i is string => typeof i === "string"), ...(lines ? { lines } : {}),
    homeFee: n("homeFee"), estimatedInsuranceShare: n("estimatedInsuranceShare"), patientShare: n("patientShare"),
  };
}

export function parseChoice(raw: string | null): ProviderChoice | null {
  try {
    const x = JSON.parse(raw ?? "null") as Raw | null;
    if (!x || typeof x.quoteId !== "string") return null;
    const g = x.groups && typeof x.groups === "object" ? (x.groups as Raw) : null;
    const home = g ? parseChosen(g.home) : undefined;
    const facility = g ? parseChosen(g.facility) : undefined;
    return {
      quoteId: x.quoteId, home: typeof x.home === "string" ? x.home : undefined, facility: typeof x.facility === "string" ? x.facility : undefined,
      ...(home || facility ? { groups: { ...(home ? { home } : {}), ...(facility ? { facility } : {}) } } : {}),
    };
  } catch {
    return null;
  }
}

/** The group snapshot of one chosen provider from the quote group (see ChosenGroup). */
export function chosenGroup(g: { items: Array<{ catalogId: string }>; bestMatch: { providerId: string; lines: Array<{ catalogId: string; price: number; coverage?: "covered" | "needs_approval" | "not_covered" }>; total: number; homeFee: number; estimatedInsuranceShare: number; patientShare: number } | null; compare: Array<{ providerId: string; nameAr: string | null; nameEn: string | null; total: number }>; split: unknown }, providerId: string): ChosenGroup | undefined {
  const row = g.compare.find((r) => r.providerId === providerId);
  if (!row) return undefined;
  const b = g.bestMatch && g.bestMatch.providerId === providerId ? g.bestMatch : null;
  return {
    providerId, nameAr: row.nameAr, nameEn: row.nameEn, itemIds: g.items.map((i) => i.catalogId), total: row.total,
    ...(b ? { lines: b.lines, homeFee: b.homeFee, estimatedInsuranceShare: b.estimatedInsuranceShare, patientShare: b.patientShare } : {}),
  };
}
