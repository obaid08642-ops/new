/**
 * Catalogue active-ingredient normalization (issue #1556, plan: docs/platform/INGREDIENT-NORMALIZATION-PLAN.md). PURE functions, no database, no writes.
 *
 * The stored `active_ingredient` is free text: strength, dosage form, "+" combinations in many spellings, in some rows a whole leaflet. This reads it and says, per
 * product, ONE of: `empty` (nothing there), `leaflet` (text that is not an ingredient, to be moved to a description field by a person), `confident` (every component
 * maps to an INN through the OWNER-APPROVED spelling table), `review` (anything else: goes to the admin's review queue, never guessed).
 *
 * The spelling table maps a normalized spelling to ONE INN. It is data, not code, and it is empty until the owner approves it (`loadInnMap`): with an empty table every
 * non-empty, non-leaflet product is `review`. Nothing is invented here: a spelling that is not in the approved table is never mapped.
 */

export type IngredientStatus = 'empty' | 'leaflet' | 'confident' | 'review';

export interface ParsedIngredient {
  /** the INN from the approved table, or null when the spelling is not in it */
  inn: string | null;
  /** the component as stored, trimmed */
  raw: string;
  /** the normalized spelling (the key of the table) */
  key: string;
  strength_value: number | null;
  /** mg, mcg, g, ml, iu, % or a ratio such as "mg/5ml" */
  strength_unit: string | null;
}

export interface IngredientParse {
  status: IngredientStatus;
  ingredients: ParsedIngredient[];
  /** short machine reasons for a `review` or `leaflet`, for the report */
  reasons: string[];
}

export interface IngredientInput {
  active_ingredient?: unknown;
  generic_name?: unknown;
  strength?: unknown;
}

export type InnMap = Readonly<Record<string, string>>;

const LEAFLET_MAX_CHARS = 160;
const LEAFLET_CUES = /(https?:\/\/|warning|store at|keep out|side effect|تحذير|يحفظ|يُحفظ|بعيدا عن|الآثار الجانبية)/i;

const UNIT_ALIASES: Record<string, string> = {
  mg: 'mg', 'ملجم': 'mg', 'مجم': 'mg', 'ملغ': 'mg', 'ملغم': 'mg',
  mcg: 'mcg', ug: 'mcg', 'µg': 'mcg', 'μg': 'mcg', 'مكجم': 'mcg', 'ميكروجرام': 'mcg',
  g: 'g', gm: 'g', 'جم': 'g', 'غم': 'g', 'جرام': 'g',
  ml: 'ml', 'مل': 'ml',
  iu: 'iu', 'وحدة': 'iu',
  '%': '%',
};
const UNIT_RE = '(mg|mcg|µg|μg|ug|gm|g|ml|iu|%|ملجم|مجم|ملغم|ملغ|مكجم|ميكروجرام|جرام|جم|غم|مل|وحدة)';
const NUM_RE = '(\\d+(?:[.,]\\d+)?)';
const RATIO = new RegExp(`${NUM_RE}\\s*${UNIT_RE}\\s*/\\s*${NUM_RE}?\\s*${UNIT_RE}`, 'i');
const SIMPLE = new RegExp(`${NUM_RE}\\s*${UNIT_RE}`, 'i');
const STRENGTH_TOKENS = new RegExp(`${NUM_RE}\\s*${UNIT_RE}(\\s*/\\s*${NUM_RE}?\\s*${UNIT_RE})?`, 'gi');
/** words that name the dosage form, not the ingredient (only the unambiguous ones) */
const FORM_WORDS = /(?<![\p{L}\p{N}])(tablets?|tabs?|capsules?|caps?|syrup|suspension|injection|cream|ointment|gel|drops|sachets?|powder|solution|spray|اقراص|قرص|كبسولات|كبسولة|شراب|حقن|حقنة|كريم|مرهم|نقط|قطرة|بودرة|محلول)(?![\p{L}\p{N}])/giu;   // matched AFTER the alef is unified (normalizeKey), whole words only

const toNumber = (s: string): number => Number(s.replace(',', '.'));
const unitOf = (u: string): string => UNIT_ALIASES[u.toLowerCase()] ?? UNIT_ALIASES[u] ?? u.toLowerCase();
const asText = (v: unknown): string => (typeof v === 'string' ? v : '').trim();

/** The spelling key: lower case, no Arabic diacritics or tatweel, alef and ya variants unified, strengths and form words removed, punctuation to single spaces. */
export function normalizeKey(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(STRENGTH_TOKENS, ' ')
    .replace(FORM_WORDS, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `empty`, `leaflet` (long, a link, or leaflet wording) or `text`. */
export function classifyText(raw: string): 'empty' | 'leaflet' | 'text' {
  const t = raw.trim();
  if (!t) return 'empty';
  if (t.length > LEAFLET_MAX_CHARS || /[\r\n]/.test(t) || LEAFLET_CUES.test(t)) return 'leaflet';
  return 'text';
}

/** Components of a combination: split on "+", "&", ";", ",", "،" and " and ". A "/" is NOT a separator (it belongs to ratios such as 5mg/5ml). */
export function splitComponents(text: string): string[] {
  return text.split(/\s*(?:\+|&|;|,|،)\s*|\s+(?:and|و)\s+/i).map((s) => s.trim()).filter(Boolean);
}

/** The first strength in a text: "500 mg" -> {500, mg}; "5mg/5ml" -> {5, "mg/5ml"}. Null when none is written. */
export function parseStrength(text: string): { value: number; unit: string } | null {
  const ratio = RATIO.exec(text);
  if (ratio) return { value: toNumber(ratio[1]), unit: `${unitOf(ratio[2])}/${ratio[3] === undefined || toNumber(ratio[3]) === 1 ? '' : ratio[3].replace(',', '.')}${unitOf(ratio[4])}` };
  const m = SIMPLE.exec(text);
  return m ? { value: toNumber(m[1]), unit: unitOf(m[2]) } : null;
}

export function parseIngredients(input: IngredientInput, map: InnMap = {}): IngredientParse {
  const fromActive = asText(input.active_ingredient);
  const fromGeneric = asText(input.generic_name);
  const reasons: string[] = [];
  const source = fromActive || fromGeneric;
  if (!fromActive && fromGeneric) reasons.push('from_generic_name');
  const kind = classifyText(source);
  if (kind === 'empty') return { status: 'empty', ingredients: [], reasons: [] };
  if (kind === 'leaflet') return { status: 'leaflet', ingredients: [], reasons: ['leaflet_text'] };

  const parts = splitComponents(source);
  const productStrength = asText(input.strength);
  const ingredients: ParsedIngredient[] = parts.map((raw) => {
    const key = normalizeKey(raw);
    // the strength written next to the component; a single-ingredient product may take the product's own strength field
    const own = parseStrength(raw) ?? (parts.length === 1 && productStrength ? parseStrength(productStrength) : null);
    return { inn: key && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null, raw, key, strength_value: own ? own.value : null, strength_unit: own ? own.unit : null };
  });
  if (!ingredients.length || ingredients.some((i) => !i.key)) return { status: 'review', ingredients, reasons: [...reasons, 'unreadable_component'] };
  const unknown = ingredients.filter((i) => i.inn === null).length;
  if (unknown) return { status: 'review', ingredients, reasons: [...reasons, 'spelling_not_in_approved_table'] };
  return { status: 'confident', ingredients, reasons };
}

/** The approved spelling table. A table that the owner has not approved (`approved_by` empty) is ignored whole, so nothing is mapped from a draft. */
export function loadInnMap(file: unknown): { map: InnMap; approved: boolean; entries: number } {
  const f = (file && typeof file === 'object' ? file : {}) as { approved_by?: unknown; entries?: unknown };
  const entries = f.entries && typeof f.entries === 'object' ? (f.entries as Record<string, unknown>) : {};
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) if (typeof v === 'string' && v.trim() && normalizeKey(k) === k) clean[k] = v.trim();
  const approved = typeof f.approved_by === 'string' && f.approved_by.trim().length > 0;
  return { map: approved ? clean : {}, approved, entries: Object.keys(clean).length };
}
