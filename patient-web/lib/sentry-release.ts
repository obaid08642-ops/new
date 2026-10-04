/**
 * P15.5 — every Sentry event carries the release it shipped in, so a crash
 * can be tied to a deploy instead of floating in "latest".
 *
 * Resolution order: CI sets NEXT_PUBLIC_SENTRY_RELEASE to the git SHA;
 * otherwise the public app version; otherwise an explicit dev marker (never
 * an empty string — an empty release silently ungroups every event).
 */

export const DEV_RELEASE = "patient-web-dev";

export type ReleaseEnv = { NEXT_PUBLIC_SENTRY_RELEASE?: string; NEXT_PUBLIC_APP_VERSION?: string };

export function getSentryRelease(env: ReleaseEnv = process.env as ReleaseEnv): string {
  const fromCi = env.NEXT_PUBLIC_SENTRY_RELEASE?.trim();
  if (fromCi) return fromCi;
  const fromApp = env.NEXT_PUBLIC_APP_VERSION?.trim();
  if (fromApp) return fromApp;
  return DEV_RELEASE;
}
