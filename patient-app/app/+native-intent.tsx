// D2: web-to-app path mapping for deep links (expo-router native intent).
//
// When a user taps a web link (https://nabd.plus/en/p/xxx) and the app is installed, iOS universal links /
// Android app links open the app and expo-router passes the URL to `redirectSystemPath` before routing.
// The locale prefix becomes the app language (applied by AppProvider through the picker's setLang) and the
// web path is mapped to the matching app route (src/navigation/webLinkMap.ts).

import { requestDeepLinkLanguage } from '../src/navigation/deepLinkLanguage';
import { resolveWebLink } from '../src/navigation/webLinkMap';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const { route, lang } = resolveWebLink(path);
    if (lang) requestDeepLinkLanguage(lang);
    return route;
  } catch {
    // never crash the app on a malformed link: open the home screen
    return '/';
  }
}
