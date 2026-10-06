import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import arMessages from "../messages/ar.json";
import enMessages from "../messages/en.json";
import urMessages from "../messages/ur.json";
import hiMessages from "../messages/hi.json";
import bnMessages from "../messages/bn.json";
import filMessages from "../messages/fil.json";

const messagesMap: Record<string, Record<string, any>> = {
  ar: arMessages,
  en: enMessages,
  ur: urMessages,
  hi: hiMessages,
  bn: bnMessages,
  fil: filMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const base = enMessages;
  const localized = messagesMap[locale] || arMessages;

  // Deep merge base (English) with localized messages so all keys are guaranteed to exist
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

  return { locale, messages };
});
