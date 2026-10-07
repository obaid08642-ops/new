import { headers } from 'next/headers';
import { getLocaleForUser, resolveLocale, FALLBACK_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@nabd/i18n';

export function getUserPreferredLocale(): SupportedLocale {
  const headersList = headers();
  const userLocale = headersList.get('x-user-locale');
  const acceptLanguage = headersList.get('accept-language');
  return getLocaleForUser(userLocale, acceptLanguage);
}

export function getLocaleFromParams(params: { locale?: string }): SupportedLocale {
  const requested = params.locale;
  const headersList = headers();
  const userLocale = headersList.get('x-user-locale');
  const acceptLanguage = headersList.get('accept-language');
  return resolveLocale(requested, userLocale, acceptLanguage);
}

export function getLocaleFromRequest(request: Request): SupportedLocale {
  const url = new URL(request.url);
  const requested = url.searchParams.get('locale');
  const userLocale = request.headers.get('x-user-locale');
  const acceptLanguage = request.headers.get('accept-language');
  return resolveLocale(requested, userLocale, acceptLanguage);
}

export { SUPPORTED_LOCALES, FALLBACK_LOCALE, type SupportedLocale } from '@nabd/i18n';