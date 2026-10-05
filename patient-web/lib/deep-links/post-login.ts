import { consumePendingDeepLink, savePendingDeepLink } from "./nabd-links";

/**
 * 7d27a4e / R18 (web part of deferred links): a deep link that needs a
 * session survives the login. The login page records `?next=` (a safe
 * relative path or a nabdplus:// link, validated by nabd-links), and every
 * successful sign-in (password, 2FA, OTP) continues there once, else to the
 * dashboard.
 */
export function rememberDeepLinkFromQuery(search: string): void {
  const next = new URLSearchParams(search).get("next");
  if (next) savePendingDeepLink(next);
}

export function postLoginDestination(locale: string): string {
  return consumePendingDeepLink() ?? `/${locale}/dashboard`;
}
