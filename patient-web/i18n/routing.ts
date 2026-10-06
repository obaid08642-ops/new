import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({ locales: ["ar", "en", "ur", "hi", "bn", "fil"], defaultLocale: "ar", localePrefix: "always" });
