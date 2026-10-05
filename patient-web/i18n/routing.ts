import { defineRouting } from "next-intl/routing";
import type { SupportedLocale } from "@nabd/i18n";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@nabd/i18n";

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});

export type { SupportedLocale };
export { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@nabd/i18n";