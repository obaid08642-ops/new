/**
 * #1556 decision A (owner, 2026-10-16), reworked after the review of PR #1588.
 *
 * The review ran the first version on the full production export (20,990 records): it would have changed
 * 10,815 records, replaced 26,336 ur/hi/bn names with English, and cut correct Arabic names with a rule-built
 * fallback. This version changes far less and writes nothing that the owner has not approved:
 *
 *   1. Scope: only records whose displayed Arabic name (`name_ar`, `translations.ar.name`) and official Arabic
 *      name (`official_name_ar`, `translations.ar.official_name`) disagree on the BRAND, plus records that share
 *      one Arabic display name with a different English product. Everything else is untouched.
 *   2. No rule-built Arabic names. For each record in scope a small-model batch job (same pattern as the
 *      classification job of #1595) gets the English name, both Arabic candidates and the description and
 *      answers exactly one of keep_display / keep_official / new_text (+ text). Every answer is a proposal
 *      for the owner. An invalid answer gives a flagged row without a proposal (never written).
 *   3. `align` (display and official are the same brand, spelled differently): proposed only when the brand
 *      skeletons match AND the numbers match exactly, and never when it would shorten the brand.
 *   4. ur / hi / bn names: report only. No step of this script writes them (apply refuses every non-Arabic field).
 *   5. Collection `medicines` (CATALOG_COLLECTIONS.medicines), `--collection <name>` to override.
 *   6. Output: `proposals.csv` for the owner (sku, id, field, before, proposal, source, reason, approved).
 *      `--apply <approved.csv>` writes only rows with approved=yes, each guarded by its `before` value (a row
 *      whose stored value changed since the scan is skipped), and logs every write in `medicine_name_fixes`.
 *
 * Steps (no step except `run` makes a network call):
 *   scan       --input export.jsonl | (MONGO_URL [--collection medicines])  --out ./name-fix
 *              writes scope.json, requests.jsonl, align.csv, localized-report.csv, estimate.json
 *   estimate   --input export.jsonl [--total 800] [--batch 20]       cost estimate only (no API call)
 *   run        --requests ./name-fix/requests.jsonl --out ./name-fix/responses.jsonl [--rpm 60]
 *              calls the model; resumable; key from the environment only (GEMINI_API_KEY, or OPENAI_API_KEY
 *              with AI_PROVIDER=openai). The model id comes from NAME_FIX_MODEL / CLASSIFY_MODEL or DEFAULT_MODEL.
 *   proposals  --scan ./name-fix --responses ./name-fix/responses.jsonl --out ./name-fix
 *              writes proposals.csv (align + model rows), every row flagged for the owner
 *   apply      --apply ./name-fix/approved.csv   (MONGO_URL + CATALOGUE_NAME_FIX_CONFIRM=apply [--collection])
 *
 *   npx ts-node --transpile-only src/scripts/fix-catalogue-names.ts <step> ...
 */
import { CATALOG_COLLECTIONS } from '../modules/catalogs/catalog-collections';
import { Caller, chainCallerFromEnv } from '../modules/ai/env-chain';

export type NameLang = 'ar' | 'ur' | 'hi' | 'bn';
export type MatchLevel = 'full' | 'partial' | 'none';

export interface CatalogueRecord {
  _id?: unknown;
  id?: unknown;
  sku?: number | string | null;
  name_en?: string | null;
  name_ar?: string | null;
  official_name_ar?: string | null;
  description_ar?: string | null;
  translations?: Record<string, Record<string, unknown> | null | undefined> | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Normalisation and phonetic skeletons
// ---------------------------------------------------------------------------

const DIGIT_BLOCKS = [0x0660, 0x06f0, 0x0966, 0x09e6];

export function normaliseDigits(s: string): string {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    const block = DIGIT_BLOCKS.find((b) => cp >= b && cp <= b + 9);
    out += block !== undefined ? String(cp - block) : ch;
  }
  return out.replace(/٫/g, '.').replace(/٬/g, ',');
}

/** Arabic/Urdu letter folding: alef forms, ya, ta marbuta, hamza seats, diacritics, tatweel. */
export function normaliseArabic(s: string): string {
  return normaliseDigits(s)
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىیےئ]/g, 'ي')
    .replace(/[ةۃ]/g, 'ه')
    .replace(/[ہھ]/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ک/g, 'ك');
}

// Consonant classes shared by all scripts. Vowels, h, w and y are dropped;
// s/z are one class; g/j one class (Arabic ج writes both).
const ARABIC_CLASS: Record<string, string> = {
  'ب': 'B', 'پ': 'B', 'ت': 'T', 'ط': 'T', 'ٹ': 'T', 'ث': 'S', 'ج': 'G', 'گ': 'G', 'غ': 'G',
  'چ': 'X', 'ش': 'X', 'خ': 'K', 'ك': 'K', 'ق': 'K', 'د': 'D', 'ض': 'D', 'ڈ': 'D',
  'ذ': 'S', 'ز': 'S', 'ظ': 'S', 'ژ': 'S', 'س': 'S', 'ص': 'S', 'ر': 'R', 'ڑ': 'R',
  'ف': 'F', 'ڤ': 'F', 'ل': 'L', 'م': 'M', 'ن': 'N', 'ں': 'N',
};

const DEVANAGARI_CLASS: Record<string, string> = {
  'क': 'K', 'ख': 'K', 'ग': 'G', 'घ': 'G', 'ज': 'G', 'झ': 'G', 'च': 'X', 'छ': 'X',
  'ट': 'T', 'ठ': 'T', 'त': 'T', 'थ': 'T', 'ड': 'D', 'ढ': 'D', 'द': 'D', 'ध': 'D',
  'ण': 'N', 'न': 'N', 'ङ': 'N', 'ञ': 'N', 'ं': 'N', 'ँ': 'N', 'प': 'B', 'फ': 'F',
  'ब': 'B', 'भ': 'B', 'म': 'M', 'र': 'R', 'ल': 'L', 'ळ': 'L', 'श': 'X', 'ष': 'X', 'स': 'S',
};
const DEVANAGARI_NUKTA: Record<string, string> = { 'ज': 'S', 'फ': 'F', 'ड': 'R', 'ढ': 'R', 'क': 'K', 'ख': 'K', 'ग': 'G' };

const BENGALI_CLASS: Record<string, string> = {
  'ক': 'K', 'খ': 'K', 'গ': 'G', 'ঘ': 'G', 'চ': 'X', 'ছ': 'X', 'জ': 'G', 'ঝ': 'G', 'য': 'G',
  'ট': 'T', 'ঠ': 'T', 'ত': 'T', 'থ': 'T', 'ৎ': 'T', 'ড': 'D', 'ঢ': 'D', 'দ': 'D', 'ধ': 'D',
  'ণ': 'N', 'ন': 'N', 'ঙ': 'N', 'ঞ': 'N', 'ং': 'N', 'ঁ': 'N', 'প': 'B', 'ফ': 'F',
  'ব': 'B', 'ভ': 'B', 'ম': 'M', 'র': 'R', 'ল': 'L', 'শ': 'X', 'ষ': 'X', 'স': 'S',
};
const BENGALI_NUKTA: Record<string, string> = { 'ড': 'R', 'ঢ': 'R', 'য': '' };
const DEVANAGARI_VIRAMA = '्';
const BENGALI_VIRAMA = '্';

function collapse(s: string): string {
  return s.replace(/(.)\1+/g, '$1');
}

/** Consonant skeleton of one word in a localized script. */
export function brandSkeleton(word: string, lang: NameLang): string {
  if (/[a-z]/i.test(word)) return latinSkeletons(word)[0] || '';
  const w = word.normalize('NFD');
  let out = '';
  if (lang === 'ar' || lang === 'ur') {
    for (const ch of normaliseArabic(w)) out += ARABIC_CLASS[ch] || '';
    return collapse(out);
  }
  const table = lang === 'hi' ? DEVANAGARI_CLASS : BENGALI_CLASS;
  const nukta = lang === 'hi' ? DEVANAGARI_NUKTA : BENGALI_NUKTA;
  const nuktaMark = lang === 'hi' ? '़' : '়';
  const virama = lang === 'hi' ? DEVANAGARI_VIRAMA : BENGALI_VIRAMA;
  const chars = [...w];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (chars[i + 1] === nuktaMark && ch in nukta) { out += nukta[ch]; i++; continue; }
    // Bengali ya-phala (virama + য) is a glide, not a consonant.
    if (lang === 'bn' && ch === 'য' && chars[i - 1] === virama) continue;
    out += table[ch] || '';
  }
  return collapse(out);
}

/** All plausible consonant skeletons of a Latin word (c/k, v/f/b, ch, th, gh are ambiguous). */
export function latinSkeletons(word: string): string[] {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  let variants: string[] = [''];
  const add = (opts: string[]) => {
    const next = new Set<string>();
    for (const v of variants) for (const o of opts) next.add(v + o);
    variants = [...next].slice(0, 64);
  };
  for (let i = 0; i < w.length; i++) {
    const two = w.slice(i, i + 2);
    if (two === 'ph') { add(['F']); i++; continue; }
    if (two === 'sh') { add(['X']); i++; continue; }
    if (two === 'ch') { add(['X', 'K']); i++; continue; }
    if (two === 'th') { add(['T', 'S']); i++; continue; }
    if (two === 'ck') { add(['K']); i++; continue; }
    if (two === 'gh') { add(['G', '']); i++; continue; }
    if (two === 'qu') { add(['K']); i++; continue; }
    const c = w[i];
    const nx = w[i + 1] || '';
    switch (c) {
      case 'b': case 'p': add(['B']); break;
      case 'c': add(/[eiy]/.test(nx) ? ['S', 'K'] : ['K']); break;
      case 'd': add(['D']); break;
      case 'f': add(['F']); break;
      case 'g': case 'j': add(['G']); break;
      case 'k': case 'q': add(['K']); break;
      case 'l': add(['L']); break;
      case 'm': add(['M']); break;
      case 'n': add(['N']); break;
      case 'r': add(['R']); break;
      case 's': case 'z': add(['S']); break;
      case 't': add(['T']); break;
      case 'v': add(['F', 'B', '']); break;
      case 'x': add(['KS']); break;
      default: break; // a e i o u w y h
    }
  }
  return [...new Set(variants.map(collapse))];
}

// ---------------------------------------------------------------------------
// Name parsing and matching
// ---------------------------------------------------------------------------

export function firstSegmentWords(name: string): string[] {
  const n = normaliseDigits(name);
  const seg = n.split(/[,،]| - /)[0] || '';
  const words: string[] = [];
  for (const w of seg.split(/\s+/)) {
    if (!w) continue;
    if (/\d/.test(w)) break;
    words.push(w.replace(/[^\p{L}\p{M}]/gu, ''));
    if (words.length >= 3) break;
  }
  return words.filter(Boolean);
}

/** Every number in a name (strength and pack), as a set of canonical strings. */
export function nameNumbers(name: string): Set<string> {
  const n = normaliseDigits(name);
  const out = new Set<string>();
  for (const m of n.match(/\d+(?:\.\d+)?/g) || []) out.add(String(parseFloat(m)));
  return out;
}

function englishBrandSkeletons(nameEn: string): Set<string> {
  const words = firstSegmentWords(nameEn);
  const out = new Set<string>();
  if (!words.length) return out;
  for (const s of latinSkeletons(words[0])) out.add(s);
  if (words.length > 1) {
    // Short first word (e.g. "Now"): also accept the first two words together.
    for (const a of latinSkeletons(words[0])) for (const b of latinSkeletons(words[1])) out.add(collapse(a + b));
  }
  return out;
}

export function brandMatches(localName: string, nameEn: string, lang: NameLang): boolean {
  const en = englishBrandSkeletons(nameEn);
  const enFirst = new Set(latinSkeletons(firstSegmentWords(nameEn)[0] || ''));
  const words = firstSegmentWords(localName);
  if (!words.length) return false;
  const sk = words.map((w) => brandSkeleton(w, lang));
  // First local word carries the brand in correctly named records.
  if (sk[0] && sk[0].length >= 2 && enFirst.has(sk[0])) return true;
  if (sk.length > 1 && en.has(collapse(sk[0] + sk[1]))) return true;
  if (sk[0] && sk[0].length < 2 && en.has(sk[0])) return true;
  return false;
}

export function nameMatchesEnglish(localName: string, nameEn: string, lang: NameLang): { match: MatchLevel } {
  if (!localName || !nameEn) return { match: 'none' };
  if (!brandMatches(localName, nameEn, lang)) return { match: 'none' };
  const en = nameNumbers(nameEn);
  const loc = nameNumbers(localName);
  const subset = [...loc].every((x) => en.has(x));
  if (!subset) return { match: 'none' };
  return { match: loc.size === en.size ? 'full' : 'partial' };
}


// ---------------------------------------------------------------------------
// Record access
// ---------------------------------------------------------------------------

/** The stored string at a dotted path (untrimmed, so the before-value guard compares the exact stored value). */
function getPath(rec: CatalogueRecord, path: string): string | null {
  let cur: unknown = rec;
  for (const p of path.split('.')) {
    if (!cur || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' && cur.trim() ? cur : null;
}

export function recordId(rec: CatalogueRecord): string {
  const raw = rec._id ?? rec.id;
  if (raw && typeof raw === 'object' && '$oid' in (raw as Record<string, unknown>)) return String((raw as Record<string, unknown>).$oid);
  return String(raw ?? '');
}

function recordSku(rec: CatalogueRecord): number | null {
  const n = Number(rec.sku);
  return Number.isFinite(n) && rec.sku !== null && rec.sku !== undefined && rec.sku !== '' ? n : null;
}

export function englishName(rec: CatalogueRecord): string | null {
  return (getPath(rec, 'name_en') || getPath(rec, 'translations.en.name'))?.trim() || null;
}

/** The only fields any step of this script may write. */
export const DISPLAY_FIELDS = ['name_ar', 'translations.ar.name'] as const;
export const OFFICIAL_FIELDS = ['official_name_ar', 'translations.ar.official_name'] as const;
export const WRITABLE_FIELDS: readonly string[] = [...DISPLAY_FIELDS, ...OFFICIAL_FIELDS];
const LOCALIZED_FIELDS: Record<'ur' | 'hi' | 'bn', string[]> = {
  ur: ['translations.ur.name', 'translations.ur.official_name'],
  hi: ['translations.hi.name', 'translations.hi.official_name'],
  bn: ['translations.bn.name', 'translations.bn.official_name'],
};

function firstOf(rec: CatalogueRecord, fields: readonly string[]): string | null {
  for (const f of fields) { const v = getPath(rec, f); if (v) return v; }
  return null;
}

// ---------------------------------------------------------------------------
// Arabic brand comparison
// ---------------------------------------------------------------------------

/** Unit and dosage-form words: never part of a brand (a name that starts with one has lost its brand). */
const NON_BRAND_WORDS = new Set([
  'مجم', 'ملجم', 'مج', 'جم', 'جرام', 'مل', 'ميكروجرام', 'وحدة', 'قرص', 'اقراص', 'كبسولة', 'كبسولات', 'شراب', 'كريم',
  'مرهم', 'جل', 'نقط', 'قطرة', 'فيال', 'امبول', 'حقنة', 'حقن', 'كيس', 'اكياس', 'لبوس', 'بخاخ', 'لوشن', 'معلق', 'قطعة', 'عبوة', 'لصقة',
].map((w) => normaliseArabic(w)));

/** Words of the name before its first number, in the first segment (the brand and its suffixes). */
export function brandTokens(name: string): string[] {
  const seg = normaliseDigits(name).split(/[,،]| - /)[0] || '';
  const out: string[] = [];
  for (const w of seg.split(/\s+/)) {
    if (!w) continue;
    if (/\d/.test(w)) break;
    const clean = w.replace(/[^\p{L}\p{M}]/gu, '');
    if (!clean) continue;
    if (NON_BRAND_WORDS.has(normaliseArabic(clean))) {
      if (!out.length) break;
      continue;
    }
    out.push(clean);
  }
  return out;
}

function arabicBrandSkeleton(name: string): { first: string; all: string } {
  const sks = brandTokens(name).slice(0, 3).map((w) => brandSkeleton(w, 'ar'));
  return { first: sks[0] || '', all: collapse(sks.join('')) };
}

/**
 * Same brand: the first brand words have one consonant skeleton, or the whole brand (up to 3 words) has, or
 * both names match the English brand. Spelling variants (كرستور / كريستور) are the same brand.
 */
export function sameArabicBrand(a: string, b: string, nameEn: string | null): boolean {
  const x = arabicBrandSkeleton(a);
  const y = arabicBrandSkeleton(b);
  if (x.first.length >= 2 && x.first === y.first) return true;
  if (x.all.length >= 2 && x.all === y.all) return true;
  if (nameEn && brandMatches(a, nameEn, 'ar') && brandMatches(b, nameEn, 'ar')) return true;
  return false;
}

function sameNumbers(a: string, b: string): boolean {
  const x = nameNumbers(a);
  const y = nameNumbers(b);
  return x.size === y.size && [...x].every((n) => y.has(n));
}

/** True when `proposal` would shorten `current`'s brand (fewer brand words). */
export function shortensBrand(current: string, proposal: string): boolean {
  return brandTokens(proposal).length < brandTokens(current).length;
}

// ---------------------------------------------------------------------------
// Scan: scope, align proposals, ur/hi/bn report
// ---------------------------------------------------------------------------

export type Source = 'keep_display' | 'keep_official' | 'new_text' | 'align' | 'invalid_answer';

export interface ProposalRow {
  sku: number | null;
  id: string;
  field: string;
  before: string;
  proposal: string | null;
  source: Source;
  reason: string;
}

export interface ScopeItem {
  id: string;
  sku: number | null;
  name_en: string;
  display: string | null;
  official: string | null;
  description: string | null;
  /** Current value of every present Arabic name field. */
  fields: Record<string, string>;
  why: 'brand_disagreement' | 'shared_arabic_name';
  note: string;
}

export interface LocalizedReportRow {
  sku: number | null;
  id: string;
  field: string;
  value: string;
  reason: string;
}

export interface ScanResult {
  scope: ScopeItem[];
  align: ProposalRow[];
  localized: LocalizedReportRow[];
  numbersDiffer: Array<{ sku: number | null; id: string; display: string; official: string }>;
}

function presentFields(rec: CatalogueRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of WRITABLE_FIELDS) { const v = getPath(rec, f); if (v) out[f] = v; }
  return out;
}

function scopeItem(rec: CatalogueRecord, nameEn: string, why: ScopeItem['why'], note: string): ScopeItem {
  return {
    id: recordId(rec), sku: recordSku(rec), name_en: nameEn,
    display: firstOf(rec, DISPLAY_FIELDS), official: firstOf(rec, OFFICIAL_FIELDS),
    description: getPath(rec, 'description_ar') || getPath(rec, 'translations.ar.description'),
    fields: presentFields(rec), why, note,
  };
}

/**
 * align: display and official are the same brand with the same numbers and differ only in spelling. The value
 * that fully matches the English name (brand + every number) wins; among two, the one with more brand words
 * (never shorten), then display. No proposal when neither matches English fully.
 */
function planAlign(rec: CatalogueRecord, nameEn: string, display: string, official: string): ProposalRow[] {
  const cands = [display, official].filter((v) => nameMatchesEnglish(v, nameEn, 'ar').match === 'full');
  if (!cands.length) return [];
  const target = cands.reduce((a, b) => (brandTokens(b).length > brandTokens(a).length ? b : a));
  const rows: ProposalRow[] = [];
  for (const [field, before] of Object.entries(presentFields(rec))) {
    if (before === target) continue;
    if (!sameArabicBrand(before, target, nameEn) || !sameNumbers(before, target) || shortensBrand(before, target)) continue;
    rows.push({
      sku: recordSku(rec), id: recordId(rec), field, before, proposal: target, source: 'align',
      reason: 'align: same brand skeleton and same numbers; spelling taken from the name that matches the English name',
    });
  }
  return rows;
}

function localizedReport(rec: CatalogueRecord, nameEn: string): LocalizedReportRow[] {
  const rows: LocalizedReportRow[] = [];
  for (const lang of ['ur', 'hi', 'bn'] as const) {
    for (const field of LOCALIZED_FIELDS[lang]) {
      const value = getPath(rec, field);
      if (!value || nameMatchesEnglish(value, nameEn, lang).match !== 'none') continue;
      rows.push({ sku: recordSku(rec), id: recordId(rec), field, value, reason: `report_only: ${lang} name does not match the English brand/numbers (never written; the English name is shown under it)` });
    }
  }
  return rows;
}

export function scan(records: CatalogueRecord[]): ScanResult {
  const scope: ScopeItem[] = [];
  const inScope = new Set<string>();
  const align: ProposalRow[] = [];
  const localized: LocalizedReportRow[] = [];
  const numbersDiffer: ScanResult['numbersDiffer'] = [];
  for (const rec of records) {
    const nameEn = englishName(rec);
    if (!nameEn) continue;
    localized.push(...localizedReport(rec, nameEn));
    const display = firstOf(rec, DISPLAY_FIELDS);
    const official = firstOf(rec, OFFICIAL_FIELDS);
    if (!display || !official) continue;
    const values = Object.values(presentFields(rec));
    if (values.every((v) => v === values[0])) continue;
    if (!sameArabicBrand(display, official, nameEn)) {
      scope.push(scopeItem(rec, nameEn, 'brand_disagreement', 'display and official Arabic names name different brands'));
      inScope.add(recordId(rec));
      continue;
    }
    if (!sameNumbers(display, official)) {
      numbersDiffer.push({ sku: recordSku(rec), id: recordId(rec), display, official });
      continue;
    }
    align.push(...planAlign(rec, nameEn, display, official));
  }

  // Records that share one Arabic display name with a different English product.
  const groups = new Map<string, CatalogueRecord[]>();
  for (const rec of records) {
    const display = firstOf(rec, DISPLAY_FIELDS);
    if (!display || !englishName(rec)) continue;
    const key = normaliseArabic(display).replace(/\s+/g, ' ').trim();
    if (!groups.has(key)) groups.set(key, []);
    (groups.get(key) as CatalogueRecord[]).push(rec);
  }
  for (const group of groups.values()) {
    if (new Set(group.map((r) => (englishName(r) as string).toLowerCase())).size < 2) continue;
    for (const rec of group) {
      if (inScope.has(recordId(rec))) continue;
      const others = group.filter((g) => g !== rec).map((g) => `${recordSku(g) ?? recordId(g)} "${englishName(g)}"`).join('; ');
      scope.push(scopeItem(rec, englishName(rec) as string, 'shared_arabic_name', `same Arabic display name as ${others}`));
      inScope.add(recordId(rec));
    }
  }
  // An aligned record that is also in scope goes to the model only.
  return { scope, align: align.filter((r) => !inScope.has(r.id)), localized, numbersDiffer };
}

// ---------------------------------------------------------------------------
// Model job (same pattern as the classification job of #1595: estimate with no network, resumable run,
// key from the environment only)
// ---------------------------------------------------------------------------

/**
 * Same default and published price as the classification job of #1595.
 * Source: https://ai.google.dev/gemini-api/docs/pricing (read 2026-10-16): input $0.10 / output $0.40 per 1M
 * tokens (text); Batch API $0.05 / $0.20. Override the model with NAME_FIX_MODEL (or CLASSIFY_MODEL).
 */
export const PRICES: Record<string, { input: number; output: number; batchInput: number; batchOutput: number; source: string }> = {
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40, batchInput: 0.05, batchOutput: 0.20, source: 'https://ai.google.dev/gemini-api/docs/pricing (2026-10-16)' },
};
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
export const DEFAULT_BATCH = 20;
const DESCRIPTION_CLIP = 300;

/** ~4 chars per token for Latin text and digits, ~2 for Arabic / Devanagari / Bengali, 1 per other symbol (as #1595). */
export function approxTokens(s: string): number {
  let latin = 0;
  let other = 0;
  let sym = 0;
  for (const ch of s) {
    if (/[A-Za-z0-9\s]/.test(ch)) latin += 1;
    else if (/[؀-ۿऀ-ॿঀ-৿]/.test(ch)) other += 1;
    else sym += 1;
  }
  return Math.ceil(latin / 4 + other / 2 + sym);
}

export const INSTRUCTIONS =
  'You check the Arabic names of pharmacy products. Each product line is ' +
  '"i|english name|arabic display name|arabic official name|arabic description". The English name is the reference ' +
  '(brand, strength and pack). Answer with JSON only: [{"i":<i>,"a":"keep_display"|"keep_official"|"new_text","t":"<arabic name, only for new_text>"}]. ' +
  'keep_display or keep_official when that Arabic name is the same product as the English name. new_text only when neither is, ' +
  'written in Arabic script as "<brand> <strength> <unit> - <count> <form>", keeping the full brand. Never shorten the brand.';

export function itemLine(i: number, s: ScopeItem): string {
  const clip = (v: string | null, n: number) => (v || '').replace(/[|\n\r]/g, ' ').slice(0, n);
  return `${i}|${clip(s.name_en, 120)}|${clip(s.display, 160)}|${clip(s.official, 160)}|${clip(s.description, DESCRIPTION_CLIP)}`;
}

export interface BatchRequest { id: string; record_ids: string[]; prompt: string }

export function buildRequests(scope: ScopeItem[], batch = DEFAULT_BATCH): BatchRequest[] {
  const out: BatchRequest[] = [];
  for (let s = 0; s < scope.length; s += batch) {
    const chunk = scope.slice(s, s + batch);
    out.push({
      id: `req_${String(s / batch).padStart(5, '0')}`,
      record_ids: chunk.map((c) => c.id),
      prompt: `${INSTRUCTIONS}\nPRODUCTS\n${chunk.map((c, i) => itemLine(i, c)).join('\n')}`,
    });
  }
  return out;
}

/** Output per item, sized for a new_text answer (the expensive case). */
export const OUTPUT_TOKENS_PER_ITEM = approxTokens('{"i":12,"a":"new_text","t":"اسيلوك 20 مجم - 14 كبسولة"},');

export interface Estimate {
  items: number; requests: number; instruction_tokens: number; item_tokens_avg: number; output_tokens_per_item: number;
  total_input_tokens: number; total_output_tokens: number; model: string; usd_standard: number; usd_batch_api: number; price_source: string;
}

export function estimate(scope: ScopeItem[], total = scope.length, batch = DEFAULT_BATCH, model = DEFAULT_MODEL): Estimate {
  const head = approxTokens(`${INSTRUCTIONS}\nPRODUCTS\n`);
  const avg = scope.length ? scope.reduce((a, s, i) => a + approxTokens(itemLine(i % batch, s)) + 1, 0) / scope.length : 0;
  const requests = Math.ceil(total / batch);
  const totalIn = Math.round(requests * head + total * avg);
  const totalOut = Math.round(total * OUTPUT_TOKENS_PER_ITEM + requests * 2);
  const p = PRICES[model] || PRICES[DEFAULT_MODEL];
  const usd = (i: number, o: number) => Math.round(((totalIn * i + totalOut * o) / 1e6) * 1000) / 1000;
  return {
    items: total, requests, instruction_tokens: head, item_tokens_avg: Math.round(avg * 10) / 10, output_tokens_per_item: OUTPUT_TOKENS_PER_ITEM,
    total_input_tokens: totalIn, total_output_tokens: totalOut, model,
    usd_standard: usd(p.input, p.output), usd_batch_api: usd(p.batchInput, p.batchOutput), price_source: p.source,
  };
}

export type { Caller };

/** One fallback chain over every provider whose key is set (see modules/ai/env-chain.ts); `NAME_FIX_MODEL` applies to the primary one. */
export function callerFromEnv(env: NodeJS.ProcessEnv = process.env): Caller {
  return chainCallerFromEnv(env, { model: env.NAME_FIX_MODEL || env.CLASSIFY_MODEL });
}

export interface RunIo { done: Set<string>; write(line: string): void; sleep(ms: number): Promise<void> }

export async function runRequests(reqs: BatchRequest[], call: Caller, io: RunIo, rpm = 60, maxRetries = 4): Promise<{ sent: number; skipped: number; failed: number }> {
  const gap = Math.ceil(60000 / Math.max(1, rpm));
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const req of reqs) {
    if (io.done.has(req.id)) { skipped += 1; continue; }
    let attempt = 0;
    for (;;) {
      try {
        const text = await call(req.prompt);
        io.write(JSON.stringify({ id: req.id, text }));
        io.done.add(req.id);
        sent += 1;
        break;
      } catch {
        attempt += 1;
        if (attempt > maxRetries) { failed += 1; break; }
        await io.sleep(gap * 2 ** attempt);
      }
    }
    await io.sleep(gap);
  }
  return { sent, skipped, failed };
}

// ---------------------------------------------------------------------------
// Proposals from the model answers
// ---------------------------------------------------------------------------

export type Answer = { i: number; a: 'keep_display' | 'keep_official' } | { i: number; a: 'new_text'; t: string };

const ARABIC_LETTER = /[ء-ي]/;

/** Well-formed answers only, by item index. A malformed entry is dropped (its item becomes invalid_answer). */
export function parseAnswers(text: string): Map<number, Answer> {
  const out = new Map<number, Answer>();
  const m = /\[[\s\S]*\]/.exec(text);
  if (!m) return out;
  let arr: unknown;
  try { arr = JSON.parse(m[0]); } catch { return out; }
  if (!Array.isArray(arr)) return out;
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    if (!Number.isInteger(o.i) || out.has(o.i as number)) continue;
    const i = o.i as number;
    if (o.a === 'keep_display' || o.a === 'keep_official') out.set(i, { i, a: o.a });
    else if (o.a === 'new_text' && typeof o.t === 'string' && ARABIC_LETTER.test(o.t) && !/[A-Za-z]/.test(o.t) && o.t.trim().length <= 200) out.set(i, { i, a: 'new_text', t: o.t.trim() });
  }
  return out;
}

function rowsForItem(item: ScopeItem, answer: Answer | undefined): ProposalRow[] {
  const base = { sku: item.sku, id: item.id };
  const fields = Object.entries(item.fields);
  if (!answer) {
    return [{ ...base, field: 'name_ar', before: item.display || '', proposal: null, source: 'invalid_answer', reason: `${item.why}: no valid model answer; owner to decide (${item.note})` }];
  }
  const rows: ProposalRow[] = [];
  if (answer.a === 'keep_display' || answer.a === 'keep_official') {
    const target = answer.a === 'keep_display' ? item.display : item.official;
    if (!target) return [{ ...base, field: 'name_ar', before: item.display || '', proposal: null, source: 'invalid_answer', reason: `${item.why}: model chose an empty candidate` }];
    if (!brandTokens(target).length) return [{ ...base, field: 'name_ar', before: item.display || '', proposal: null, source: 'invalid_answer', reason: `${item.why}: model chose "${target}", which has no brand (it starts with a unit or form word)` }];
    for (const [field, before] of fields) {
      if (before === target) continue;
      rows.push({ ...base, field, before, proposal: target, source: answer.a, reason: `${item.why}: model ${answer.a} for English "${item.name_en}" (${item.note})` });
    }
    return rows;
  }
  const text = answer.a === 'new_text' ? answer.t : '';
  for (const [field, before] of fields) {
    if (before === text) continue;
    if (shortensBrand(before, text)) {
      rows.push({ ...base, field, before, proposal: null, source: 'invalid_answer', reason: `${item.why}: model new_text "${text}" rejected: shorter brand than the current name` });
      continue;
    }
    rows.push({ ...base, field, before, proposal: text, source: 'new_text', reason: `${item.why}: model new_text for English "${item.name_en}" (${item.note})` });
  }
  return rows;
}

export function proposalsFromResponses(scope: ScopeItem[], reqs: BatchRequest[], responses: Array<{ id: string; text: string }>): ProposalRow[] {
  const byId = new Map(scope.map((s) => [s.id, s]));
  const texts = new Map(responses.map((r) => [r.id, r.text]));
  const out: ProposalRow[] = [];
  for (const req of reqs) {
    const text = texts.get(req.id);
    const answers = text === undefined ? new Map<number, Answer>() : parseAnswers(text);
    req.record_ids.forEach((rid, i) => {
      const item = byId.get(rid);
      if (item) out.push(...rowsForItem(item, answers.get(i)));
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export const CSV_HEAD = ['sku', 'id', 'field', 'before', 'proposal', 'source', 'reason', 'approved'] as const;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: ProposalRow[]): string {
  return [CSV_HEAD.join(','), ...rows.map((r) => CSV_HEAD.map((h) => csvCell(h === 'approved' ? '' : r[h])).join(','))].join('\n') + '\n';
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

// ---------------------------------------------------------------------------
// Apply (approved rows only; guarded by the before value; idempotent)
// ---------------------------------------------------------------------------

export interface UpdateCollection {
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount?: number }>;
}
export interface AuditCollection {
  insertOne(doc: Record<string, unknown>): Promise<unknown>;
}

export interface ApplyResult { approved: number; modified: number; skipped_changed_since_scan: number; refused: Array<{ id: string; field: string; reason: string }> }

const APPLY_SOURCES = new Set<string>(['keep_display', 'keep_official', 'new_text', 'align']);

/**
 * Writes only rows with approved=yes. A row is refused when its field is not an Arabic name field (ur/hi/bn and
 * everything else are never written), it has no proposal, its source is unknown, or an align row breaks the
 * skeleton/numbers/never-shorten rule. Each write is guarded by the stored `before` value.
 */
export async function applyApproved(
  rows: Array<Record<string, string>>, toKey: (id: string) => unknown, collection: UpdateCollection, audit: AuditCollection, runId: string,
): Promise<ApplyResult> {
  const res: ApplyResult = { approved: 0, modified: 0, skipped_changed_since_scan: 0, refused: [] };
  for (const r of rows) {
    if ((r.approved || '').trim().toLowerCase() !== 'yes') continue;
    res.approved += 1;
    const refuse = (reason: string) => res.refused.push({ id: r.id, field: r.field, reason });
    if (!WRITABLE_FIELDS.includes(r.field)) { refuse('not an Arabic name field'); continue; }
    if (!r.id || !r.before || !r.proposal || !r.proposal.trim()) { refuse('missing id, before or proposal'); continue; }
    if (!APPLY_SOURCES.has(r.source)) { refuse(`source ${r.source} is not applicable`); continue; }
    if (r.source === 'align' && (!sameArabicBrand(r.before, r.proposal, null) || !sameNumbers(r.before, r.proposal))) { refuse('align row: brand skeleton or numbers differ'); continue; }
    if ((r.source === 'align' || r.source === 'new_text') && shortensBrand(r.before, r.proposal)) { refuse('proposal shortens the brand'); continue; }
    if (!brandTokens(r.proposal).length) { refuse('proposal has no brand (it starts with a unit or form word)'); continue; }
    const key = toKey(r.id);
    const out = await collection.updateOne({ _id: key, [r.field]: r.before }, { $set: { [r.field]: r.proposal } });
    if (!out.modifiedCount) { res.skipped_changed_since_scan += 1; continue; }
    res.modified += 1;
    await audit.insertOne({ run_id: runId, record_id: r.id, record_key: key, sku: r.sku || null, field: r.field, before: r.before, after: r.proposal, source: r.source, reason: r.reason, at: new Date() });
  }
  return res;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function readExport(raw: string): CatalogueRecord[] {
  const t = raw.trim();
  if (!t) return [];
  return t.startsWith('[') ? (JSON.parse(t) as CatalogueRecord[]) : t.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as CatalogueRecord);
}

function parseArgs(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  return {
    step: get('--apply') ? 'apply' : argv[0], input: get('--input'), out: get('--out'), scan: get('--scan'), requests: get('--requests'),
    responses: get('--responses'), approved: get('--apply'), collection: get('--collection') || CATALOG_COLLECTIONS.medicines,
    batch: Number(get('--batch') || DEFAULT_BATCH), rpm: Number(get('--rpm') || 60), total: get('--total') ? Number(get('--total')) : undefined,
  };
}

async function main() {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const a = parseArgs(process.argv.slice(2));
  const need = (v: string | undefined, name: string): string => { if (!v) throw new Error(`${name} is required`); return v; };
  const jsonl = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const loadRecords = async (): Promise<CatalogueRecord[]> => {
    if (a.input) return readExport(fs.readFileSync(a.input, 'utf8'));
    if (!process.env.MONGO_URL) throw new Error('MONGO_URL or --input is required');
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGO_URL);
    const docs = (await mongoose.connection.collection(a.collection).find({ is_deleted: { $ne: true } }).toArray()) as unknown as CatalogueRecord[];
    await mongoose.disconnect();
    return docs;
  };

  if (a.step === 'scan') {
    const records = await loadRecords();
    const res = scan(records);
    const out = need(a.out, '--out');
    const reqs = buildRequests(res.scope, a.batch);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'scope.json'), JSON.stringify(res.scope, null, 2));
    fs.writeFileSync(path.join(out, 'requests.jsonl'), reqs.map((r) => JSON.stringify(r)).join('\n') + (reqs.length ? '\n' : ''));
    fs.writeFileSync(path.join(out, 'align.csv'), toCsv(res.align));
    fs.writeFileSync(path.join(out, 'numbers-differ.json'), JSON.stringify(res.numbersDiffer, null, 2));
    fs.writeFileSync(path.join(out, 'localized-report.csv'), ['sku,id,field,value,reason', ...res.localized.map((r) => [r.sku, r.id, r.field, r.value, r.reason].map(csvCell).join(','))].join('\n') + '\n');
    const est = estimate(res.scope, res.scope.length, a.batch);
    fs.writeFileSync(path.join(out, 'estimate.json'), JSON.stringify(est, null, 2));
    console.log(JSON.stringify({
      step: 'scan', collection: a.input ? null : a.collection, records: records.length,
      scope_records: res.scope.length,
      scope_brand_disagreement: res.scope.filter((s) => s.why === 'brand_disagreement').length,
      scope_shared_arabic_name: res.scope.filter((s) => s.why === 'shared_arabic_name').length,
      align_rows: res.align.length, align_records: new Set(res.align.map((r) => r.id)).size,
      numbers_differ_reported: res.numbersDiffer.length, localized_report_rows: res.localized.length, localized_writes: 0,
      requests: reqs.length, estimate_usd_standard: est.usd_standard, estimate_usd_batch_api: est.usd_batch_api, out,
    }, null, 2));
    return;
  }
  if (a.step === 'estimate') {
    const res = scan(await loadRecords());
    console.log(JSON.stringify(estimate(res.scope, a.total ?? res.scope.length, a.batch, process.env.NAME_FIX_MODEL || DEFAULT_MODEL), null, 2));
    return;
  }
  if (a.step === 'run') {
    const reqs = jsonl(need(a.requests, '--requests')) as BatchRequest[];
    const outFile = need(a.out, '--out');
    const done = new Set((jsonl(outFile) as Array<{ id: string }>).map((x) => x.id));
    const res = await runRequests(reqs, callerFromEnv(), {
      done, write: (line) => fs.appendFileSync(outFile, line + '\n'), sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    }, a.rpm);
    console.log(JSON.stringify({ step: 'run', ...res, out: outFile }));
    return;
  }
  if (a.step === 'proposals') {
    const dir = need(a.scan, '--scan');
    const scope = JSON.parse(fs.readFileSync(path.join(dir, 'scope.json'), 'utf8')) as ScopeItem[];
    const reqs = jsonl(path.join(dir, 'requests.jsonl')) as BatchRequest[];
    const model = proposalsFromResponses(scope, reqs, jsonl(need(a.responses, '--responses')));
    const alignRows = parseCsv(fs.readFileSync(path.join(dir, 'align.csv'), 'utf8')).map((r) => ({
      sku: r.sku ? Number(r.sku) : null, id: r.id, field: r.field, before: r.before, proposal: r.proposal, source: 'align' as const, reason: r.reason,
    }));
    const rows = [...alignRows, ...model];
    const out = need(a.out, '--out');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'proposals.csv'), toCsv(rows));
    const count = (s: Source) => rows.filter((r) => r.source === s).length;
    console.log(JSON.stringify({ step: 'proposals', rows: rows.length, align: count('align'), keep_display: count('keep_display'), keep_official: count('keep_official'), new_text: count('new_text'), invalid_answer: count('invalid_answer'), out: path.join(out, 'proposals.csv') }, null, 2));
    return;
  }
  if (a.step === 'apply') {
    if (process.env.CATALOGUE_NAME_FIX_CONFIRM !== 'apply') throw new Error('Set CATALOGUE_NAME_FIX_CONFIRM=apply to write');
    if (!process.env.MONGO_URL) throw new Error('MONGO_URL is required');
    const rows = parseCsv(fs.readFileSync(need(a.approved, '--apply'), 'utf8'));
    const mongoose = (await import('mongoose')).default;
    await mongoose.connect(process.env.MONGO_URL);
    const runId = `name-fix-${new Date().toISOString()}`;
    const res = await applyApproved(
      rows, (id) => (/^[0-9a-f]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : id),
      mongoose.connection.collection(a.collection) as unknown as UpdateCollection,
      mongoose.connection.collection('medicine_name_fixes') as unknown as AuditCollection, runId,
    );
    console.log(JSON.stringify({ step: 'apply', run_id: runId, collection: a.collection, ...res }, null, 2));
    await mongoose.disconnect();
    return;
  }
  throw new Error('step must be one of: scan | estimate | run | proposals, or --apply <approved.csv>');
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
