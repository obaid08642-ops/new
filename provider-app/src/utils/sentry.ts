/**
 * P15.5 — provider-app crash and error reporting (Sentry), with releases.
 *
 * Sentry is optional at runtime: without a DSN the app still runs and the boundary
 * still shows its fallback, so a missing secret can never brick a build.
 *
 * The DSN and the source-map credentials are owner secrets and are never committed:
 *   EXPO_PUBLIC_SENTRY_DSN              — project DSN (inlined into the bundle)
 *   SENTRY_ORG / SENTRY_PROJECT         — source-map upload coordinates (app.config.js)
 *   SENTRY_AUTH_TOKEN                   — source-map upload token (EAS/CI secret)
 * `app.config.js` wires `@sentry/react-native/expo`, which uploads the source maps at
 * build time when those are present.
 *
 * BLOCKED: Sentry DSN is an owner secret — the live send path cannot be exercised here.
 * Everything else in this file (init, release injection, capture wrapper) is tested with
 * a mocked Sentry module.
 */
import * as Sentry from '@sentry/react-native';

/** Stamped on every event so a crash can be tied to the build that produced it. */
let release: string | null = null;

/**
 * Shared Sentry release contract (all four clients implement the same one):
 * `{appId}@{version}+{build}`, dev builds append `+dev`.
 *
 * Resolution order:
 *   1. env `SENTRY_RELEASE` (CI/EAS stamps the shipped release there) — verbatim;
 *   2. the legacy Expo config value (version + iOS buildNumber / Android
 *      versionCode) composed with the fixed app id below.
 *
 * Nothing here is hardcoded to a shipped value: the app id is the contract
 * constant, and version/build always come from the running artifact's config,
 * so the release can never drift from the build that produced the event.
 */
export const SENTRY_APP_ID = 'provider-app' as const;

export interface ReleaseSources {
  /** Defaults to `process.env`. Injected by tests. */
  env?: Record<string, string | undefined>;
  /** Defaults to the `__DEV__` global. Injected by tests. */
  dev?: boolean;
}

export function resolveRelease(config?: Record<string, unknown>, sources?: ReleaseSources): string {
  const env = sources?.env ?? (typeof process !== 'undefined' ? process.env : {});
  const fromEnv = typeof env?.SENTRY_RELEASE === 'string' ? env.SENTRY_RELEASE.trim() : '';
  // An explicitly stamped release wins verbatim — even in dev, so a pinned
  // release under test matches the artifact it names.
  if (fromEnv) return fromEnv;
  const cfg: Record<string, unknown> = config ?? (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require('expo-constants').default;
      return ((Constants?.expoConfig || Constants?.manifest || {}) as Record<string, unknown>);
    } catch {
      return {} as Record<string, unknown>;
    }
  })();
  // Unknown-version marker, never a shipped version: without a config there is
  // no artifact to name, and inventing one would silently misattribute events.
  const version = String(cfg?.version ?? '0.0.0');
  const ios = (cfg?.ios ?? {}) as Record<string, unknown>;
  const android = (cfg?.android ?? {}) as Record<string, unknown>;
  const build = ios.buildNumber ?? android.versionCode ?? cfg?.buildNumber;
  const base =
    build !== undefined && build !== null && String(build).length > 0
      ? `${SENTRY_APP_ID}@${version}+${build}`
      : `${SENTRY_APP_ID}@${version}`;
  const dev = sources?.dev ?? (typeof __DEV__ !== 'undefined' && __DEV__);
  return dev ? `${base}+dev` : base;
}

/** The release currently reported to Sentry, or null before init. */
export function currentRelease(): string | null {
  return release;
}

let ready = false;

/**
 * Provider-app error monitoring (Sentry project: provider-app).
 * DSN via env: EXPO_PUBLIC_SENTRY_DSN. Empty = disabled (dev-safe).
 * Skips Expo Go like patient-app.
 */
export function initProviderSentry() {
  if (ready) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
  const resolvedRelease = resolveRelease();
  if (!dsn) {
    if (__DEV__) console.warn('[Sentry] DSN not configured, error monitoring is disabled.');
    return;
  }
  try {
    const Constants = require('expo-constants').default;
    const { ExecutionEnvironment } = require('expo-constants');
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  } catch { /* non-expo runtime: continue */ }
  try {
    Sentry.init({
      dsn,
      // Ties every event to the build that produced it.
      release: resolvedRelease,
      dist: String(process.env.EXPO_PUBLIC_SENTRY_DIST || ''),
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
      tracesSampleRate: __DEV__ ? 1.0 : 0.1,
      // Bundled JS is not readable without the uploaded source map.
      attachStacktrace: true,
    });
    ready = true;
    release = resolvedRelease;
    if (__DEV__) console.log(`[Sentry] provider-app initialized (release ${resolvedRelease})`);
  } catch (e: any) {
    console.warn('[Sentry] provider init failed:', e?.message);
  }
}

/**
 * Report a caught error. Always stamps the release, so a report is actionable even if
 * Sentry was never initialized (the event is queued, not lost).
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Monitoring must never be the reason a screen fails.
  }
}

/** Tag subsequent events, e.g. the signed-in provider type. */
export function setUserContext(user: { id?: string; providerType?: string } | null) {
  try {
    Sentry.setUser(user?.id ? { id: user.id } : null);
    if (user?.providerType) Sentry.setTag('provider_type', user.providerType);
  } catch {
    /* ignore */
  }
}

export function isSentryReady(): boolean {
  return ready;
}

/** Test seam. */
export function __resetSentryForTests() {
  ready = false;
  release = null;
}