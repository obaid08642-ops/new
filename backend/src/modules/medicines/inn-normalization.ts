/**
 * Issue 1556: one normalization table for active-ingredient names (Arabic and English spellings -> one INN),
 * strength units, dosage forms and routes. Versioned: a change to any table bumps INN_TABLE_VERSION, and the
 * catalogue migration re-parses every row that a previous version parsed (rows an admin reviewed are never touched).
 *
 * Built from the spellings found in the production catalogue (public API sample, 2026-10-16) plus the standard
 * INN / English name of each substance. A spelling that is not here is never guessed: the row goes to review.
 *
 * PROVISIONAL: the owner's field-by-field data report on issue 1556 may change these rules before the migration runs.
 */
export const INN_TABLE_VERSION = '2026-10-23.1';

/** Matching form of a text: Arabic letter variants folded, diacritics removed, digits latin, lower case. */
export function normalizeText(s: string): string {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٪/g, '%')
    .replace(/،/g, ',')
    .replace(/[‌-‏]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokens: numbers (with , . groups), words (letters), and single punctuation marks. */
export function tokenize(s: string): string[] {
  return normalizeText(s).match(/\d+(?:[.,]\d+)*|[\p{L}\p{M}]+|%|[^\s\p{L}\p{M}\d]/gu) || [];
}

/** inn -> spellings. `parent` marks a more specific substance (vitamin D3 refines vitamin D). */
export const INN_ENTRIES: ReadonlyArray<{ inn: string; parent?: string; aliases: string[] }> = [
  { inn: 'paracetamol', aliases: ['باراسيتامول', 'بارسيتامول', 'paracetamol', 'acetaminophen', 'اسيتامينوفين'] },
  { inn: 'ibuprofen', aliases: ['ايبوبروفين', 'ibuprofen'] },
  { inn: 'ketoprofen', aliases: ['كيتوبروفين', 'ketoprofen'] },
  { inn: 'loxoprofen', aliases: ['لوكسوبروفين', 'loxoprofen'] },
  { inn: 'diclofenac', aliases: ['ديكلوفيناك', 'diclofenac'] },
  { inn: 'diclofenac sodium', aliases: ['ديكلوفيناك الصوديوم', 'ديكلوفيناك صوديوم', 'diclofenac sodium'] },
  { inn: 'diclofenac potassium', aliases: ['ديكلوفيناك البوتاسيوم', 'ديكلوفيناك بوتاسيوم', 'diclofenac potassium'] },
  { inn: 'acetylsalicylic acid', aliases: ['حمض اسيتيل الساليسيليك', 'حمض الاسيتيل ساليسيليك', 'acetylsalicylic acid', 'aspirin'] },
  { inn: 'pseudoephedrine', aliases: ['سودوافدرين', 'سودوافدرين هيدروكلوريد', 'pseudoephedrine', 'pseudoephedrine hydrochloride'] },
  { inn: 'chlorphenamine', aliases: ['كلورفينيرامين', 'كلورفينيرامين ماليات', 'chlorphenamine', 'chlorpheniramine', 'chlorpheniramine maleate'] },
  { inn: 'triprolidine', aliases: ['تريبروليدين', 'triprolidine'] },
  { inn: 'diphenhydramine', aliases: ['ديفينهيدرامين', 'ديفينهيدرامين هيدروكلوريد', 'diphenhydramine', 'diphenhydramine hydrochloride'] },
  { inn: 'caffeine', aliases: ['كافيين', 'caffeine'] },
  { inn: 'codeine', aliases: ['كودايين', 'كودين', 'codeine'] },
  { inn: 'chlorzoxazone', aliases: ['كلورزوكسازون', 'chlorzoxazone'] },
  { inn: 'amoxicillin', aliases: ['اموكسيسيلين', 'اموكسيسلين', 'amoxicillin'] },
  { inn: 'clavulanic acid', aliases: ['حمض كلافولانيك', 'حمض الكلافولانيك', 'clavulanic acid', 'clavulanate'] },
  { inn: 'omeprazole', aliases: ['اوميبرازول', 'omeprazole'] },
  { inn: 'sodium bicarbonate', aliases: ['بيكربونات الصوديوم', 'sodium bicarbonate'] },
  { inn: 'metformin', aliases: ['ميتفورمين', 'ميتفورمين هيدروكلورايد', 'ميتفورمين هيدروكلوريد', 'metformin', 'metformin hydrochloride'] },
  { inn: 'empagliflozin', aliases: ['امباجليفلوزين', 'empagliflozin'] },
  { inn: 'dapagliflozin', aliases: ['داباجليفلوزين', 'dapagliflozin'] },
  { inn: 'sitagliptin', aliases: ['سيتاجليبتين', 'sitagliptin'] },
  { inn: 'vildagliptin', aliases: ['فيلداجليبتين', 'vildagliptin'] },
  { inn: 'alogliptin', aliases: ['الوجليبتين', 'alogliptin'] },
  { inn: 'pioglitazone', aliases: ['بيوجليتازون', 'pioglitazone'] },
  { inn: 'glibenclamide', aliases: ['جليبنكلاميد', 'glibenclamide', 'glyburide'] },
  { inn: 'glimepiride', aliases: ['جليمبريد', 'glimepiride'] },
  { inn: 'cetirizine', aliases: ['سيتيريزين', 'cetirizine'] },
  { inn: 'loratadine', aliases: ['لوراتادين', 'loratadine'] },
  { inn: 'desloratadine', aliases: ['ديسلوراتادين', 'desloratadine'] },
  { inn: 'alfacalcidol', aliases: ['الفاكالسيدول', 'alfacalcidol'] },
  { inn: 'vitamin d', aliases: ['فيتامين د', 'vitamin d'] },
  { inn: 'colecalciferol', parent: 'vitamin d', aliases: ['فيتامين د3', 'فيتامين د 3', 'كوليكالسيفيرول', 'كولي كالسيفيرول', 'vitamin d3', 'cholecalciferol', 'colecalciferol'] },
  { inn: 'ascorbic acid', aliases: ['فيتامين سي', 'فيتامين ج', 'حمض الاسكوربيك', 'vitamin c', 'ascorbic acid'] },
  { inn: 'calcium', aliases: ['كالسيوم', 'calcium'] },
  { inn: 'zinc', aliases: ['زنك', 'zinc'] },
  { inn: 'iron', aliases: ['حديد', 'iron'] },
  { inn: 'levocarnitine', aliases: ['ل - كارنتين', 'ل - كارنيتين', 'l - carnitine', 'levocarnitine'] },
  { inn: 'omega-3 fatty acids', aliases: ['اوميجا 3', 'اوميغا 3', 'omega 3', 'omega - 3'] },
  { inn: 'docosahexaenoic acid', aliases: ['دي اتش ايه', 'dha'] },
  { inn: 'dexpanthenol', aliases: ['ديكسبانثينول', 'دكسبانثينول', 'dexpanthenol'] },
  { inn: 'panthenol', aliases: ['بانثينول', 'برو فيتامين ب5', 'بروفيتامين ب5', 'بروفيتامين b5', 'provitamin b5', 'panthenol'] },
  { inn: 'chlorhexidine', aliases: ['كلورهيكسيدين', 'chlorhexidine'] },
  // 2026-10-23.1: from the active ingredients of the test catalogue (nabd_live); the Arabic spellings are proposals for the owner's sign-off.
  { inn: 'azithromycin', aliases: ['ازيثرومايسين', 'ازيثروميسين', 'azithromycin'] },
  { inn: 'tramadol', aliases: ['ترامادول', 'tramadol'] },
];

export const STRENGTH_UNITS = ['mg', 'g', 'mcg', 'iu', '%', 'mg/ml', 'mg/5ml', 'mcg/ml', 'iu/ml', 'mg/g'] as const;
export type StrengthUnit = (typeof STRENGTH_UNITS)[number];

/** Numerator units of a strength. */
export const UNIT_ALIASES: ReadonlyArray<[string, 'mg' | 'g' | 'mcg' | 'iu' | 'ml']> = [
  ['مجم', 'mg'], ['ملجم', 'mg'], ['ملغ', 'mg'], ['ملغم', 'mg'], ['مغ', 'mg'], ['mg', 'mg'],
  ['جم', 'g'], ['جرام', 'g'], ['غرام', 'g'], ['g', 'g'], ['gm', 'g'],
  ['مكجم', 'mcg'], ['ميكروجرام', 'mcg'], ['ميكروغرام', 'mcg'], ['ميكرو جرام', 'mcg'], ['mcg', 'mcg'], ['µg', 'mcg'], ['ug', 'mcg'],
  ['وحده دوليه', 'iu'], ['وحده', 'iu'], ['iu', 'iu'], ['i . u', 'iu'], ['units', 'iu'],
  ['مل', 'ml'], ['ml', 'ml'],
];

export const DOSAGE_FORMS = [
  'tablet', 'capsule', 'softgel', 'effervescent_tablet', 'effervescent_granules', 'extended_release_tablet', 'extended_release_capsule',
  'syrup', 'suspension', 'drops', 'eye_drops', 'cream', 'gel', 'ointment', 'patch', 'suppository', 'ampoule', 'injection',
  'sachet', 'gummy', 'spray', 'solution', 'lotion', 'powder',
] as const;
export type DosageForm = (typeof DOSAGE_FORMS)[number];

/** Base form words. */
export const FORM_ALIASES: ReadonlyArray<[string, DosageForm]> = [
  ['اقراص', 'tablet'], ['قرص', 'tablet'], ['tablet', 'tablet'], ['tablets', 'tablet'], ['caplet', 'tablet'], ['caplets', 'tablet'],
  ['كبسول', 'capsule'], ['كبسولات', 'capsule'], ['كبسوله', 'capsule'], ['capsule', 'capsule'], ['capsules', 'capsule'],
  ['كبسولات جيلاتينيه', 'softgel'], ['كبسوله جيلاتينيه', 'softgel'], ['كبسوله هلاميه', 'softgel'], ['softgel', 'softgel'], ['softgels', 'softgel'],
  ['شراب', 'syrup'], ['syrup', 'syrup'],
  ['معلق', 'suspension'], ['suspension', 'suspension'],
  ['نقط', 'drops'], ['نقاط', 'drops'], ['قطره', 'drops'], ['قطرات', 'drops'], ['drops', 'drops'],
  ['كريم', 'cream'], ['cream', 'cream'],
  ['جل', 'gel'], ['جيل', 'gel'], ['gel', 'gel'],
  ['مرهم', 'ointment'], ['ointment', 'ointment'],
  ['لصقه', 'patch'], ['لاصقه', 'patch'], ['لزقه', 'patch'], ['patch', 'patch'], ['patches', 'patch'],
  ['تحاميل', 'suppository'], ['تحميله', 'suppository'], ['لبوس', 'suppository'], ['suppository', 'suppository'], ['suppositories', 'suppository'],
  ['امبول', 'ampoule'], ['امبولات', 'ampoule'], ['ampoule', 'ampoule'], ['ampoules', 'ampoule'],
  ['حقن', 'injection'], ['حقنه', 'injection'], ['injection', 'injection'],
  ['اكياس', 'sachet'], ['sachet', 'sachet'], ['sachets', 'sachet'],
  ['جوميز', 'gummy'], ['gummies', 'gummy'], ['gummy', 'gummy'],
  ['بخاخ', 'spray'], ['spray', 'spray'],
  ['محلول', 'solution'], ['solution', 'solution'],
  ['لوشن', 'lotion'], ['lotion', 'lotion'],
  ['بودره', 'powder'], ['مسحوق', 'powder'], ['powder', 'powder'],
];

/** Modifiers combined with a base form. */
export const FORM_MODIFIERS: ReadonlyArray<[string, 'effervescent' | 'extended' | 'eye']> = [
  ['فوار', 'effervescent'], ['فواره', 'effervescent'], ['effervescent', 'effervescent'],
  ['ممتده المفعول', 'extended'], ['extended release', 'extended'],
  ['للعين', 'eye'], ['عين', 'eye'], ['eye', 'eye'],
];

export const ROUTES = ['oral', 'cutaneous', 'ocular', 'auricular', 'nasal', 'rectal', 'vaginal', 'parenteral'] as const;
export type Route = (typeof ROUTES)[number];

export const ROUTE_PHRASES: ReadonlyArray<[string, Route]> = [
  ['عن طريق الفم', 'oral'], ['بالفم', 'oral'], ['oral', 'oral'], ['by mouth', 'oral'],
  ['للاذن', 'auricular'], ['ear', 'auricular'], ['للانف', 'nasal'], ['nasal', 'nasal'],
  ['شرجي', 'rectal'], ['rectal', 'rectal'], ['مهبلي', 'vaginal'], ['vaginal', 'vaginal'],
];

/** Route implied by a form alone; forms with more than one possible route (drops, suspension, ampoule, spray…) imply none. */
export const ROUTE_BY_FORM: Partial<Record<DosageForm, Route>> = {
  tablet: 'oral', capsule: 'oral', softgel: 'oral', effervescent_tablet: 'oral', effervescent_granules: 'oral',
  extended_release_tablet: 'oral', extended_release_capsule: 'oral', syrup: 'oral', gummy: 'oral',
  cream: 'cutaneous', gel: 'cutaneous', ointment: 'cutaneous', patch: 'cutaneous', lotion: 'cutaneous',
  eye_drops: 'ocular', suppository: 'rectal', injection: 'parenteral',
};

/** Words that carry no ingredient meaning and may be ignored. */
export const IGNORABLE_PHRASES: ReadonlyArray<string> = ['للاطفال', 'من مصدر بحري', 'بمقدار', 'في كل', 'for children'];

/** Lines inside a leaflet that belong to storage / warnings. */
export const STORAGE_MARKERS = ['يحفظ', 'التخزين', 'درجه حراره', 'store', 'storage'];
export const WARNING_MARKERS = ['تحذير', 'تحذيرات', 'warning', 'caution'];
/** Signs that the field holds a leaflet rather than an ingredient name. */
export const LEAFLET_MARKERS = ['http', 'www.', 'اعرف المزيد', 'الحجم/', 'الحجم /', 'معلومات غذائيه', 'nutritional information', 'المكونات الاخري', 'المكونات غير الفعاله', ...STORAGE_MARKERS, ...WARNING_MARKERS];

type Phrase<T> = { tokens: string[]; value: T };
function phraseIndex<T>(pairs: ReadonlyArray<[string, T]>): Map<string, Phrase<T>[]> {
  const m = new Map<string, Phrase<T>[]>();
  for (const [text, value] of pairs) {
    const tokens = tokenize(text);
    if (!tokens.length) continue;
    const list = m.get(tokens[0]) || [];
    list.push({ tokens, value });
    list.sort((a, b) => b.tokens.length - a.tokens.length);
    m.set(tokens[0], list);
  }
  return m;
}

export const INN_INDEX = phraseIndex(INN_ENTRIES.flatMap((e) => e.aliases.map((a) => [a, e.inn] as [string, string])));
export const UNIT_INDEX = phraseIndex(UNIT_ALIASES);
export const FORM_INDEX = phraseIndex(FORM_ALIASES);
export const MODIFIER_INDEX = phraseIndex(FORM_MODIFIERS);
export const ROUTE_INDEX = phraseIndex(ROUTE_PHRASES);
export const IGNORE_INDEX = phraseIndex(IGNORABLE_PHRASES.map((p) => [p, true] as [string, boolean]));
export const INN_PARENT: Record<string, string | undefined> = Object.fromEntries(INN_ENTRIES.map((e) => [e.inn, e.parent]));

/** Longest phrase of `index` starting at tokens[i]; `prefixes` lets an Arabic "و"/"ال" stick to the first word. */
export function matchPhrase<T>(index: Map<string, Phrase<T>[]>, tokens: string[], i: number, prefixes: string[] = []): { value: T; length: number } | null {
  const tryAt = (first: string) => {
    for (const p of index.get(first) || []) {
      if (p.tokens.slice(1).every((t, k) => tokens[i + 1 + k] === t)) return { value: p.value, length: p.tokens.length };
    }
    return null;
  };
  const tok = tokens[i];
  if (tok === undefined) return null;
  const direct = tryAt(tok);
  if (direct) return direct;
  for (const pre of prefixes) {
    if (tok.length > pre.length + 1 && tok.startsWith(pre)) {
      const hit = tryAt(tok.slice(pre.length));
      if (hit) return hit;
    }
  }
  return null;
}

/** The canonical INN of a spelling (whole text), or null when the table does not know it. */
export function lookupInn(text: string): string | null {
  const tokens = tokenize(text);
  const hit = matchPhrase(INN_INDEX, tokens, 0, ['وال', 'ال', 'و']);
  return hit && hit.length === tokens.length ? hit.value : null;
}
