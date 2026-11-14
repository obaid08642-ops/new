import { currentDbLang, pickLocalized } from './localize';

/**
 * Issue 1832: the booking's name from the server's `names` map. Names of catalogue data are Arabic and English only (owner decision
 * 2026-10-25): the Arabic app shows `ar`, every other language (Urdu, Hindi, Bengali, Filipino included) shows `en`; the stored
 * Arabic/English when the map has none.
 */
export function pickBookingName(names: unknown, ar: unknown, en: unknown): string | undefined {
  if (names && typeof names === 'object' && !Array.isArray(names)) {
    const map = names as Record<string, unknown>;
    const lang = currentDbLang();
    const arabic = typeof map.ar === 'string' && map.ar.trim() ? map.ar : undefined;
    const english = typeof map.en === 'string' && map.en.trim() ? map.en : undefined;
    return (lang === 'ar' ? arabic ?? english : english ?? arabic) ?? pickLocalized(ar as string | undefined, en as string | undefined);
  }
  return pickLocalized(ar as string | undefined, en as string | undefined);
}
