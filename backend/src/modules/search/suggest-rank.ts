/**
 * Issue 1544 / plan 17.3: how an instant suggestion is matched, ranked and highlighted. Pure functions, shared by the
 * Meilisearch path and the MongoDB fallback, so both give the same tiers and the same highlight ranges.
 */
import { normalizeSearchText } from '../seo-search/seo-search.module';
import { SEARCH_LOCALES, SearchLocale, SearchSection, SearchType, displayName } from './search-documents';

/** Character range in the DISPLAYED name, in UTF-16 code units (what the clients slice with). */
export interface TextRange { start: number; length: number }

/**
 * Match tiers, best first. A name that starts with the typed text; a name where a later word starts with it; a name
 * that holds it inside a word; then the same two checks on the other searchable text (ingredient, alias, synonym).
 */
export const MATCH_TIER = { prefix: 1, word: 2, inside: 3, otherWord: 4, otherInside: 5 } as const;

/** One character folded the way normalizeSearchText folds a whole string (seo-search.module.ts). */
function foldChar(ch: string): string {
  if (/\s/.test(ch) || /[\u0000-\u001F\u007F-\u009F]/.test(ch)) return ' ';
  return ch
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ی/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * The folded text of `value` and, for each folded code unit, the index of the original code unit it came from.
 * Equal to normalizeSearchText(value) for the text; the map lets a match in the folded text be drawn on the original.
 */
export function foldWithMap(value: string): { text: string; from: number[] } {
  let text = '';
  const from: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    for (const c of foldChar(value[i])) {
      if (c === ' ' && (text === '' || text.endsWith(' '))) continue;
      text += c;
      for (let k = 0; k < c.length; k += 1) from.push(i);
    }
  }
  if (text.endsWith(' ')) {
    text = text.slice(0, -1);
    from.pop();
  }
  return { text, from };
}

/**
 * Every place the normalised query occurs in the displayed name, as ranges on the original string. Arabic diacritics,
 * tatweel and the letter variants (أ/إ/آ/ٱ/ا, ى/ي, ة/ه) match, so the ranges can start on a different letter than the
 * query's own spelling; the range always covers whole original characters.
 */
export function highlightRanges(name: string, query: string): TextRange[] {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const { text, from } = foldWithMap(name);
  const ranges: TextRange[] = [];
  for (let p = text.indexOf(q); p !== -1; p = text.indexOf(q, p + q.length)) {
    const start = from[p];
    const end = from[p + q.length - 1] + 1;
    const last = ranges[ranges.length - 1];
    if (last && last.start + last.length === start) last.length = end - last.start;
    else ranges.push({ start, length: end - start });
  }
  return ranges;
}

/** The tier of a normalised query in one name, or null when the name does not hold it. */
export function nameTier(name: string, q: string): number | null {
  const t = foldWithMap(name).text;
  if (!t || !q) return null;
  if (t.startsWith(q)) return MATCH_TIER.prefix;
  if (t.includes(` ${q}`)) return MATCH_TIER.word;
  if (t.includes(q)) return MATCH_TIER.inside;
  return null;
}

/** The tier of a normalised query in the other searchable text of a document (already normalised, ' | ' separated). */
export function otherTier(text: string, q: string): number | null {
  if (!text || !q) return null;
  if (` ${text}`.includes(` ${q}`)) return MATCH_TIER.otherWord;
  if (text.includes(q)) return MATCH_TIER.otherInside;
  return null;
}

/** The row fields the ranking reads (a search_index row, or a Meilisearch hit that carries the displayed fields). */
export interface SuggestRow {
  key: string;
  id: string;
  type: SearchType;
  section?: SearchSection | null;
  names?: Partial<Record<SearchLocale, string>>;
  /** Normalised searchable text (names, ingredient, aliases, synonyms). Not returned by Meilisearch. */
  text?: string;
  boost?: number;
  slug?: string | null;
  code?: string | null;
}

export interface JudgedSuggestion {
  tier: number;
  name: string;
  name_locale: SearchLocale;
  highlights: TextRange[];
}

/** Tier 4 for a Meilisearch hit that matched without a literal name or text match (typo tolerance). */
const MEILI_ONLY_TIER = MATCH_TIER.otherWord;

/**
 * Judges one row for the normalised query `q`. The name shown is the locale's name, unless another locale's name is the
 * better match (then that name is shown and highlighted, so an English match on the Arabic page is visible).
 */
export function judgeSuggestion(row: SuggestRow, q: string, locale: SearchLocale, fromMeili: boolean): JudgedSuggestion | null {
  const names = row.names || {};
  const order = [...new Set<SearchLocale>([locale, 'en', 'ar', ...SEARCH_LOCALES])];
  let best: { tier: number; locale: SearchLocale } | null = null;
  for (const l of order) {
    const n = names[l];
    if (!n) continue;
    const t = nameTier(n, q);
    if (t !== null && (best === null || t < best.tier)) best = { tier: t, locale: l };
  }
  const shown = best ? { name: names[best.locale] as string, name_locale: best.locale } : displayName({ names }, locale);
  if (!shown.name) return null;
  const tier = best ? best.tier : (otherTier(row.text ?? '', q) ?? (fromMeili ? MEILI_ONLY_TIER : null));
  if (tier === null) return null;
  return { tier, name: shown.name, name_locale: shown.name_locale, highlights: highlightRanges(shown.name, q) };
}

/** Best first: match tier, then popularity (boost), then the shorter name, then the id. */
export function compareSuggestions(
  a: { tier: number; boost: number; nameLength: number; id: string },
  b: { tier: number; boost: number; nameLength: number; id: string },
): number {
  return a.tier - b.tier || b.boost - a.boost || a.nameLength - b.nameLength || a.id.localeCompare(b.id);
}
