import type { Locale } from "@/lib/i18n";

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
}

export function localizedUrl(locale: Locale, path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}/${locale}${path === "" ? "" : suffix}`;
}
