import { defineRouting } from "next-intl/routing";

/**
 * 12.A4 — the accept-language step lives in `proxy.ts`, not here.
 *
 * next-intl 4.13 types `localeDetection` as a boolean, and its `true` reads the
 * locale COOKIE and, finding none, falls back to `defaultLocale`. It does not look
 * at `Accept-Language` at all. The array form that would express
 * `["cookie", "acceptLanguage"]` does not exist in this version, so the header is
 * honoured in `proxy.ts` by deriving the cookie before next-intl runs — which
 * keeps one ordering rule, in one place, and reuses the tested
 * `negotiateLocale()`.
 *
 * `localePrefix: "always"` is unchanged: every canonical URL keeps its locale, so
 * hreflang and `x-default` (7F) stay meaningful. A4 must not change canonicals.
 */
export const routing = defineRouting({
  locales: ["ar", "en", "ur", "hi", "bn", "fil"],
  defaultLocale: "ar",
  localePrefix: "always",
  localeDetection: true,
  localeCookie: { name: "nabd.locale", maxAge: 60 * 60 * 24 * 365 },
});
