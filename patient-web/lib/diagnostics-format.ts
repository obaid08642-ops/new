import { formatPrice } from "@/lib/format-price";

/** A price exactly as the server sent it, in the page's locale (a SAR amount through `Intl`, never hand-built). */
export function money(locale: string, value: number): string {
  return formatPrice(locale, value).text;
}

/** A duration in hours, in the page's locale. */
export function hoursText(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit: "hour", unitDisplay: "long", maximumFractionDigits: 0 }).format(value);
}

/** A duration in minutes, in the page's locale. */
export function minutesText(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "long", maximumFractionDigits: 0 }).format(value);
}
