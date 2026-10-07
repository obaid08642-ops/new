export const SUPPORTED_LOCALES = ["ar", "en", "hi", "ur", "fil", "bn"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocaleDirection = "ltr" | "rtl";

export const DEFAULT_LOCALE: SupportedLocale = "en";
export const FALLBACK_LOCALE: SupportedLocale = "en";

export const localeLabels: Record<SupportedLocale, string> = {
  ar: "العربية",
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
  fil: "Filipino",
  bn: "বাংলা",
};

export const localeNativeNames: Record<SupportedLocale, string> = {
  ar: "العربية",
  en: "English",
  hi: "हिन्दी",
  ur: "اردو",
  fil: "Filipino",
  bn: "বাংলা",
};

export const localeDirections: Record<SupportedLocale, LocaleDirection> = {
  ar: "rtl",
  ur: "rtl",
  en: "ltr",
  hi: "ltr",
  fil: "ltr",
  bn: "ltr",
};

export const localeDigitStyles: Record<SupportedLocale, "latn" | "arab" | "arabext" | "beng" | "deva"> = {
  ar: "arab",
  ur: "arabext",
  hi: "deva",
  bn: "beng",
  en: "latn",
  fil: "latn",
};

export const localeRegions: Record<SupportedLocale, string> = {
  ar: "SA",
  en: "US",
  hi: "IN",
  ur: "PK",
  fil: "PH",
  bn: "BD",
};

export const localeCurrencies: Record<SupportedLocale, string> = {
  ar: "SAR",
  en: "SAR",
  hi: "SAR",
  ur: "SAR",
  fil: "SAR",
  bn: "SAR",
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function getDirection(locale: SupportedLocale): LocaleDirection {
  return localeDirections[locale];
}

export function getDigitStyle(locale: SupportedLocale): "latn" | "arab" | "arabext" | "beng" | "deva" {
  return localeDigitStyles[locale];
}

export function getLocaleForUser(
  userLocale: string | null | undefined,
  deviceLocale: string | null | undefined
): SupportedLocale {
  if (userLocale && isSupportedLocale(userLocale)) {
    return userLocale;
  }
  if (deviceLocale) {
    const normalized = deviceLocale.toLowerCase().split("-")[0];
    if (isSupportedLocale(normalized)) {
      return normalized;
    }
    const withRegion = deviceLocale.toLowerCase();
    if (isSupportedLocale(withRegion)) {
      return withRegion;
    }
  }
  return FALLBACK_LOCALE;
}

export function resolveLocale(
  requested: string | null | undefined,
  userPreference: string | null | undefined,
  deviceLocale: string | null | undefined
): SupportedLocale {
  if (requested && isSupportedLocale(requested)) {
    return requested;
  }
  return getLocaleForUser(userPreference, deviceLocale);
}