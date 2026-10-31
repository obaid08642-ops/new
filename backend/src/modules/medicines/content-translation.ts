/**
 * Filling the gaps of the product content (owner complaint 2026-10-26): a text that exists in one language and is missing in another is
 * TRANSLATED from the existing text, never invented. Pure rules shared by the batch tool (`scripts/translate-product-content.ts`) and the
 * guarded catalogue-apply step (`planProductTranslations`): which texts are missing, the request for the model, and the checks an answer
 * must pass before it can be written. Order of the targets: ar and en first, then ur, hi, bn and fil.
 */
import { createHash } from 'crypto';
import { CONTENT_FIELDS, textLanguage, storedContentText, type ContentField, type ContentLocale } from './med-i18n';

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

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

/**
 * Every path where `storedContentText` can find one field in one language, in the order it reads them: the `_ar` / `_en` column of a long text,
 * the Arabic root of a short fact, then `translations.<db>.<key>`. The text of a slot may sit in more than one of them.
 */
export function slotPaths(field: ContentField, locale: ContentLocale): string[] {
  const tr = `translations.${DB[locale]}.${TR_KEY[field]}`;
  const column = COLUMN[field];
  if (column) return locale === 'ar' || locale === 'en' ? [`${column}_${locale}`, tr] : [tr];
  return locale === 'ar' ? [field, tr] : [tr];
}

const getPath = (raw: Record<string, any>, path: string): unknown => path.split('.').reduce<any>((o, k) => (o && typeof o === 'object' ? o[k] : undefined), raw);
const textAt = (raw: Record<string, any>, path: string): string | null => { const v = getPath(raw, path); return typeof v === 'string' && v.trim() ? v : null; };

/** A copy of `raw` with one path set (the parents along it are copied, nothing else is touched). */
function withPath(raw: Record<string, any>, path: string, value: string): Record<string, any> {
  const [head, ...rest] = path.split('.');
  if (!rest.length) return { ...raw, [head]: value };
  const child = raw?.[head] && typeof raw[head] === 'object' ? raw[head] : {};
  return { ...raw, [head]: withPath(child, rest.join('.'), value) };
}

// ── texts in the wrong column ─────────────────────────────────────────────────────────────────────────────────────────
/**
 * A text whose letters are in the other of Arabic / English than its column says (an Arabic leaflet in the English column) is FIXED, not skipped
 * (owner 2026-10-27). With `right` = the language the letters are in:
 *   move   the right column is empty: the text moves there and the wrong column is emptied (it becomes a normal missing text);
 *   clear  the right column already holds a text in its language: only the wrong column is emptied (it is translated again from the right one);
 *   swap   each column holds the other's language: they trade places.
 * Only Arabic and English columns can be judged by their letters (Urdu shares the Arabic script; hi, bn and fil are taken as labelled).
 */
export interface MoveItem { id: string; field: ContentField; wrong: 'ar' | 'en'; right: 'ar' | 'en'; kind: 'move' | 'clear' | 'swap'; text: string; text_sha: string }
const OTHER: Record<'ar' | 'en', 'ar' | 'en'> = { ar: 'en', en: 'ar' };

export function findMoves(raw: Record<string, any>): MoveItem[] {
  const id = String(raw?.id ?? '');
  const out: MoveItem[] = [];
  if (!id) return out;
  for (const field of CONTENT_FIELDS) {
    const a = storedContentText(raw, field, 'ar');
    const e = storedContentText(raw, field, 'en');
    const langA = a === null ? null : textLanguage(a, 'ar');
    const langE = e === null ? null : textLanguage(e, 'en');
    const add = (wrong: 'ar' | 'en', kind: MoveItem['kind'], text: string) => out.push({ id, field, wrong, right: OTHER[wrong], kind, text, text_sha: sha(text) });
    if (a !== null && langA === 'en') {
      if (e === null) add('ar', 'move', a);
      else if (langE === 'en') add('ar', 'clear', a);
      else add('ar', 'swap', a);                                  // the English column holds Arabic: the pair trades places (one item)
    } else if (e !== null && langE === 'ar') {
      if (a === null) add('en', 'move', e);
      else add('en', 'clear', e);                                 // the Arabic column is in Arabic (the swap case was taken above)
    }
  }
  return out;
}

/** The text of each of the two columns after a move: null = empty. */
export function afterMove(raw: Record<string, any>, m: MoveItem): { ar: string | null; en: string | null } {
  const a = storedContentText(raw, m.field, 'ar');
  const e = storedContentText(raw, m.field, 'en');
  if (m.kind === 'swap') return { ar: e, en: a };
  if (m.kind === 'move') return m.wrong === 'ar' ? { ar: null, en: a } : { ar: e, en: null };
  return m.wrong === 'ar' ? { ar: null, en: e } : { ar: a, en: null };
}

/**
 * The desired value of every path a move touches: the new text on the column's main path, '' on a path that holds a stale copy of the old one.
 * `before` is what is stored now (null when empty): the apply writes a path only while it still holds that.
 */
export function movePaths(raw: Record<string, any>, m: MoveItem, newText: { ar: string | null; en: string | null }): Array<{ locale: 'ar' | 'en'; path: string; before: string | null; after: string }> {
  const out: Array<{ locale: 'ar' | 'en'; path: string; before: string | null; after: string }> = [];
  for (const locale of ['ar', 'en'] as const) {
    const text = newText[locale];
    const main = storagePath(m.field, locale);
    for (const path of new Set([main, ...slotPaths(m.field, locale)])) {
      const before = textAt(raw, path);
      const after = path === main ? (text ?? '') : '';
      if ((before ?? '') !== after) out.push({ locale, path, before, after });
    }
  }
  return out;
}

/** The product as it will be once the moves are applied (used to find what is still to translate, and what the translation is made from). */
export function applyMoves(raw: Record<string, any>, moves: MoveItem[]): Record<string, any> {
  let doc = raw;
  for (const m of moves) {
    for (const p of movePaths(raw, m, afterMove(raw, m))) doc = withPath(doc, p.path, p.after);
  }
  return doc;
}

export interface Gap { id: string; field: ContentField; source: ContentLocale; target: ContentLocale; text: string }

/** The language to translate FROM: Arabic targets from English, English from Arabic, the others from English, else Arabic. */
export function sourceOrder(target: ContentLocale): ContentLocale[] {
  return target === 'ar' ? ['en'] : target === 'en' ? ['ar'] : ['en', 'ar'];
}

export interface GapReport { gaps: Gap[]; mislabelled: number; moves: MoveItem[] }

/**
 * The missing texts of one product, and the texts in the wrong column. The wrong-column texts are moved first (see MoveItem), and the gaps
 * are those of the product AFTER the moves, so a column emptied by a move is a normal missing text, translated from the right-language one.
 * `mislabelled` counts what is still in the wrong language after that (nothing, unless a column holds a language letters cannot tell).
 */
export function findGaps(rawIn: Record<string, any>): GapReport {
  const gaps: Gap[] = []; let mislabelled = 0;
  const id = String(rawIn?.id ?? '');
  if (!id) return { gaps, mislabelled, moves: [] };
  const moves = findMoves(rawIn);
  const raw = moves.length ? applyMoves(rawIn, moves) : rawIn;
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
  return { gaps, mislabelled, moves };
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
export interface TranslationFile { version: 1; model: string; generated_at: string; items: TranslationItem[]; moves?: MoveItem[] }

export function isTranslationFile(v: unknown): v is TranslationFile {
  const f = v as TranslationFile;
  const movesOk = f?.moves === undefined || (Array.isArray(f.moves) && f.moves.every((m) => m && typeof m.id === 'string' && (CONTENT_FIELDS as readonly string[]).includes(m.field)
    && (m.wrong === 'ar' || m.wrong === 'en') && m.right === OTHER[m.wrong] && ['move', 'clear', 'swap'].includes(m.kind) && typeof m.text === 'string' && typeof m.text_sha === 'string'));
  return !!f && f.version === 1 && typeof f.model === 'string' && Array.isArray(f.items) && movesOk
    && f.items.every((i) => i && typeof i.id === 'string' && (CONTENT_FIELDS as readonly string[]).includes(i.field) && TARGET_ORDER.includes(i.target) && TARGET_ORDER.includes(i.source) && typeof i.text === 'string' && i.text.trim() !== '' && typeof i.source_sha === 'string');
}
