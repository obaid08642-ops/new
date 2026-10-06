/**
 * The offer screens' numbers, money, dates and durations, all through `Intl` in the page's locale (owner rule
 * 2026-10-06): never a hand-built "24.50 SAR". The amounts are the server's; nothing here adds, multiplies or rounds.
 */
import { formatPrice } from "@/lib/format-price";

const CURRENCY = /^[A-Z]{3}$/;

/** Money exactly as the API sent it. SAR (the only currency the pharmacy API sends) goes through the shared helper. */
export function formatMoney(locale: string, amount: number, currency?: string): string {
  if (!currency || currency === "SAR" || !CURRENCY.test(currency)) return formatPrice(locale, amount).text;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return formatPrice(locale, amount).text;
  }
}

export function formatKilometres(locale: string, km: number): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit: "kilometer", unitDisplay: "short", maximumFractionDigits: 1 }).format(km);
}

export function formatMinutes(locale: string, minutes: number): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "long", maximumFractionDigits: 0 }).format(minutes);
}

export function formatWhen(locale: string, iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** "12 minutes", "45 seconds": the time left until a server expiry, in the locale's own units. */
export function formatRemaining(locale: string, ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds >= 3600) {
    return new Intl.NumberFormat(locale, { style: "unit", unit: "hour", unitDisplay: "long", maximumFractionDigits: 0 }).format(Math.floor(seconds / 3600));
  }
  if (seconds >= 60) {
    return new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "long", maximumFractionDigits: 0 }).format(Math.floor(seconds / 60));
  }
  return new Intl.NumberFormat(locale, { style: "unit", unit: "second", unitDisplay: "long", maximumFractionDigits: 0 }).format(seconds);
}

/** The line a name comes with: Arabic first for `ar`, otherwise the other language first. */
export function pickName(locale: string, names: { ar?: string; en?: string; raw?: string }): string | undefined {
  const order = locale === "ar" ? [names.ar, names.en, names.raw] : [names.en, names.ar, names.raw];
  return order.find((value) => typeof value === "string" && value.trim());
}
