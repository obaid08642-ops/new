import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import enMessages from "@/messages/en.json";
import arMessages from "@/messages/ar.json";
import urMessages from "@/messages/ur.json";
import hiMessages from "@/messages/hi.json";
import bnMessages from "@/messages/bn.json";
import filMessages from "@/messages/fil.json";

import type { SupportedLocale } from "@nabd/i18n";
import { getLocaleForUser, resolveLocale } from "@nabd/i18n";

const messagesMap: Record<string, Record<string, any>> = {
  ar: arMessages,
  en: enMessages,
  ur: urMessages,
  hi: hiMessages,
  bn: bnMessages,
  fil: filMessages,
};

export async function getMessages(locale: SupportedLocale) {
  const base = enMessages;
  const localized = messagesMap[locale] || enMessages;

  const allNamespaces = new Set([...Object.keys(base), ...Object.keys(localized)]);
  const messages: Record<string, any> = {};

  for (const ns of allNamespaces) {
    const baseNs = (base as Record<string, any>)[ns];
    const locNs = (localized as Record<string, any>)[ns];

    if (typeof baseNs === "object" && baseNs && !Array.isArray(baseNs)) {
      messages[ns] = { ...baseNs, ...(locNs || {}) };
    } else {
      messages[ns] = locNs !== undefined ? locNs : baseNs;
    }
  }

  return messages;
}

export function getLocaleFromHeaders(headers: Headers): SupportedLocale {
  const acceptLanguage = headers.get("accept-language");
  const userPreference = headers.get("x-user-locale");
  return getLocaleForUser(userPreference, acceptLanguage);
}

export async function getRequestConfigWithFallback(requestLocale: string | undefined) {
  const locale = hasLocale(routing.locales, requestLocale)
    ? (requestLocale as SupportedLocale)
    : routing.defaultLocale;

  const messages = await getMessages(locale);
  return { locale, messages };
}

export function createLocaleResolver() {
  return {
    resolve: (requested: string | null | undefined, userPreference: string | null | undefined, deviceLocale: string | null | undefined) =>
      resolveLocale(requested, userPreference, deviceLocale),
    fromHeaders: (headers: Headers) => getLocaleFromHeaders(headers),
  };
}

export { getLocaleForUser, resolveLocale } from "@nabd/i18n";