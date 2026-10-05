/**
 * 15.5 — crash and error reporting with releases and source maps.
 *
 * `@sentry/react-native` is already a dependency and `@sentry/react-native` is
 * already listed as an Expo config plugin (so Sentry's Gradle/Xcode steps upload
 * source maps on build). What was missing is a RELEASE: without one, every event
 * from every build lands in the same bucket and a stack trace cannot be tied to
 * the JavaScript that produced it. This module derives one, attaches it to every
 * event, and degrades to a no-op when no DSN is configured (Expo Go, CI, tests)
 * rather than throwing at startup.
 *
 * The DSN is an owner secret: `EXPO_PUBLIC_SENTRY_DSN` is read from the
 * environment and is deliberately not committed. With no DSN this module still
 * computes and exposes the release, so the wiring is testable without one.
 */
import { Platform } from 'react-native';
import { APP_VERSION } from '../../constants';

export type CrashReporter = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown, hint?: Record<string, unknown>) => void;
  captureMessage: (message: string, hint?: Record<string, unknown>) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: Record<string, unknown> | null) => void;
  setContext: (name: string, context: Record<string, unknown> | null) => void;
};

/**
 * The shared Sentry contract every client implements with its own appId:
 * `{appId}@{version}+{build}`, with `+dev` appended for dev builds. The
 * version comes from the shipped app constants and the build number from the
 * native binary — never hardcoded. Resolution order: an explicit release
 * (CI) wins, then env `SENTRY_RELEASE`, then the legacy
 * `EXPO_PUBLIC_SENTRY_RELEASE` fallback. The build number keeps the bundle
 * distinguishable across two native builds of the same JS.
 */
export const SENTRY_APP_ID = 'patient-app' as const;

export function resolveRelease(options?: {
  version?: string;
  build?: string | number | null;
  explicit?: string | null;
  /** Defaults to the `__DEV__` global; pass explicitly in tests. */
  dev?: boolean;
}): string {
  const explicit =
    options?.explicit ?? process.env.SENTRY_RELEASE ?? process.env.EXPO_PUBLIC_SENTRY_RELEASE;
  if (explicit && explicit.trim()) return explicit.trim();

  const version = options?.version ?? APP_VERSION;
  const build = options?.build ?? null;
  const buildSuffix = build == null || build === '' ? 'source' : String(build);
  const dev = options?.dev ?? (typeof __DEV__ !== 'undefined' && __DEV__);
  return `${SENTRY_APP_ID}@${version}+${buildSuffix}${dev ? '+dev' : ''}`;
}

function readNativeBuildNumber(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    const nativeBuild =
      Constants?.expoConfig?.ios?.buildNumber ??
      Constants?.expoConfig?.android?.versionCode ??
      Constants?.nativeBuildVersion ??
      null;
    return nativeBuild == null ? null : String(nativeBuild);
  } catch {
    return null;
  }
}

function readAppVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    return Constants?.expoConfig?.version ?? APP_VERSION;
  } catch {
    return APP_VERSION;
  }
}

/** Injected in tests; defaults to the real module (or null when unavailable). */
function loadSentry(): CrashReporter | null {
  try {
    if (Platform.OS === 'web') return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@sentry/react-native');
    const sentry = mod?.default ?? mod;
    return typeof sentry?.init === 'function' ? (sentry as CrashReporter) : null;
  } catch {
    return null;
  }
}

export interface CrashState {
  initialised: boolean;
  /** False when no DSN is configured; reporting is then a no-op. */
  enabled: boolean;
  release: string;
  environment: string;
  dsn: string;
}

let sentry: CrashReporter | null = null;
let state: CrashState = {
  initialised: false,
  enabled: false,
  release: resolveRelease(),
  environment: __DEV__ ? 'development' : 'production',
  dsn: '',
};

export function getCrashState(): CrashState {
  return state;
}

export function getRelease(): string {
  return state.release;
}

export interface InitCrashOptions {
  dsn?: string;
  release?: string;
  environment?: string;
  /** Injected in tests. */
  reporter?: CrashReporter | null;
  tracesSampleRate?: number;
}

/**
 * Start reporting. Safe to call with no DSN: `initialised` becomes true,
 * `enabled` stays false, and every capture becomes a no-op.
 */
export function initCrashReporting(options: InitCrashOptions = {}): CrashState {
  const dsn = options.dsn ?? process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
  const release = options.release ?? resolveRelease({
    version: readAppVersion(),
    build: readNativeBuildNumber(),
  });
  const environment = options.environment ?? (__DEV__ ? 'development' : 'production');
  const reporter = options.reporter !== undefined ? options.reporter : loadSentry();

  state = {
    initialised: true,
    enabled: !!dsn && !!reporter,
    release,
    environment,
    dsn,
  };
  sentry = reporter;

  if (!state.enabled) {
    if (!dsn) {
      console.warn('[crash] No EXPO_PUBLIC_SENTRY_DSN configured; error reporting is disabled.');
    }
    return state;
  }

  try {
    sentry!.init({
      dsn,
      // The release is what makes a stack trace resolvable to a source map.
      release,
      environment,
      debug: __DEV__,
      enableAutoSessionTracking: true,
      tracesSampleRate: options.tracesSampleRate ?? (__DEV__ ? 1.0 : 0.2),
      // The release is also a tag so it is visible in a Sentry issue's tags tab
      // even when the SDK was initialised before this module ran.
      beforeSend: (event: any) => {
        if (!event) return event;
        event.tags = { ...(event.tags || {}), release };
        event.release = event.release ?? release;
        return event;
      },
    });
    sentry!.setTag('release', release);
  } catch (error: any) {
    // A monitoring SDK must never be the reason the app fails to start.
    console.warn('[crash] Sentry init failed:', error?.message ?? error);
    state = { ...state, enabled: false };
  }
  return state;
}

function ensureInitialised(): void {
  if (!state.initialised) initCrashReporting();
}

/**
 * Report a caught error. The release travels with the event, so the payload a
 * test (or Sentry) sees always names the build that produced it.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  ensureInitialised();
  if (!state.enabled || !sentry) return;
  try {
    sentry.setTag('release', state.release);
    sentry.captureException(error, {
      tags: { release: state.release },
      extra: { release: state.release, environment: state.environment, ...context },
    });
  } catch {
    // Reporting must never throw into the caller.
  }
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  ensureInitialised();
  if (!state.enabled || !sentry) return;
  try {
    sentry.setTag('release', state.release);
    sentry.captureMessage(message, {
      tags: { release: state.release },
      extra: { release: state.release, environment: state.environment, ...context },
    });
  } catch {
    // Ignored on purpose.
  }
}

export function addBreadcrumb(breadcrumb: Record<string, unknown>): void {
  if (!state.enabled || !sentry) return;
  try {
    sentry.addBreadcrumb({ ...breadcrumb, tags: { release: state.release } });
  } catch {
    // Ignored on purpose.
  }
}

export function setCrashUser(user: { id: string; email?: string; name?: string } | null): void {
  if (!state.enabled || !sentry) return;
  try {
    sentry.setUser(user ? { id: user.id, email: user.email || '', username: user.name || user.id } : null);
  } catch {
    // Ignored on purpose.
  }
}

export function setCrashContext(name: string, context: Record<string, unknown> | null): void {
  if (!state.enabled || !sentry) return;
  try {
    sentry.setContext(name, context);
  } catch {
    // Ignored on purpose.
  }
}

/** Reset for tests. */
export function __resetCrashReporting(): void {
  sentry = null;
  state = {
    initialised: false,
    enabled: false,
    release: resolveRelease(),
    environment: __DEV__ ? 'development' : 'production',
    dsn: '',
  };
}
