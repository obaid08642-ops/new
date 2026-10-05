/**
 * P15.5 — every Sentry event carries the release it shipped in, so a crash
 * can be tied to a deploy instead of floating in "latest".
 *
 * Shared contract across all four clients: `{appId}@{version}+{build}` with
 * this client's appId (`patient-web`); dev builds append `+dev`.
 * `SENTRY_RELEASE` wins when CI sets it (it already carries the full
 * contracted name); otherwise the name is derived from the environment —
 * never hard-coded — keeping the legacy `NEXT_PUBLIC_SENTRY_RELEASE` this
 * client already supported as the explicit fallback, and
 * `NEXT_PUBLIC_APP_VERSION` as the version fallback.
 */

/** Sentry application id for this client. A routing label, never a secret. */
export const PATIENT_WEB_SENTRY_APP_ID = "patient-web";

export type ReleaseEnv = {
  SENTRY_RELEASE?: string;
  NEXT_PUBLIC_SENTRY_RELEASE?: string;
  NEXT_PUBLIC_APP_VERSION?: string;
  SENTRY_BUILD?: string;
  GIT_SHA?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
  NODE_ENV?: string;
};

function clean(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getSentryRelease(env: ReleaseEnv = process.env as ReleaseEnv): string {
  const explicit = clean(env.SENTRY_RELEASE) || clean(env.NEXT_PUBLIC_SENTRY_RELEASE);
  if (explicit) return explicit;
  const version = clean(env.NEXT_PUBLIC_APP_VERSION) || "dev";
  const build = clean(env.SENTRY_BUILD) || clean(env.GIT_SHA) || clean(env.VERCEL_GIT_COMMIT_SHA) || "dev";
  const base = `${PATIENT_WEB_SENTRY_APP_ID}@${version}+${build}`;
  const isDev = (env.NODE_ENV ?? "development") !== "production";
  if (isDev && !base.endsWith("+dev")) return `${base}+dev`;
  return base;
}
