import * as Localization from 'expo-localization';
import { getLocaleForUser, resolveLocale, FALLBACK_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@nabd/i18n';

let userPreferredLocale: SupportedLocale | null = null;

export function setUserPreferredLocale(locale: SupportedLocale | null): void {
  userPreferredLocale = locale;
}

export function getUserPreferredLocale(): SupportedLocale {
  if (userPreferredLocale) {
    return userPreferredLocale;
  }
  
  const deviceLocales = Localization.getLocales();
  const deviceLocale = deviceLocales[0]?.languageCode;
  return getLocaleForUser(null, deviceLocale);
}

export function getLocaleWithFallback(requested: string | null | undefined): SupportedLocale {
  const deviceLocales = Localization.getLocales();
  const deviceLocale = deviceLocales[0]?.languageCode;
  return resolveLocale(requested, userPreferredLocale, deviceLocale);
}

export function getCurrentLocale(): SupportedLocale {
  return userPreferredLocale || getLocaleForUser(null, Localization.getLocales()[0]?.languageCode);
}

export { SUPPORTED_LOCALES, FALLBACK_LOCALE, type SupportedLocale } from '@nabd/i18n';