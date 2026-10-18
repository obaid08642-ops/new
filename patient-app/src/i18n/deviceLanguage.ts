// Rule 6 (owner, 2026-10-06): the app language follows the device. The device's languages come in its order of
// preference (getLocales()); the first one the app has is used. A device that lists languages but none the app has
// gets English; a device with no language at all gets Arabic.

export type DeviceLanguage = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'fil';

export interface DeviceLocaleEntry {
  languageCode?: string | null;
}

const SUPPORTED: readonly DeviceLanguage[] = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

function asSupported(code: string): DeviceLanguage | null {
  const mapped = code === 'tl' ? 'fil' : code;
  return (SUPPORTED as readonly string[]).includes(mapped) ? (mapped as DeviceLanguage) : null;
}

export function pickDeviceLanguage(locales: readonly DeviceLocaleEntry[]): DeviceLanguage {
  if (locales.length === 0) return 'ar';
  for (const locale of locales) {
    const language = asSupported(String(locale?.languageCode || '').toLowerCase());
    if (language) return language;
  }
  return 'en';
}
