export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: string): value is Locale { return locales.includes(value as Locale); }
export function getDirection(locale: Locale): "rtl" | "ltr" { return locale === "ar" ? "rtl" : "ltr"; }
export function oppositeLocale(locale: Locale): Locale { return locale === "ar" ? "en" : "ar"; }
