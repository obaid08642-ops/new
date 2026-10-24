import { formatPrice } from "@/lib/format-price";

export const moneyText = (locale: string, v: number) => formatPrice(locale, v).text;

export function pickName(locale: string, ar: string | null | undefined, en: string | null | undefined): string | undefined {
  const rtl = locale === "ar" || locale === "ur";
  return ((rtl ? ar ?? en : en ?? ar) ?? undefined) || undefined;
}

/**
 * A basket or catalogue line's name in the page's locale (issue 1832): the line's own name in that language when it has one,
 * else the Arabic/English reading of `pickName`. Lines stored before this change have no `names` and read as before.
 */
export function pickLineName(locale: string, line: { nameAr?: string | null; nameEn?: string | null; names?: Partial<Record<"ur" | "hi" | "bn" | "fil", string>> }): string | undefined {
  const own = line.names?.[locale as "ur" | "hi" | "bn" | "fil"];
  if (own && own.trim()) return own;
  return pickName(locale, line.nameAr, line.nameEn);
}

/** The earliest time of a provider row, in the page's locale. */
export function whenText(locale: string, iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

export function hoursUnit(locale: string, v: number) {
  return new Intl.NumberFormat(locale, { style: "unit", unit: "hour", unitDisplay: "long", maximumFractionDigits: 0 }).format(v);
}
