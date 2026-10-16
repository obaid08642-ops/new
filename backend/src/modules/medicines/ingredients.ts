/**
 * Issue 1556: structured ingredients for catalogue medicines, parsed from the stored text fields
 * (`active_ingredient`, `strength`, `form`, names), never guessed. A row the parser is not sure of is
 * returned with `status: 'review'` and the reasons, for the admin's review queue.
 */
import {
  DosageForm, FORM_INDEX, IGNORE_INDEX, INN_INDEX, INN_PARENT, INN_TABLE_VERSION, LEAFLET_MARKERS, MODIFIER_INDEX,
  ROUTE_BY_FORM, ROUTE_INDEX, Route, STORAGE_MARKERS, StrengthUnit, UNIT_INDEX, WARNING_MARKERS, matchPhrase, normalizeText, tokenize,
} from './inn-normalization';

export const INGREDIENTS_PARSER_VERSION = `p1/${INN_TABLE_VERSION}`;

export interface Ingredient { inn: string; strength_value: number | null; strength_unit: StrengthUnit | null }

export interface CatalogueRowText {
  active_ingredient?: string | null;
  generic_name?: string | null;
  strength?: string | null;
  form?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  official_name?: string | null;
}

export type ReviewReason =
  | 'unknown_words' | 'leaflet' | 'strength_conflict' | 'form_conflict' | 'ambiguous_number' | 'no_ingredient_found';

export interface ParseResult {
  status: 'parsed' | 'review' | 'none';
  source: 'active_ingredient' | 'name' | null;
  ingredients: Ingredient[];
  dosage_form: DosageForm | null;
  route: Route | null;
  reasons: ReviewReason[];
  unknown: string[];
  leaflet: LeafletSplit | null;
}

const PREFIXES = ['وال', 'ال', 'و'];
const SEPARATORS = new Set(['+', '/', ',', '&', '-', '(', ')', '.', ':', ';', 'و', 'and', 'with', 'مع']);

/** Number text -> value; null when the grouping is ambiguous (e.g. "1.000 mg"). */
export function parseNumber(raw: string, unit: string): number | null {
  if (/^\d{1,3}(,\d{3})+$/.test(raw)) return Number(raw.replace(/,/g, ''));
  if (/^\d+\.\d{3}$/.test(raw)) return unit === 'iu' ? Number(raw.replace('.', '')) : null;
  if (/^\d+,\d{1,2}$/.test(raw)) return Number(raw.replace(',', '.'));
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return null;
}

interface StrengthHit { value: number | null; unit: StrengthUnit | 'ml'; length: number }

/** A strength at tokens[i]: number + unit, optional "/ [n] ml|g" denominator, or number + "%". */
export function matchStrength(tokens: string[], i: number): StrengthHit | null {
  const num = tokens[i];
  if (!num || !/^\d/.test(num)) return null;
  if (tokens[i + 1] === '%') return { value: parseNumber(num, '%'), unit: '%', length: 2 };
  const u = matchPhrase(UNIT_INDEX, tokens, i + 1);
  if (!u) return null;
  let length = 1 + u.length;
  let unit: StrengthUnit | 'ml' = u.value;
  if (tokens[i + length] === '/' && u.value !== 'ml') {
    let j = i + length + 1;
    let per = '';
    if (tokens[j] === '5') { per = '5'; j += 1; }
    const d = matchPhrase(UNIT_INDEX, tokens, j);
    if (d && (d.value === 'ml' || d.value === 'g') && (per === '' || d.value === 'ml')) {
      const composed = `${u.value}/${per}${d.value}`;
      if (['mg/ml', 'mg/5ml', 'mcg/ml', 'iu/ml', 'mg/g'].includes(composed)) {
        unit = composed as StrengthUnit;
        length = j + d.length - i;
      }
    }
  }
  return { value: parseNumber(num, u.value), unit, length };
}

interface Scan {
  ingredients: { inn: string; strengths: StrengthHit[] }[];
  forms: DosageForm[];
  modifiers: string[];
  routes: Route[];
  unknown: string[];
  loose: StrengthHit[];
}

/** Walks the tokens: ingredients (with the strengths that follow them), form words, routes, and anything unknown. */
function scan(text: string): Scan {
  const t = tokenize(text);
  const out: Scan = { ingredients: [], forms: [], modifiers: [], routes: [], unknown: [], loose: [] };
  let paren = 0;
  for (let i = 0; i < t.length;) {
    if (t[i] === '(') paren += 1;
    if (t[i] === ')') paren = Math.max(0, paren - 1);
    // "باراسيتامول / مل": a unit left without its number (the source lost it) carries nothing.
    if (t[i] === '/' && !/^\d/.test(t[i + 1] || '')) {
      const u = matchPhrase(UNIT_INDEX, t, i + 1);
      if (u) { i += 1 + u.length; continue; }
    }
    const s = matchStrength(t, i);
    if (s) {
      const last = out.ingredients[out.ingredients.length - 1];
      if (last) last.strengths.push(s); else out.loose.push(s);
      i += s.length; continue;
    }
    const inn = matchPhrase(INN_INDEX, t, i, PREFIXES);
    if (inn) {
      const last = out.ingredients[out.ingredients.length - 1];
      // "(colecalciferol)" right after "vitamin d" names the same substance more precisely.
      if (paren > 0 && last && (last.inn === inn.value || INN_PARENT[inn.value] === last.inn)) last.inn = inn.value;
      else if (!out.ingredients.some((x) => x.inn === inn.value)) out.ingredients.push({ inn: inn.value, strengths: [] });
      i += inn.length; continue;
    }
    const route = matchPhrase(ROUTE_INDEX, t, i);
    if (route) { out.routes.push(route.value); i += route.length; continue; }
    const mod = matchPhrase(MODIFIER_INDEX, t, i);
    if (mod) { out.modifiers.push(mod.value); i += mod.length; continue; }
    const form = matchPhrase(FORM_INDEX, t, i);
    if (form) { out.forms.push(form.value); i += form.length; continue; }
    const ign = matchPhrase(IGNORE_INDEX, t, i);
    if (ign) { i += ign.length; continue; }
    if (SEPARATORS.has(t[i])) { i += 1; continue; }
    out.unknown.push(t[i]);
    i += 1;
  }
  return out;
}

/** Base form + modifiers -> one form; null when they disagree. */
export function combineForm(forms: DosageForm[], modifiers: string[]): DosageForm | null {
  const base = [...new Set(forms)];
  const mods = new Set(modifiers);
  let f: DosageForm | null = base.length === 1 ? base[0] : null;
  if (base.length === 2 && base.includes('sachet') && mods.has('effervescent')) f = 'sachet';
  if (!f) return null;
  if (mods.has('effervescent')) f = f === 'tablet' ? 'effervescent_tablet' : f === 'sachet' ? 'effervescent_granules' : null;
  if (f && mods.has('extended')) f = f === 'tablet' ? 'extended_release_tablet' : f === 'capsule' ? 'extended_release_capsule' : null;
  if (f && mods.has('eye')) f = f === 'drops' ? 'eye_drops' : null;
  return f;
}

function formOf(text?: string | null): DosageForm | null | 'conflict' {
  if (!text) return null;
  const s = scan(text);
  if (!s.forms.length) return null;
  return combineForm(s.forms, s.modifiers) ?? 'conflict';
}

export interface LeafletSplit { lang: 'ar' | 'en'; more_info: string; storage: string; warnings: string[] }

export function isLeaflet(raw: string): boolean {
  const n = normalizeText(raw);
  return /\n/.test(raw) || raw.length > 200 || LEAFLET_MARKERS.some((m) => n.includes(m));
}

/** Splits leaflet text by line: storage lines, warning lines, the rest (composition, sizes, links) as more info. Nothing is dropped. */
export function splitLeaflet(raw: string): LeafletSplit {
  const latin = (raw.match(/[A-Za-z]/g) || []).length;
  const arabic = (raw.match(/[؀-ۿ]/g) || []).length;
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const storage: string[] = []; const warnings: string[] = []; const rest: string[] = [];
  for (const line of lines) {
    const n = normalizeText(line);
    if (STORAGE_MARKERS.some((m) => n.includes(m))) storage.push(line);
    else if (WARNING_MARKERS.some((m) => n.includes(m))) warnings.push(line);
    else rest.push(line);
  }
  return { lang: latin > arabic ? 'en' : 'ar', more_info: rest.join('\n'), storage: storage.join('\n'), warnings };
}

const STRENGTH_ONLY: StrengthUnit[] = ['mg', 'g', 'mcg', 'iu', '%', 'mg/ml', 'mg/5ml', 'mcg/ml', 'iu/ml', 'mg/g'];

function strengthField(raw?: string | null): StrengthHit | null | 'ambiguous' {
  if (!raw) return null;
  const t = tokenize(raw);
  const s = matchStrength(t, 0);
  if (!s || s.length !== t.length || s.unit === 'ml') return null; // a volume ("150 مل") is a pack size, not a strength
  if (s.value === null) return 'ambiguous';
  return s;
}

export function parseCatalogueRow(row: CatalogueRowText): ParseResult {
  const res: ParseResult = { status: 'none', source: null, ingredients: [], dosage_form: null, route: null, reasons: [], unknown: [], leaflet: null };
  const raw = String(row.active_ingredient || row.generic_name || '').trim();

  // Dosage form: base form from the ingredient text or the form field (they must agree), modifiers
  // ("فوارة", "ممتدة المفعول", "للعين") from either; the names only when neither says anything.
  const textScan = raw && !isLeaflet(raw) ? scan(raw) : null;
  const fieldScan = row.form ? scan(row.form) : null;
  const textBase = [...new Set(textScan?.forms || [])];
  const fieldBase = [...new Set(fieldScan?.forms || [])];
  const mods = [...(textScan?.modifiers || []), ...(fieldScan?.modifiers || [])];
  let form: DosageForm | null = null;
  if (textBase.length && fieldBase.length && !fieldBase.every((f) => textBase.includes(f))) res.reasons.push('form_conflict');
  else if (textBase.length || fieldBase.length) {
    form = combineForm(textBase.length ? textBase : fieldBase, mods);
    if (!form) res.reasons.push('form_conflict');
  } else {
    const nameForms = [row.official_name, row.name_ar, row.name_en].map(formOf).filter((f): f is DosageForm => !!f && f !== 'conflict');
    form = new Set(nameForms).size === 1 ? nameForms[0] : null;
  }
  res.dosage_form = form;

  if (raw && isLeaflet(raw)) {
    res.leaflet = splitLeaflet(raw);
    res.reasons.push('leaflet');
  } else if (raw) {
    res.source = 'active_ingredient';
    const s = scan(raw);
    if (s.unknown.length) { res.unknown = s.unknown; res.reasons.push('unknown_words'); }
    if (!s.ingredients.length) res.reasons.push('no_ingredient_found');
    const field = strengthField(row.strength);
    if (field === 'ambiguous') res.reasons.push('ambiguous_number');
    for (const ing of s.ingredients) {
      const own = ing.strengths.filter((x) => x.unit !== 'ml');
      if (own.length > 1) { res.reasons.push('strength_conflict'); continue; }
      let st: StrengthHit | null = own[0] || null;
      if (st && st.value === null) { res.reasons.push('ambiguous_number'); st = null; }
      // The single strength field belongs to a single-ingredient product only (in a combination it names one part).
      if (s.ingredients.length === 1 && field && field !== 'ambiguous') {
        if (st && (st.value !== field.value || st.unit !== field.unit)) res.reasons.push('strength_conflict');
        st = st || field;
      }
      res.ingredients.push({ inn: ing.inn, strength_value: st ? st.value : null, strength_unit: st ? (st.unit as StrengthUnit) : null });
    }
    const routes = [...new Set(s.routes)];
    if (routes.length === 1) res.route = routes[0];
  } else {
    // No ingredient text: a name that states "<known ingredient> <strength>" with nothing else combined.
    for (const name of [row.name_en, row.name_ar, row.official_name]) {
      if (!name || /[+&]|\bwith\b| مع /i.test(name)) continue;
      const t = tokenize(name);
      const hits: Ingredient[] = [];
      for (let i = 0; i < t.length; i++) {
        const inn = matchPhrase(INN_INDEX, t, i, PREFIXES);
        if (!inn) continue;
        const st = matchStrength(t, i + inn.length);
        if (st && st.value !== null && STRENGTH_ONLY.includes(st.unit as StrengthUnit)) hits.push({ inn: inn.value, strength_value: st.value, strength_unit: st.unit as StrengthUnit });
      }
      if (hits.length === 1) { res.ingredients = hits; res.source = 'name'; break; }
    }
  }
  if (!res.route && res.dosage_form) res.route = ROUTE_BY_FORM[res.dosage_form] ?? null;
  res.reasons = [...new Set(res.reasons)];
  if (res.reasons.length) { res.status = 'review'; res.ingredients = res.reasons.includes('leaflet') ? [] : res.ingredients; }
  else res.status = res.ingredients.length ? 'parsed' : 'none';
  if (res.status === 'review') res.ingredients = [];
  return res;
}

/** Stable keys: "inn:value unit" sorted, and the INN set alone. */
export function ingredientsKey(ings: Ingredient[]): string {
  return ings.map((i) => `${i.inn}:${i.strength_value ?? '?'}${i.strength_unit ?? ''}`).sort().join('+');
}
export function innKey(ings: Ingredient[]): string {
  return [...new Set(ings.map((i) => i.inn))].sort().join('+');
}

/**
 * Issue 1547 (equivalents): a MongoDB filter for other catalogue products with the same INN set, the same strength
 * per ingredient and the same dosage form. Null when the product has no confident structured data (no strength for
 * every ingredient, no form, or not parsed/reviewed) — then there are no equivalents to show, rather than a guess.
 */
export function sameIngredientsFilter(product: {
  id?: string; ingredients?: Ingredient[] | null; dosage_form?: string | null; ingredients_status?: string | null;
}): Record<string, unknown> | null {
  const ings = product?.ingredients || [];
  if (!ings.length || !product.dosage_form) return null;
  if (!['parsed', 'reviewed'].includes(String(product.ingredients_status))) return null;
  if (ings.some((i) => i.strength_value === null || i.strength_value === undefined || !i.strength_unit)) return null;
  return {
    ingredients_key: ingredientsKey(ings),
    dosage_form: product.dosage_form,
    ingredients_status: { $in: ['parsed', 'reviewed'] },
    is_deleted: { $ne: true },
    ...(product.id ? { id: { $ne: product.id } } : {}),
  };
}

/**
 * Issue 1556 H (owner, 2026-10-16): the ingredient review queue covers the medicine categories only — the
 * 2,575 records of "الأدوية والعلاج" (2,454) and "أدوية ومكملات غذائية" (121) in the 2026-10-16 data audit.
 * Cosmetics, care products and devices never enter the queue.
 */
export const INGREDIENTS_SCOPE_CATEGORIES = ['الأدوية والعلاج', 'أدوية ومكملات غذائية'] as const;

export const INGREDIENTS_SCOPE_FILTER = { category: { $in: [...INGREDIENTS_SCOPE_CATEGORIES] } };

export function inIngredientsScope(row: { category?: unknown }): boolean {
  return typeof row.category === 'string' && (INGREDIENTS_SCOPE_CATEGORIES as readonly string[]).includes(row.category.trim());
}
