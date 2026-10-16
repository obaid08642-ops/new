/**
 * #1556 decision A (owner, 2026-10-16): the English name is the reference.
 *
 * For every medicine record, the displayed Arabic name (`name_ar`,
 * `translations.ar.name`) and the official Arabic name (`official_name_ar`,
 * `translations.ar.official_name`) are compared with the English name
 * (`name_en`, falling back to `translations.en.name`) by brand and by the
 * numbers in the name (strength and pack):
 *   - the candidate that matches the English brand + numbers is chosen and the
 *     display and official fields are made to agree with it;
 *   - if no candidate matches, an Arabic name is built from the English one and
 *     the row is flagged `needs_owner_check: true`;
 *   - `translations.{ur,hi,bn}.name` / `.official_name` get the same check; when
 *     neither matches, the English reference name is used (flagged), never a
 *     machine-written Urdu/Hindi/Bengali name;
 *   - Arabic descriptions that name another catalogue brand are REPORTED only
 *     (the schema has no safe fallback for a description; medical text is never
 *     rewritten automatically);
 *   - records that share one Arabic display name with a different English
 *     product are reported for the owner (variants such as Durex Thin/Invisible
 *     have the same brand and numbers, so the matcher alone cannot split them).
 *
 * Only name fields are written. Nothing is deleted. Each write is keyed by the
 * record `_id` and guarded by the exact `before` value, so re-running is a no-op
 * and a record edited after the dry run is skipped. Every applied change is also
 * stored in `medicine_name_fixes` (run_id, record, before, after) for rollback.
 *
 * Usage (see the PR for the review-session runbook):
 *   # dry run from a JSON / JSONL export (no database access):
 *   npx ts-node src/scripts/fix-catalogue-names.ts --input export.json --out ./name-fix-report
 *   # dry run against a database (default mode, read-only):
 *   MONGO_URL=... npx ts-node src/scripts/fix-catalogue-names.ts --out ./name-fix-report
 *   # apply exactly the approved report:
 *   MONGO_URL=... CATALOGUE_NAME_FIX_CONFIRM=apply npx ts-node src/scripts/fix-catalogue-names.ts \
 *     --apply --plan ./name-fix-report/name-fixes.json
 */

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

export interface FixRow {
  kind: 'change' | 'report';
  sku: number | null;
  id: string;
  _id?: unknown;
  field: string;
  before: string | null;
  after: string | null;
  reason: string;
  needs_owner_check: boolean;
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

function firstSegmentWords(name: string): string[] {
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

function brandMatches(localName: string, nameEn: string, lang: NameLang): boolean {
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
// Arabic name built from the English name (convention of correct records:
// "<brand> <strength> <unit> - <count> <form>").
// ---------------------------------------------------------------------------

const UNIT_AR: Array<[RegExp, string]> = [
  [/^mcg$|^µg$|^ug$/i, 'ميكروجرام'], [/^mg$/i, 'مجم'], [/^(gm|g|gram|grams)$/i, 'جم'],
  [/^ml$/i, 'مل'], [/^(iu|i\.u\.)$/i, 'وحدة دولية'], [/^kg$/i, 'كجم'], [/^l$/i, 'لتر'],
];
const WORD_AR: Array<[RegExp, string]> = [
  [/^tab(let|lets|s)?$/i, 'قرص'], [/^cap(sule|sules|s)?$/i, 'كبسولة'], [/^syrup$/i, 'شراب'],
  [/^cream$/i, 'كريم'], [/^ointment$/i, 'مرهم'], [/^gel$/i, 'جل'], [/^drops?$/i, 'نقط'],
  [/^vials?$/i, 'فيال'], [/^ampoules?$|^amps?$/i, 'أمبول'], [/^syringes?$|^pens?$/i, 'حقنة'],
  [/^sachets?$/i, 'كيس'], [/^suppositor(y|ies)$/i, 'لبوس'], [/^spray$/i, 'بخاخ'],
  [/^lotion$/i, 'لوشن'], [/^suspension$/i, 'معلق'], [/^injection$/i, 'حقن'],
  [/^(pcs|pieces?)$/i, 'قطعة'], [/^bottles?$/i, 'عبوة'], [/^patch(es)?$/i, 'لصقة'],
  [/^cr$/i, 'سي ار'], [/^xr$/i, 'اكس ار'], [/^sr$/i, 'اس ار'], [/^xl$/i, 'اكس ال'],
];

export function transliterateLatinToArabic(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  let out = '';
  for (let i = 0; i < w.length; i++) {
    const two = w.slice(i, i + 2);
    const map2: Record<string, string> = { ph: 'ف', sh: 'ش', ch: 'ش', th: 'ث', ck: 'ك', qu: 'كو', gh: 'ج' };
    if (map2[two]) { out += map2[two]; i++; continue; }
    const c = w[i];
    const nx = w[i + 1] || '';
    if (c === 'e' && i === w.length - 1 && i > 0) continue; // silent final e
    if (c === 'c') { out += /[eiy]/.test(nx) ? 'س' : 'ك'; continue; }
    if (i > 0 && c === w[i - 1] && !'aeiouy'.includes(c)) continue;
    const map1: Record<string, string> = {
      a: 'ا', b: 'ب', d: 'د', e: 'ي', f: 'ف', g: 'ج', h: 'ه', i: 'ي', j: 'ج', k: 'ك', l: 'ل',
      m: 'م', n: 'ن', o: 'و', p: 'ب', q: 'ك', r: 'ر', s: 'س', t: 'ت', u: 'و', v: 'ف', w: 'و',
      x: 'كس', y: 'ي', z: 'ز',
    };
    out += map1[c] || '';
  }
  return out;
}

export function buildArabicNameFromEnglish(nameEn: string): string {
  const words = firstSegmentWords(nameEn);
  const brandWord = words[0] || '';
  const tokens = normaliseDigits(nameEn).split(/(\s+|,|-|\/)/);
  const out: string[] = [];
  let brandDone = false;
  for (const t of tokens) {
    if (!t) continue;
    if (/^\s+$/.test(t)) { out.push(' '); continue; }
    if (t === ',') { out.push('،'); continue; }
    if (t === '-' || t === '/') { out.push(t); continue; }
    if (!brandDone && t.replace(/[^\p{L}]/gu, '') === brandWord) { out.push(transliterateLatinToArabic(t)); brandDone = true; continue; }
    const num = t.match(/^(\d+(?:\.\d+)?)(%|[a-zµ.]+)?$/i);
    if (num) {
      out.push(num[1]);
      if (num[2]) {
        const unit = num[2] === '%' ? '%' : UNIT_AR.find(([re]) => re.test(num[2]))?.[1];
        if (unit) out.push(unit === '%' ? '%' : ` ${unit}`);
      }
      continue;
    }
    const clean = t.replace(/[^\p{L}%.]/gu, '');
    if (clean === '%') { out.push('%'); continue; }
    const unit = UNIT_AR.find(([re]) => re.test(clean))?.[1] || WORD_AR.find(([re]) => re.test(clean))?.[1];
    if (unit) out.push(unit);
    // Other English words (ingredient, claims) are dropped: the owner writes them.
  }
  return out.join('')
    .replace(/\s+/g, ' ')
    // A run of separators keeps only its last one (one character class, so no backtracking on long runs).
    .replace(/[\s،\-/]{2,}/g, (run) => { const seps = run.replace(/\s/g, ''); return seps.length > 1 ? ` ${seps.slice(-1)} ` : run; })
    .replace(/\s*،(\s*،)+/g, '،')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+،/g, '،')
    .replace(/^[\s،\-/]+|[\s،\-/]+$/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function getPath(rec: CatalogueRecord, path: string): string | null {
  let cur: unknown = rec;
  for (const p of path.split('.')) {
    if (!cur || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return str(cur);
}

function recordId(rec: CatalogueRecord): string {
  const raw = rec._id ?? rec.id;
  if (raw && typeof raw === 'object' && '$oid' in (raw as Record<string, unknown>)) return String((raw as Record<string, unknown>).$oid);
  return String(raw ?? '');
}

function recordSku(rec: CatalogueRecord): number | null {
  const n = Number(rec.sku);
  return Number.isFinite(n) && rec.sku !== null && rec.sku !== undefined ? n : null;
}

export function englishName(rec: CatalogueRecord): string | null {
  return str(rec.name_en) || getPath(rec, 'translations.en.name');
}

const SCORE: Record<MatchLevel, number> = { full: 2, partial: 1, none: 0 };

const FIELDS: Record<NameLang, { display: string[]; official: string[] }> = {
  ar: { display: ['name_ar', 'translations.ar.name'], official: ['official_name_ar', 'translations.ar.official_name'] },
  ur: { display: ['translations.ur.name'], official: ['translations.ur.official_name'] },
  hi: { display: ['translations.hi.name'], official: ['translations.hi.official_name'] },
  bn: { display: ['translations.bn.name'], official: ['translations.bn.official_name'] },
};

function planRecordLang(rec: CatalogueRecord, lang: NameLang, nameEn: string): FixRow[] {
  const fields = [...FIELDS[lang].display, ...FIELDS[lang].official];
  const present = fields.map((f) => ({ field: f, value: getPath(rec, f) })).filter((x) => x.value) as Array<{ field: string; value: string }>;
  if (!present.length) return [];
  const scored = present.map((p) => ({ ...p, level: nameMatchesEnglish(p.value, nameEn, lang).match }));
  const best = scored.reduce((a, b) => (SCORE[b.level] > SCORE[a.level] ? b : a));
  const allSame = present.every((p) => p.value === present[0].value);
  if (allSame && best.level !== 'none') return [];

  let target: string;
  let generated = false;
  if (best.level === 'none') {
    generated = true;
    target = lang === 'ar' ? buildArabicNameFromEnglish(nameEn) : nameEn;
  } else {
    target = best.value;
  }
  const rows: FixRow[] = [];
  for (const p of scored) {
    if (p.value === target) continue;
    const wrong = p.level === 'none';
    const reason = generated
      ? (lang === 'ar'
        ? `wrong_product: no ${lang} name matches English brand/strength/pack; built from English "${nameEn}"`
        : `wrong_product: no ${lang} name matches English brand/strength/pack; English reference name used`)
      : wrong
        ? `wrong_product: "${p.value}" does not match English brand/strength/pack; using ${best.field}`
        : `align: same brand as English (spelling variant or pack detail); ${p.field} aligned to ${best.field}`;
    rows.push({
      kind: 'change', sku: recordSku(rec), id: recordId(rec), _id: rec._id ?? rec.id, field: p.field,
      before: p.value, after: target, reason, needs_owner_check: generated || best.level === 'partial',
    });
  }
  return rows;
}

export function planNameFixes(records: CatalogueRecord[]): FixRow[] {
  const rows: FixRow[] = [];
  for (const rec of records) {
    const nameEn = englishName(rec);
    if (!nameEn) continue;
    for (const lang of ['ar', 'ur', 'hi', 'bn'] as NameLang[]) rows.push(...planRecordLang(rec, lang, nameEn));
  }
  return rows;
}

const DESCRIPTION_FIELDS = ['description_ar', 'translations.ar.description'];

/**
 * Arabic descriptions that name another catalogue brand and not the record's own
 * brand. Report only: `after` equals `before`, nothing is written.
 */
export function planDescriptionReports(records: CatalogueRecord[]): FixRow[] {
  const brandIndex = new Map<string, Set<number | string>>();
  const ownSkeletons = new Map<CatalogueRecord, Set<string>>();
  for (const rec of records) {
    const en = englishName(rec);
    if (!en) continue;
    const first = firstSegmentWords(en)[0] || '';
    const sks = new Set(latinSkeletons(first).filter((s) => s.length >= 3));
    ownSkeletons.set(rec, sks);
    for (const s of sks) {
      if (!brandIndex.has(s)) brandIndex.set(s, new Set());
      (brandIndex.get(s) as Set<number | string>).add(recordSku(rec) ?? recordId(rec));
    }
  }
  const rows: FixRow[] = [];
  for (const rec of records) {
    const own = ownSkeletons.get(rec);
    if (!own) continue;
    const seen = new Set<string>();
    for (const field of DESCRIPTION_FIELDS) {
      const text = getPath(rec, field);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      const words = normaliseArabic(text).split(/[^\p{L}\p{M}]+/u).filter(Boolean);
      const sks = new Set<string>();
      for (const w of words) {
        sks.add(brandSkeleton(w, 'ar'));
        if (w.startsWith('ال') && w.length > 4) sks.add(brandSkeleton(w.slice(2), 'ar'));
      }
      if ([...own].some((s) => sks.has(s))) continue;
      const others = new Set<number | string>();
      for (const s of sks) {
        if (s.length < 3 || own.has(s)) continue;
        for (const o of brandIndex.get(s) || []) if (o !== (recordSku(rec) ?? recordId(rec))) others.add(o);
      }
      if (!others.size) continue;
      rows.push({
        kind: 'report', sku: recordSku(rec), id: recordId(rec), field, before: text, after: text,
        reason: `description_other_brand: names the brand of sku ${[...others].slice(0, 5).join(', ')} and not "${firstSegmentWords(englishName(rec) || '')[0]}"; not rewritten (medical text, no safe fallback)`,
        needs_owner_check: true,
      });
    }
  }
  return rows;
}

/** Records that share one Arabic display name with a different English product (after the planned fixes). */
export function planSharedNameReports(records: CatalogueRecord[], changes: FixRow[]): FixRow[] {
  const after = new Map<string, string>();
  for (const c of changes) if (c.field === 'name_ar') after.set(c.id, c.after as string);
  const groups = new Map<string, CatalogueRecord[]>();
  for (const rec of records) {
    const ar = after.get(recordId(rec)) ?? str(rec.name_ar) ?? getPath(rec, 'translations.ar.name');
    if (!ar || !englishName(rec)) continue;
    const key = normaliseArabic(ar).replace(/\s+/g, ' ');
    if (!groups.has(key)) groups.set(key, []);
    (groups.get(key) as CatalogueRecord[]).push(rec);
  }
  const rows: FixRow[] = [];
  for (const [, group] of groups) {
    const ens = new Set(group.map((r) => (englishName(r) as string).toLowerCase()));
    if (ens.size < 2) continue;
    for (const rec of group) {
      const others = group.filter((g) => g !== rec).map((g) => `${recordSku(g)} "${englishName(g)}"`);
      const name = after.get(recordId(rec)) ?? str(rec.name_ar) ?? getPath(rec, 'translations.ar.name');
      rows.push({
        kind: 'report', sku: recordSku(rec), id: recordId(rec), field: 'name_ar', before: name, after: name,
        reason: `shared_arabic_name: same Arabic name as ${others.join('; ')} (English "${englishName(rec)}"); owner to name the variant`,
        needs_owner_check: true,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Apply (guarded by the before value; idempotent)
// ---------------------------------------------------------------------------

export interface UpdateCollection {
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount?: number }>;
}
export interface AuditCollection {
  insertOne(doc: Record<string, unknown>): Promise<unknown>;
}

export async function applyPlan(plan: FixRow[], collection: UpdateCollection, audit: AuditCollection, runId: string): Promise<number> {
  const byRecord = new Map<string, FixRow[]>();
  for (const row of plan) {
    if (row.kind !== 'change' || row.after === null || row.after === row.before) continue;
    if (!byRecord.has(row.id)) byRecord.set(row.id, []);
    (byRecord.get(row.id) as FixRow[]).push(row);
  }
  let modified = 0;
  for (const [, rows] of byRecord) {
    const filter: Record<string, unknown> = { _id: rows[0]._id };
    const set: Record<string, unknown> = {};
    for (const r of rows) { filter[r.field] = r.before; set[r.field] = r.after; }
    const res = await collection.updateOne(filter, { $set: set });
    if (res.modifiedCount) {
      modified += 1;
      await audit.insertOne({
        run_id: runId, record_id: rows[0].id, record_key: rows[0]._id, sku: rows[0].sku, at: new Date(),
        changes: rows.map((r) => ({ field: r.field, before: r.before, after: r.after, reason: r.reason })),
      });
    }
  }
  return modified;
}

// ---------------------------------------------------------------------------
// Report + CLI
// ---------------------------------------------------------------------------

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: FixRow[]): string {
  const head = ['kind', 'sku', 'id', 'field', 'before', 'after', 'reason', 'needs_owner_check'];
  return [head.join(','), ...rows.map((r) => head.map((h) => csvCell(r[h as keyof FixRow])).join(','))].join('\n') + '\n';
}

export function buildReport(records: CatalogueRecord[]): FixRow[] {
  const changes = planNameFixes(records);
  return [...changes, ...planDescriptionReports(records), ...planSharedNameReports(records, changes)];
}

function parseArgs(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  return { apply: argv.includes('--apply'), input: get('--input'), out: get('--out') || './catalogue-name-fixes', plan: get('--plan') };
}

async function main() {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const args = parseArgs(process.argv.slice(2));
  const serialise = (rows: FixRow[]) => rows.map(({ _id, ...rest }) => ({ ...rest, record_key: _id && typeof _id === 'object' ? rest.id : _id }));

  if (!args.apply) {
    let records: CatalogueRecord[];
    if (args.input) {
      const raw = fs.readFileSync(args.input, 'utf8').trim();
      records = raw.startsWith('[') ? JSON.parse(raw) : raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    } else {
      const mongoose = (await import('mongoose')).default;
      if (!process.env.MONGO_URL) throw new Error('MONGO_URL or --input is required');
      await mongoose.connect(process.env.MONGO_URL);
      records = (await mongoose.connection.collection('medicines_master').find({ is_deleted: { $ne: true } }).toArray()) as unknown as CatalogueRecord[];
      await mongoose.disconnect();
    }
    const report = buildReport(records);
    fs.mkdirSync(args.out, { recursive: true });
    fs.writeFileSync(path.join(args.out, 'name-fixes.json'), JSON.stringify(serialise(report), null, 2));
    fs.writeFileSync(path.join(args.out, 'name-fixes.csv'), toCsv(report));
    const changes = report.filter((r) => r.kind === 'change');
    console.log(JSON.stringify({
      mode: 'dry-run', records: records.length,
      changed_records: new Set(changes.map((c) => c.id)).size, changed_fields: changes.length,
      needs_owner_check: report.filter((r) => r.needs_owner_check).length,
      description_reports: report.filter((r) => r.reason.startsWith('description_')).length,
      shared_name_reports: report.filter((r) => r.reason.startsWith('shared_arabic_name')).length,
      out: args.out,
    }, null, 2));
    return;
  }

  if (process.env.CATALOGUE_NAME_FIX_CONFIRM !== 'apply') throw new Error('Set CATALOGUE_NAME_FIX_CONFIRM=apply to write');
  if (!args.plan) throw new Error('--apply needs --plan <name-fixes.json> (the approved dry-run report)');
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL is required');
  const mongoose = (await import('mongoose')).default;
  await mongoose.connect(process.env.MONGO_URL);
  const approved = JSON.parse(fs.readFileSync(args.plan, 'utf8')) as Array<FixRow & { record_key?: unknown }>;
  const plan: FixRow[] = approved.map((r) => ({
    ...r,
    _id: typeof r.record_key === 'string' && /^[0-9a-f]{24}$/i.test(r.record_key) ? new mongoose.Types.ObjectId(r.record_key) : r.record_key,
  }));
  const runId = `name-fix-${new Date().toISOString()}`;
  const modified = await applyPlan(
    plan,
    mongoose.connection.collection('medicines_master') as unknown as UpdateCollection,
    mongoose.connection.collection('medicine_name_fixes') as unknown as AuditCollection,
    runId,
  );
  const planned = new Set(plan.filter((r) => r.kind === 'change').map((r) => r.id)).size;
  console.log(JSON.stringify({ mode: 'apply', run_id: runId, planned_records: planned, modified_records: modified, skipped_changed_since_dry_run: planned - modified }, null, 2));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
