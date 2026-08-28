import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendar } from 'react-native-localize';

/**
 * Central calendar handling for the patient app.
 *
 * The bare 'ar-SA' locale renders dates in the Hijri (Umm al-Qura) calendar.
 * Default is GREGORIAN. The user can switch in Settings:
 *   'gregory' (default) | 'hijri' | 'auto' (follow the device calendar)
 * Hijri rendering uses Intl's islamic-umalqura calendar — deterministic and
 * accurate, never a random approximation.
 */

export type CalendarPref = 'gregory' | 'hijri' | 'auto';

const STORAGE_KEY = '@nabdah_calendar_pref';

let pref: CalendarPref = 'gregory';
let hydrated = false;
const listeners = new Set<() => void>();

function deviceCalendar(): 'gregory' | 'hijri' {
  try {
    const cal = getCalendar?.() || '';
    return /islamic|hijri/i.test(cal) ? 'hijri' : 'gregory';
  } catch {
    return 'gregory';
  }
}

export async function initCalendarPref(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'gregory' || saved === 'hijri' || saved === 'auto') pref = saved;
  } catch {}
  hydrated = true;
  listeners.forEach((l) => l());
}

export function getCalendarPref(): CalendarPref {
  if (!hydrated) initCalendarPref();
  return pref;
}

export async function setCalendarPref(p: CalendarPref): Promise<void> {
  pref = p;
  await AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  listeners.forEach((l) => l());
}

/** Subscribe to pref changes (used by the settings screen). */
export function onCalendarPrefChange(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Locale string honouring the user's calendar preference. */
export function dateLocale(): string {
  const p = getCalendarPref();
  const cal = p === 'auto' ? deviceCalendar() : p === 'hijri' ? 'hijri' : 'gregory';
  return cal === 'hijri' ? 'ar-SA-u-ca-islamic-umalqura' : 'ar-SA-u-ca-gregory';
}

export function fmtDate(d: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString(dateLocale(), opts);
}

export function fmtTime(d: Date | string | number, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit', ...opts });
}
