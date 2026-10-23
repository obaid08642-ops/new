import { formatPrice } from "@/lib/format-price";

export const moneyText = (locale: string, v: number) => formatPrice(locale, v).text;

export function pickName(locale: string, ar: string | null | undefined, en: string | null | undefined): string | undefined {
  const rtl = locale === "ar" || locale === "ur";
  return ((rtl ? ar ?? en : en ?? ar) ?? undefined) || undefined;
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
