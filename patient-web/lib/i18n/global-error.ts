import type { SiteLocale } from "@/lib/i18n/device-locale";

export type GlobalErrorCopy = { dir: "rtl" | "ltr"; title: string; body: string; retry: string; returnHome: string };

const RTL = new Set<SiteLocale>(["ar", "ur"]);

/** The message file of one language, read only when it is asked for (one import per language, no path template). */
function messagesOf(locale: SiteLocale): Promise<{ default: { RouteState: Record<string, string> } }> {
  switch (locale) {
    case "ar": return import("@/messages/ar.json");
    case "en": return import("@/messages/en.json");
    case "ur": return import("@/messages/ur.json");
    case "hi": return import("@/messages/hi.json");
    case "bn": return import("@/messages/bn.json");
    case "fil": return import("@/messages/fil.json");
  }
}

/**
 * 15.5: the strings of the root error page, from the same message files as the rest of the site. They are loaded only when
 * the error page is shown, so the message files stay out of the pages that do not fail. (A template-path import put a webpack
 * context map of all six files into the shared entry: about 1.9 KB more on the doctors page's script, measured on build.)
 */
export async function loadGlobalErrorCopy(locale: SiteLocale): Promise<GlobalErrorCopy> {
  const copy = (await messagesOf(locale)).default.RouteState;
  return {
    dir: RTL.has(locale) ? "rtl" : "ltr",
    title: copy.errorTitle,
    body: copy.errorBody,
    retry: copy.retry,
    returnHome: copy.returnHome,
  };
}
