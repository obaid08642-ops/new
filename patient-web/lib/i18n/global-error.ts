import type { SiteLocale } from "@/lib/i18n/device-locale";

export type GlobalErrorCopy = { dir: "rtl" | "ltr"; title: string; body: string; retry: string; returnHome: string };

const RTL = new Set<SiteLocale>(["ar", "ur"]);

/**
 * 15.5: the strings of the root error page, from the same message files as the rest of the site. They are loaded only when
 * the error page is shown (a dynamic import per language), so the six message files never join the bundle of the pages
 * that do not fail: a static import here was seen to push the doctors page script far over its budget in Lighthouse (418 KB against 174 KB).
 */
export async function loadGlobalErrorCopy(locale: SiteLocale): Promise<GlobalErrorCopy> {
  const messages = (await import(`@/messages/${locale}.json`)).default as { RouteState: Record<string, string> };
  const copy = messages.RouteState;
  return {
    dir: RTL.has(locale) ? "rtl" : "ltr",
    title: copy.errorTitle,
    body: copy.errorBody,
    retry: copy.retry,
    returnHome: copy.returnHome,
  };
}
