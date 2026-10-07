/**
 * P15.10 — supported devices (patient-app).
 *
 * Same floors as the provider app (`provider-app/src/deviceSupport/minOs.ts`):
 * they are what Expo SDK 57 (RN 0.86) actually compiles against, so an app
 * built from this repo cannot run below them anyway.
 *   - `node_modules/expo/Expo.podspec`  →  `:ios => '16.4'`
 *   - `node_modules/react-native/gradle/libs.versions.toml`  →  `minSdk = "24"` (Android 7.0)
 *
 * A device below the floor still has to be told *why* it is unsupported and
 * where to go instead, so `meetsMinimumOs` is checked at runtime by
 * `DeviceGate` rather than being left to a silent launch failure.
 */

/** Minimum supported OS versions. Keep in sync with the values quoted above. */
export const MIN_OS = {
  ios: 16.4,
  /** Android 7.0 Nougat — RN 0.86's minSdk of 24. */
  android: 7,
} as const;

export type SupportedOs = keyof typeof MIN_OS;

/** The only native platforms this app is built for. Web has no floor. */
export const SUPPORTED_PLATFORMS: readonly SupportedOs[] = ['ios', 'android'];

/** Where an unsupported device is sent instead. */
export const WEBSITE_URL = 'https://nabd.plus';

/**
 * Compare `[major, minor]` pairs.
 */
export function compareOsVersions(a: [number, number], b: [number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

/**
 * Parse `"16.4"`, `"16.4.1"`, `"7"`, `7`, 16.4 into comparable `[major, minor]`.
 * Returns null for anything unusable so callers fall back to "show the gate".
 */
export function parseOsVersion(raw: unknown): [number, number] | null {
  // Numbers go through the string path: `16.4 - 16 === 0.40000000000000036`, so arithmetic
  // on the fractional part is not reliable. `String(16.4)` is exactly "16.4".
  const text = typeof raw === 'number' ? String(raw) : raw;
  if (typeof text !== 'string') return null;
  const match = /^\s*(\d+)(?:[.\-_](\d+))?/.exec(text);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = match[2] === undefined ? 0 : Number(match[2]);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  return [major, minor];
}

/**
 * The floor as a comparable pair. `MIN_OS.ios` is the human-facing 16.4, which must be
 * split into major/minor rather than compared as a float against `[16, 4]`.
 */
export function minimumOsPair(os: SupportedOs): [number, number] {
  return parseOsVersion(MIN_OS[os]) ?? [0, 0];
}

/**
 * Does `version` meet the floor for `os`?
 *
 * Unsupported platforms and unparseable versions answer `false`: showing the
 * explanatory message is the safe direction to fail.
 */
export function meetsMinimumOs(os: string, version: unknown): boolean {
  if (!SUPPORTED_PLATFORMS.includes(os as SupportedOs)) return false;
  const parsed = parseOsVersion(version);
  if (!parsed) return false;
  return compareOsVersions(parsed, minimumOsPair(os as SupportedOs)) >= 0;
}

/** Human-readable floor, e.g. "iOS 16.4" / "Android 7". */
export function minimumOsLabel(os: string, lang: 'ar' | 'en' = 'en'): string {
  const normalized = String(os || '').toLowerCase();
  if (normalized === 'ios') return lang === 'ar' ? 'iOS 16.4 أو أحدث' : 'iOS 16.4 or newer';
  if (normalized === 'android') return lang === 'ar' ? 'Android 7 أو أحدث' : 'Android 7 or newer';
  return lang === 'ar' ? 'إصدار نظام حديث' : 'a recent OS version';
}

/** Localized copy for the unsupported-device screen. */
export function unsupportedDeviceCopy(os: string, lang: 'ar' | 'en' = 'ar') {
  const floor = minimumOsLabel(os, lang);
  if (lang === 'en') {
    return {
      title: 'This device is too old',
      body: `Nabd+ needs ${floor} to run. Your device cannot be updated, so please continue on the website instead.`,
      action: 'Continue on the website',
      sub: 'Everything you can do in the app is also available on the web.',
    };
  }
  return {
    title: 'هذا الجهاز قديم جداً',
    body: `يحتاج تطبيق نبض بلس إلى ${floor} للعمل، ولا يمكن تحديث جهازك، لذا تابع عبر الموقع.`,
    action: 'متابعة عبر الموقع',
    sub: 'كل ما يمكنك فعله في التطبيق متاح أيضاً على الموقع.',
  };
}
