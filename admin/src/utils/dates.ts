/**
 * Admin date locale: Gregorian default, Hijri opt-in (per-admin preference).
 * Stored in localStorage; SSR-safe (defaults to Gregorian on server).
 */
export type AdminCalendar = 'gregory' | 'islamic-umalqura';

const KEY = 'nabd-admin-calendar';

export function getAdminCalendar(): AdminCalendar {
  try {
    if (typeof window === 'undefined') return 'gregory';
    return window.localStorage.getItem(KEY) === 'islamic-umalqura' ? 'islamic-umalqura' : 'gregory';
  } catch {
    return 'gregory';
  }
}

export function setAdminCalendar(cal: AdminCalendar) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, cal);
  } catch { /* private mode */ }
}

/** Locale tag for Intl formatters — use instead of hardcoded 'ar-SA'. */
export function dateLocale(): string {
  return getAdminCalendar() === 'islamic-umalqura' ? 'ar-SA-u-ca-islamic-umalqura' : 'ar-SA-u-ca-gregory';
}

/** Drop-in formatter honoring the admin's calendar preference. */
export function formatAdminDate(input: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!input) return '—';
  try {
    return new Date(input).toLocaleString(dateLocale(), options);
  } catch {
    return String(input);
  }
}
