/**
 * Filling the gaps of the product content (owner complaint 2026-10-26): a text that exists in one language and is missing in another is
 * TRANSLATED from the existing text, never invented. Pure rules shared by the batch tool (`scripts/translate-product-content.ts`) and the
 * guarded catalogue-apply step (`planProductTranslations`): which texts are missing, the request for the model, and the checks an answer
 * must pass before it can be written. Order of the targets: ar and en first, then ur, hi, bn and fil.
 */
import { CONTENT_FIELDS, textLanguage, storedContentText, type ContentField, type ContentLocale } from './med-i18n';

export const TARGET_ORDER: readonly ContentLocale[] = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

/** The field written for a locale: the `_ar` / `_en` column of a long text, else `translations.<db>.<key>`. */
const COLUMN: Partial<Record<ContentField, string>> = {
  description: 'description', indications: 'indications', dosage_instructions: 'dosage', how_to_use: 'usage_instructions', warnings: 'warnings',
  side_effects: 'side_effects', storage_conditions: 'storage_conditions', package_content_details: 'package_content_details',
};
const TR_KEY: Record<ContentField, string> = {
  description: 'description', indications: 'indications_uses', dosage_instructions: 'dosage_instructions', how_to_use: 'how_to_use', warnings: 'warnings_precautions',
  side_effects: 'side_effects', storage_conditions: 'storage_conditions', package_content_details: 'package_content_details',
  active_ingredient: 'active_ingredient', form: 'dosage_form', package_size: 'size_volume', category: 'main_category', sub_category: 'sub_category',
};
const DB: Record<ContentLocale, string> = { ar: 'ar', en: 'en', ur: 'ur', hi: 'hi', bn: 'bn', fil: 'tl' };

export function storagePath(field: ContentField, locale: ContentLocale): string {
  const column = COLUMN[field];
  return column && (locale === 'ar' || locale === 'en') ? `${column}_${locale}` : `translations.${DB[locale]}.${TR_KEY[field]}`;
}

export interface Gap { id: string; field: ContentField; source: ContentLocale; target: ContentLocale; text: string }

/** The language to translate FROM: Arabic targets from English, English from Arabic, the others from English, else Arabic. */
export function sourceOrder(target: ContentLocale): ContentLocale[] {
  return target === 'ar' ? ['en'] : target === 'en' ? ['ar'] : ['en', 'ar'];
}

export interface GapReport { gaps: Gap[]; mislabelled: number }

/**
 * The missing texts of one product. A source slot whose letters are in another language (an Arabic text in the English column) is NOT
 * translated from: it is counted as `mislabelled` for a person to look at.
 */
export function findGaps(raw: Record<string, any>): GapReport {
  const gaps: Gap[] = []; let mislabelled = 0;
  const id = String(raw?.id ?? '');
  if (!id) return { gaps, mislabelled };
  for (const target of TARGET_ORDER) {
    for (const field of CONTENT_FIELDS) {
      if (storedContentText(raw, field, target) !== null) continue;
      for (const source of sourceOrder(target)) {
        const text = storedContentText(raw, field, source);
        if (text === null) continue;
        if (textLanguage(text, source) !== source) { mislabelled += 1; break; }
        gaps.push({ id, field, source, target, text });
        break;
      }
    }
  }
  return { gaps, mislabelled };
}

// ── requests ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const LANGUAGE_NAME: Record<ContentLocale, string> = { ar: 'Arabic', en: 'English', ur: 'Urdu', hi: 'Hindi', bn: 'Bengali', fil: 'Filipino (Tagalog)' };

export const INSTRUCTIONS =
  'You translate pharmacy product leaflet text. Translate ONLY the text given, faithfully and completely: do not add, remove, summarise, explain or ' +
  'correct anything, and never invent content. Keep every number, dose, unit, percentage and every Latin drug, ingredient or brand name exactly as ' +
  'written. Use the standard medical term of the target language. Keep the line breaks and the bullet structure. Answer with JSON only: ' +
  '[{"i":<number>,"t":"<translation>"}]. If a text cannot be translated faithfully, answer {"i":<number>,"t":null} for it.';

export interface TranslateRequest { id: string; source: ContentLocale; target: ContentLocale; items: Array<{ i: number; key: string; field: ContentField; id: string; text: string }>; prompt: string }

/** Gaps of one language pair grouped into requests of at most `maxItems` texts / `maxChars` characters. */
export function buildRequests(gaps: Gap[], maxItems = 20, maxChars = 6000): TranslateRequest[] {
  const pairs = new Map<string, Gap[]>();
  for (const g of gaps) pairs.set(`${g.source}>${g.target}`, [...(pairs.get(`${g.source}>${g.target}`) ?? []), g]);
  const out: TranslateRequest[] = [];
  const order = (k: string) => TARGET_ORDER.indexOf(k.split('>')[1] as ContentLocale);
  for (const [pair, list] of [...pairs].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))) {
    const [source, target] = pair.split('>') as [ContentLocale, ContentLocale];
    let chunk: Gap[] = []; let chars = 0;
    const flush = () => {
      if (!chunk.length) return;
      const lines = chunk.map((g, i) => JSON.stringify({ i, text: g.text }));
      out.push({
        id: `tr_${String(out.length).padStart(6, '0')}_${source}_${target}`, source, target,
        items: chunk.map((g, i) => ({ i, key: gapKey(g), field: g.field, id: g.id, text: g.text })),
        prompt: `${INSTRUCTIONS}\nTranslate from ${LANGUAGE_NAME[source]} to ${LANGUAGE_NAME[target]}.\nTEXTS\n${lines.join('\n')}`,
      });
      chunk = []; chars = 0;
    };
    for (const g of list) {
      if (chunk.length >= maxItems || (chars + g.text.length > maxChars && chunk.length)) flush();
      chunk.push(g); chars += g.text.length;
    }
    flush();
  }
  return out;
}

/** Identifies a gap across the tool's steps: product id, field and target. */
export const gapKey = (g: Pick<Gap, 'id' | 'field' | 'target'>) => `${g.id}|${g.field}|${g.target}`;

export function parseAnswers(text: string): Array<{ i: number; t: string | null }> {
  const m = /\[[\s\S]*\]/.exec(text);
  if (!m) return [];
  try {
    return (JSON.parse(m[0]) as unknown[]).filter((a): a is { i: number; t: string | null } => !!a && typeof a === 'object'
      && Number.isInteger((a as { i: number }).i) && (typeof (a as { t: unknown }).t === 'string' || (a as { t: unknown }).t === null));
  } catch { return []; }
}

// ── checks an answer must pass ───────────────────────────────────────────────────────────────────────────────────────
const DIGITS: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9', '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9', '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
/** The numbers of a text as ASCII digit runs, sorted: a translation keeps exactly the same ones (doses, strengths, ages). */
export function numbersOf(text: string): string[] {
  const ascii = text.replace(/[٠-٩۰-۹०-९০-৯]/g, (d) => DIGITS[d] ?? d).replace(/(\d)[,٬](\d)/g, '$1$2').replace(/(\d)[.٫](\d)/g, '$1.$2');
  return (ascii.match(/\d+(?:\.\d+)?/g) || []).sort();
}

const SCRIPT: Record<ContentLocale, RegExp> = { ar: /[؀-ۿ]/g, ur: /[؀-ۿ]/g, hi: /[ऀ-ॿ]/g, bn: /[ঀ-৿]/g, en: /[A-Za-z]/g, fil: /[A-Za-z]/g };

export type Rejection = 'empty' | 'numbers_differ' | 'wrong_script' | 'length' | 'format';

/** null when the translation may be written, else why not. */
export function checkTranslation(source: string, out: string | null, target: ContentLocale): Rejection | null {
  if (typeof out !== 'string' || !out.trim()) return 'empty';
  if (/```|^\s*[\[{]/.test(out)) return 'format';
  if (numbersOf(source).join(',') !== numbersOf(out).join(',')) return 'numbers_differ';
  const letters = (out.match(/\p{L}/gu) || []).length;
  if (letters >= 6 && (out.match(SCRIPT[target]) || []).length < letters * 0.5) return 'wrong_script';
  const ratio = out.length / Math.max(1, source.length);
  if (source.length >= 20 && (ratio < 0.25 || ratio > 4)) return 'length';
  return null;
}

// ── the reviewed file the catalogue-apply step reads ─────────────────────────────────────────────────────────────────
/** `source_sha` is the SHA-256 of the source text the translation was made from: the step writes only while that text is still the stored one. */
export interface TranslationItem { id: string; field: ContentField; target: ContentLocale; source: ContentLocale; text: string; source_sha: string }
export interface TranslationFile { version: 1; model: string; generated_at: string; items: TranslationItem[] }

export function isTranslationFile(v: unknown): v is TranslationFile {
  const f = v as TranslationFile;
  return !!f && f.version === 1 && typeof f.model === 'string' && Array.isArray(f.items)
    && f.items.every((i) => i && typeof i.id === 'string' && (CONTENT_FIELDS as readonly string[]).includes(i.field) && TARGET_ORDER.includes(i.target) && TARGET_ORDER.includes(i.source) && typeof i.text === 'string' && i.text.trim() !== '' && typeof i.source_sha === 'string');
}
