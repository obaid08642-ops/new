/**
 * Central date formatting — the provider app ALWAYS uses the Gregorian
 * calendar. 'ar-SA' alone defaults to the Hijri (Umm al-Qura) calendar,
 * so the calendar must be pinned explicitly via the -u-ca-gregory extension.
 */
export const DATE_LOCALE_AR = 'ar-SA-u-ca-gregory';
export const DATE_LOCALE_EN = 'en-GB';

export const dateLocale = (ar: boolean) => (ar ? DATE_LOCALE_AR : DATE_LOCALE_EN);

export function fmtDate(d: Date | string | number, ar = true, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString(dateLocale(ar), opts);
}

export function fmtTime(d: Date | string | number, ar = true, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleTimeString(dateLocale(ar), { hour: '2-digit', minute: '2-digit', ...opts });
}

export function fmtDateTime(d: Date | string | number, ar = true, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleString(dateLocale(ar), opts);
}
