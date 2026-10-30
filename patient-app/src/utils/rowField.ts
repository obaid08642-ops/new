import { currentDbLang, TRANSLATION_KEY_MAP } from './localize';
import {
  fieldMark,
  markByScript,
  resolveLocalizedField,
  resolveLocalizedList,
  type FieldMark,
  type PerLocaleText,
} from './localizedField';

/**
 * Catalogue rows (medicine, lab, scan, nursing) to a text plus its language mark, through the one fallback rule (localizedField.ts).
 * A row holds `<base>_ar`, `<base>_en`, optional `<base>_<lang>` columns and a `translations[lang][key]` map; a plain `<base>` column is
 * read as one more candidate (the script check files it under its real language). A field with per-language texts is "multilingual" (the
 * page's own text, else a labelled English); a name or category held in Arabic and English only is not.
 */
export type Resolved = { text: string; mark?: FieldMark };
type Row = Record<string, unknown> | null | undefined;

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const lines = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((x) => x.trim()) : str(v).split('\n').filter((x) => x.trim()));

const OTHER = ['ur', 'hi', 'bn', 'tl'] as const;

/** Short facts held in Arabic and English only (as the catalogue does): never "multilingual", so English on ur/hi/bn/tl is the page's own text. */
const SHORT_FACTS = new Set(['name', 'category', 'sub_category', 'form', 'strength', 'active_ingredient']);

/** The per-language texts a row holds for `base` (translations map, or `<base>_ur` columns); undefined when it holds none. */
function perLocaleOf(row: Row, base: string, mapKey: string): Record<string, unknown> | undefined {
  if (!row) return undefined;
  const out: Record<string, unknown> = {};
  // a leaflet text of a row that carries the translations map is a multilingual field: the page's own text, else a labelled English
  const multilingual = !SHORT_FACTS.has(base) && !!row.translations && typeof row.translations === 'object';
  const tr = row.translations as Record<string, Record<string, unknown>> | undefined;
  for (const l of OTHER) {
    const v = tr?.[l]?.[mapKey] ?? row[`${base}_${l}`];
    if (v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : str(v).trim())) out[l] = v;
  }
  return Object.keys(out).length || multilingual ? out : undefined;
}

/** A text field of a row in the app's language, English then Arabic as the fallback, with the mark to draw. */
export function rowField(row: Row, base: string, locale: string = currentDbLang()): Resolved {
  if (!row) return { text: '' };
  const per = perLocaleOf(row, base, TRANSLATION_KEY_MAP[base] ?? base);
  const perLocale: PerLocaleText | undefined = per ? Object.fromEntries(Object.entries(per).map(([k, v]) => [k, Array.isArray(v) ? v.map(str).join('\n') : str(v)])) : undefined;
  const field = resolveLocalizedField({ locale, ar: str(row[`${base}_ar`]), en: str(row[`${base}_en`]) || str(row[base]), perLocale });
  return { text: field.text, mark: fieldMark(field, locale) };
}

/** A list field (preparation, side effects as lines) of a row: one language for the whole list, with its mark. */
export function rowList(row: Row, base: string, locale: string = currentDbLang()): { items: string[]; mark?: FieldMark } {
  if (!row) return { items: [] };
  const per = perLocaleOf(row, base, TRANSLATION_KEY_MAP[base] ?? base);
  const perLocale = per ? Object.fromEntries(Object.entries(per).map(([k, v]) => [k, lines(v)])) : undefined;
  const list = resolveLocalizedList({ locale, ar: lines(row[`${base}_ar`]), en: lines(row[`${base}_en`]).concat(lines(row[base])), perLocale });
  return { items: list.items, mark: fieldMark({ ...list, text: list.items[0] ?? '' }, locale) };
}

/** A name the API already chose the language of (search suggestions, a booked item's name): only its script is checked. */
export const nameMark = (text: string | null | undefined, locale: string = currentDbLang()): FieldMark | undefined => markByScript(locale, text);
