/**
 * Issue 1547: equivalents of a product on the public product page.
 *
 * The catalogue's `active_ingredient` is free text typed by many hands ("Paracetamol", "paracetamol ",
 * "Acetaminophen", "إيبوبروفين /", "Caffeine + Paracetamol"), so an exact string match finds almost nothing. Two products
 * are equivalents when the NORMALIZED ingredient set is the same: Arabic and Latin text normalized as the search does,
 * the parts of a combination split on + / , ; & and sorted, the words in brackets dropped, and the known synonyms of
 * the multilingual map (paracetamol = acetaminophen = باراسيتامول) folded onto one name. Strength and form are compared
 * the same way, so "500 mg", "500mg" and "٥٠٠ مجم" are one strength.
 *
 * Pure functions only: the service (SeoSearchService.publicProductEquivalents) reads the rows and ranks them here.
 */
import { MULTILINGUAL_SYNONYM_MAP, normalizeSearchText } from './seo-search.module';

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const toAsciiDigits = (s: string) =>
  s.replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) & 0xf) % 10));

let synonymIndex: Map<string, string> | null = null;
/** Every normalized variant of the multilingual map → its canonical name (built once). */
function synonyms(): Map<string, string> {
  if (synonymIndex) return synonymIndex;
  const index = new Map<string, string>();
  for (const entry of MULTILINGUAL_SYNONYM_MAP) {
    for (const v of [entry.canonical, ...entry.variants]) {
      const nv = normalizeSearchText(v);
      if (nv && !index.has(nv)) index.set(nv, entry.canonical);
    }
  }
  synonymIndex = index;
  return index;
}

/** The normalized, de-duplicated, sorted parts of an active ingredient (empty when there is none). */
export function ingredientParts(raw?: string | null): string[] {
  const text = normalizeSearchText(toAsciiDigits(String(raw ?? ''))).replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
  const parts = text
    .split(/\s*(?:\+|\/|,|،|;|؛|&|\band\b|\bwith\b|\sو\s)\s*/u)
    .map((p) => p.replace(/[^\p{L}\p{N}\s.-]/gu, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 2)
    .map((p) => synonyms().get(p) ?? p);
  return [...new Set(parts)].sort();
}

/** One string per ingredient set; '' when the product has no ingredient. */
export function ingredientKey(raw?: string | null): string {
  return ingredientParts(raw).join(' + ');
}

const UNITS: Array<[RegExp, string]> = [
  [/(?:mgs?|milligrams?|ملجم|مجم|ملغ|مغ|ملليجرام|مليجرام)/g, 'mg'],
  [/(?:mcg|µg|μg|micrograms?|ميكروجرام|ميكروغرام|مكجم)/g, 'mcg'],
  [/(?:mls?|millilit(?:er|re)s?|ملل|مل)/g, 'ml'],
  [/(?:grams?|gm|جرام|غرام|جم|غ)/g, 'g'],
  [/(?:i\.?u\.?|units?|وحدة دولية|وحده دوليه|وحدة|وحده)/g, 'iu'],
];

/** "500 mg", "500mg", "٥٠٠ مجم" → "500mg"; '' when there is no strength. */
export function strengthKey(raw?: string | null): string {
  let s = normalizeSearchText(toAsciiDigits(String(raw ?? ''))).replace(/(\d),(\d)/g, '$1.$2');
  for (const [rx, unit] of UNITS) s = s.replace(rx, unit);
  return s.replace(/\s+/g, '');
}

/** The dosage form as one comparable word set ("Tablets" and "tablets " are the same form). */
export function formKey(raw?: string | null): string {
  return normalizeSearchText(String(raw ?? '')).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// literal characters (not \u escapes): the pattern runs in MongoDB's PCRE, which has no \u syntax
const DIACRITICS = '[\u064B-\u065F\u0670\u0640]*';
/** A normalized letter as the raw text may spell it (hamza forms of alef, yeh/alef maqsura, teh marbuta, any case). */
function letterClass(ch: string): string {
  if (ch === 'ا') return '[اأإآٱ]';
  if (ch === 'ي') return '[يىی]';
  if (ch === 'ه') return '[هة]';
  return escape(ch);
}

/**
 * A case-insensitive pattern that finds every raw spelling of one normalized ingredient part (and of its synonyms),
 * to narrow the rows the service reads; the exact comparison is done on ingredientKey afterwards.
 */
export function ingredientCandidatePattern(parts: string[]): string | null {
  if (!parts.length) return null;
  // the longest part is the most selective one
  const anchor = [...parts].sort((a, b) => b.length - a.length)[0];
  const canonical = synonyms().get(anchor) ?? anchor;
  const spellings = new Set<string>([anchor]);
  for (const [variant, name] of synonyms()) if (name === canonical) spellings.add(variant);
  const alternatives = [...spellings].map((w) => [...w].map((ch) => (ch === ' ' ? '\\s+' : letterClass(ch))).join(DIACRITICS));
  return `(?:${alternatives.join('|')})`;
}

export type EquivalentRow = {
  id: string;
  active_ingredient?: string | null;
  strength?: string | null;
  form?: string | null;
  usage_count?: number | null;
  price?: number | null;
};

/**
 * The equivalents of `product` among `rows`, best first: the same ingredient set AND strength, then the same ingredient
 * set; inside each, the same form first, then the most used, then the cheaper. The product itself and rows without a
 * price (nothing to buy) are left out.
 */
export function rankEquivalents<T extends EquivalentRow>(product: EquivalentRow, rows: T[], limit: number): T[] {
  const key = ingredientKey(product.active_ingredient);
  if (!key) return [];
  const strength = strengthKey(product.strength);
  const form = formKey(product.form);
  return rows
    .filter((r) => r.id !== product.id && Number(r.price) > 0 && ingredientKey(r.active_ingredient) === key)
    .map((r) => ({
      r,
      sameStrength: strength !== '' && strengthKey(r.strength) === strength ? 1 : 0,
      sameForm: form !== '' && formKey(r.form) === form ? 1 : 0,
    }))
    .sort((a, b) =>
      b.sameStrength - a.sameStrength
      || b.sameForm - a.sameForm
      || Number(b.r.usage_count || 0) - Number(a.r.usage_count || 0)
      || Number(a.r.price) - Number(b.r.price))
    .slice(0, limit)
    .map((x) => x.r);
}
