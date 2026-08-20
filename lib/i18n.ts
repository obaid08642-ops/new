export const locales = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
export type Locale = (typeof locales)[number];
export function isLocale(value: string): value is Locale { return locales.includes(value as Locale); }
export const localeLabels: Record<Locale, string> = { ar: "العربية", en: "English", ur: "اردو", hi: "हिन्दी", bn: "বাংলা", fil: "Filipino" };
export function getDirection(locale: Locale): "rtl" | "ltr" { return locale === "ar" || locale === "ur" ? "rtl" : "ltr"; }
