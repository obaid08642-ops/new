/**
 * Server-side localization for structured catalogue fields that exist only in
 * Arabic in the source data (dosage form, category tree, package-size units…).
 * Long-text fields already have *_en columns and translations.{ur,hi,bn,tl}
 * maps — the client picks those via pickDbField. This module fills the gap for
 * the short "fact" values so an English/Urdu/Hindi/Bengali/Tagalog UI never
 * shows Arabic chips when the app language is not Arabic.
 */

export type DbLang = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'tl';

/** Product-supported locales. Filipino is intentionally stored under `tl` in DB. */
export const PUBLIC_CATALOG_LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
const DB_TRANSLATION_LOCALES: Array<{ product: 'ur' | 'hi' | 'bn' | 'fil'; db: 'ur' | 'hi' | 'bn' | 'tl' }> = [
  { product: 'ur', db: 'ur' },
  { product: 'hi', db: 'hi' },
  { product: 'bn', db: 'bn' },
  { product: 'fil', db: 'tl' },
];

/**
 * Returns the display-critical locale gaps that must be resolved before a
 * medicine can be made public. Optional clinical fields are validated only
 * when populated, so an empty optional field is not fabricated merely to pass
 * publication review.
 */
export function missingPublicMedicineTranslations(raw: Record<string, any>): string[] {
  const missing: string[] = [];
  if (!String(raw?.name_ar || '').trim()) missing.push('ar.name');
  if (!String(raw?.name_en || '').trim()) missing.push('en.name');
  const conditional: Array<[string, string]> = [
    ['category', 'main_category'],
    ['active_ingredient', 'active_ingredient'],
    ['form', 'dosage_form'],
    ['strength', 'strength'],
  ];
  for (const { product, db } of DB_TRANSLATION_LOCALES) {
    const translation = raw?.translations?.[db];
    if (!String(translation?.name || '').trim()) missing.push(`${product}.name`);
    for (const [sourceField, translationKey] of conditional) {
      if (String(raw?.[sourceField] || '').trim() && !String(translation?.[translationKey] || '').trim()) {
        missing.push(`${product}.${translationKey}`);
      }
    }
  }
  return missing;
}

// Arabic dosage-form vocabulary → English
const FORM_EN: Array<[RegExp, string]> = [
  [/أقراص|قرص|حبوب/i, 'Tablets'],
  [/كبسول/i, 'Capsules'],
  [/شراب/i, 'Syrup'],
  [/نقط|قطره|قطرة/i, 'Drops'],
  [/كريم/i, 'Cream'],
  [/مرهم/i, 'Ointment'],
  [/جل\b/i, 'Gel'],
  [/لوشن/i, 'Lotion'],
  [/بخاخ|اسبراي|رذاذ/i, 'Spray'],
  [/أمبول|امبول|حقن/i, 'Injection'],
  [/تحاميل|لبوس/i, 'Suppositories'],
  [/لصقة|لاصق|لصقات|بلاستر/i, 'Patches'],
  [/مسحوق|بودر/i, 'Powder'],
  [/أكياس|اكياس/i, 'Sachets'],
  [/معجون/i, 'Paste'],
  [/غسول/i, 'Cleanser'],
  [/شامبو/i, 'Shampoo'],
  [/صابون/i, 'Soap'],
  [/مكمل/i, 'Supplement'],
  [/سيروم/i, 'Serum'],
  [/زيت/i, 'Oil'],
  [/مناديل/i, 'Wipes'],
  [/كمامة|كمامات|قناع/i, 'Mask'],
  [/جهاز/i, 'Device'],
  [/إبر|ابر/i, 'Needles'],
  [/رباط|ضماد/i, 'Bandage'],
  [/فرشاة/i, 'Brush'],
  [/خيط/i, 'Floss'],
];

// Arabic category vocabulary → English
const CATEGORY_EN: Array<[RegExp, string]> = [
  [/أدوية ومكملات/i, 'Medicines & Supplements'],
  [/أدوية/i, 'Medicines'],
  [/مكملات/i, 'Supplements'],
  [/فيتامينات/i, 'Vitamins'],
  [/مسكنات الألم|مسكنات/i, 'Pain Relief'],
  [/البرد والإنفلونزا|البرد/i, 'Cold & Flu'],
  [/مضادات حيوية/i, 'Antibiotics'],
  [/الحساسية/i, 'Allergy'],
  [/الجهاز الهضمي|معدة|هضم/i, 'Digestive Health'],
  [/القلب|ضغط/i, 'Heart & Blood Pressure'],
  [/السكري|سكر/i, 'Diabetes Care'],
  [/الأم والطفل|الأم والطفوله/i, 'Mother & Baby'],
  [/مستلزمات أطفال|أطفال/i, 'Baby Essentials'],
  [/حليب أطفال|حليب/i, 'Baby Formula'],
  [/حفاضات/i, 'Diapers'],
  [/العناية بالبشرة|بشرة/i, 'Skin Care'],
  [/العناية بالشعر|شعر/i, 'Hair Care'],
  [/العناية الشخصية/i, 'Personal Care'],
  [/العناية بالفم|فم|أسنان/i, 'Oral Care'],
  [/مستلزمات طبية|مستلزمات/i, 'Medical Supplies'],
  [/أجهزة طبية|أجهزة/i, 'Medical Devices'],
  [/تغذية/i, 'Nutrition'],
  [/تجميل|مكياج/i, 'Beauty'],
  [/عطور/i, 'Fragrances'],
  [/عدسات/i, 'Contact Lenses'],
  [/إسعافات أولية|إسعافات/i, 'First Aid'],
];

// Arabic package-size units → English (word-level translation, keeps numbers)
const UNIT_EN: Array<[RegExp, string]> = [
  [/قطعة|قطعه|قطع|حبة|حبه/g, 'Pc'],
  [/قرص|أقراص/g, 'Tabs'],
  [/كبسولة|كبسولات/g, 'Caps'],
  [/مللي جرام|ملجم|ملج|مجم/g, 'mg'],
  [/جرام|جم|غم/g, 'g'],
  [/ملليلتر|مل/g, 'ml'],
  [/لتر/g, 'L'],
  [/عبوة|علبة/g, 'Pack'],
  [/زوج/g, 'Pair'],
  [/كيس|أكياس/g, 'Sachets'],
  [/بخاخ/g, 'Spray'],
  [/شريط/g, 'Strip'],
  [/وحدة/g, 'Unit'],
  [/متر/g, 'm'],
  [/سم/g, 'cm'],
];

function translateWith(table: Array<[RegExp, string]>, value: string): string | null {
  for (const [re, en] of table) {
    if (re.test(value)) return value.replace(re, en).trim();
  }
  return null;
}

function translateUnits(value: string): string {
  let out = value;
  for (const [re, en] of UNIT_EN) out = out.replace(re, en);
  return out.replace(/\s{2,}/g, ' ').trim();
}

/** Map of catalogue field base names to their key inside translations[lang]. */
const TR_KEY: Record<string, string> = {
  category: 'main_category',
  sub_category: 'sub_category',
  sub_sub_category: 'sub_sub_category',
  form: 'dosage_form',
  strength: 'strength',
  package_size: 'size_volume',
  package_content_details: 'package_content_details',
};

const LOCALIZABLE = ['category', 'sub_category', 'sub_sub_category', 'form', 'strength', 'package_size', 'package_content_details'];

/**
 * Returns a copy of the medicine document whose short structured fields are
 * localized for `lang`. For non-Arabic languages: translations[lang] map first
 * (imported from the source export), then the built-in Arabic→English
 * dictionaries as a last resort so nothing stays Arabic in a non-Arabic UI.
 */
/** DB key for a product locale (Filipino is stored under `tl`). */
export function productLocaleToDb(locale: string): DbLang {
  const l = String(locale || '').toLowerCase();
  if (l.startsWith('ar')) return 'ar';
  if (l.startsWith('ur')) return 'ur';
  if (l.startsWith('hi')) return 'hi';
  if (l.startsWith('bn')) return 'bn';
  if (l.startsWith('tl') || l.startsWith('fil')) return 'tl';
  return 'en';
}

/** Split a bullet-formatted block ("• a\n• b") into clean list items. */
function bulletList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(/\n|•/).map((s) => s.replace(/^[\s\-–—*·]+/, '').trim()).filter(Boolean);
}

function pick(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

// Long-text field base → key inside translations[lang] (v14 catalog keys).
const LONG_TEXT_TR_KEYS: Record<string, string> = {
  name: 'name',
  official_name: 'official_name',
  description: 'description',
  indications: 'indications_uses',
  dosage_instructions: 'dosage_instructions',
  side_effects: 'side_effects',
  warnings: 'warnings_precautions',
  storage_conditions: 'storage_conditions',
  how_to_use: 'how_to_use',
  package_content_details: 'package_content_details',
  brand_benefits: 'brand_benefits',
};

// v14 root fact fields are Arabic-only; localized English forms via dictionaries.
function localizeFactField(base: string, arabicValue: string, trValue: unknown, lang: DbLang): string | null {
  const fromTr = typeof trValue === 'string' && trValue.trim() ? trValue.trim() : null;
  if (fromTr) return fromTr;
  if (lang === 'ar') return arabicValue || null;
  let translated: string | null = null;
  if (base === 'form') translated = translateWith(FORM_EN, arabicValue);
  else if (base === 'strength' || base === 'package_size' || base === 'package_content_details') translated = translateUnits(arabicValue);
  else if (base === 'category' || base === 'sub_category' || base === 'sub_sub_category') translated = translateWith(CATEGORY_EN, arabicValue);
  return translated && translated !== arabicValue ? translated : arabicValue || null;
}

/**
 * STRICT per-locale public DTO.
 *
 * Every display field is resolved for exactly ONE product locale with a
 * deterministic per-field fallback chain: requested locale → en → ar.
 * The UI for locale L never receives a mix where one field is Arabic and a
 * sibling field is English when an L translation exists — the historical bug
 * this resolver eliminates.
 */
/** The public part of a record's variant attribute (decision D): kind, power, colour or shade words, and its order. */
export function publicVariant(v: unknown): { kind: string; power: number | null; colour: string | null; shade: string | null; position: number } | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.kind !== 'string') return null;
  return {
    kind: o.kind,
    power: typeof o.power === 'number' && Number.isFinite(o.power) ? o.power : null,
    colour: typeof o.colour === 'string' && o.colour ? o.colour : null,
    shade: typeof o.shade === 'string' && o.shade ? o.shade : null,
    position: typeof o.position === 'number' ? o.position : 0,
  };
}

/**
 * Owner decision E (issue 1556, 2026-10-16): on ur, hi and bn pages the product name is shown with the English name
 * under it, so a patient and a pharmacist read the same product. Not for ar, en or fil. Null when there is no English
 * name or it equals the localized one.
 */
export const ENGLISH_UNDER_LOCALES = ['ur', 'hi', 'bn'] as const;
export function englishNameUnder(productLocale: string, localizedName: string | null | undefined, nameEn: unknown): string | null {
  if (!(ENGLISH_UNDER_LOCALES as readonly string[]).includes(productLocale)) return null;
  const en = typeof nameEn === 'string' ? nameEn.trim() : '';
  if (!en || en === String(localizedName || '').trim()) return null;
  return en;
}

function publicInteractions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    const t = typeof v === 'string' ? v.trim().slice(0, 120) : '';
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= 30) break;
  }
  return out;
}

/** Product-facing locale of a stored one (`tl` is Filipino). */
export type ContentLocale = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'fil';
const DB_TO_CONTENT: Record<DbLang, ContentLocale> = { ar: 'ar', en: 'en', ur: 'ur', hi: 'hi', bn: 'bn', tl: 'fil' };

/**
 * Owner rule (2026-10-26): a section is shown in the page's language. When that language has no text for it, another language is used
 * and the section says so: Arabic pages fall back to English; English pages to Arabic; ur, hi, bn and fil pages to English, then Arabic.
 */
export function contentFallbackOrder(productLocale: string): ContentLocale[] {
  const l = DB_TO_CONTENT[productLocaleToDb(productLocale)];
  if (l === 'ar') return ['ar', 'en'];
  if (l === 'en') return ['en', 'ar'];
  return [l, 'en', 'ar'];
}

/**
 * What is STORED for one content field in one language (null when empty), with the same slots and keys the public DTO reads. Long texts
 * live in `<field>_ar` / `<field>_en` and in translations[db][key]; the short facts have an Arabic root and translations[db][key] only.
 */
export const CONTENT_FIELDS = [
  'description', 'indications', 'dosage_instructions', 'how_to_use', 'warnings', 'side_effects', 'storage_conditions', 'package_content_details',
  'active_ingredient', 'form', 'package_size', 'category', 'sub_category',
] as const;
export type ContentField = (typeof CONTENT_FIELDS)[number];
const LONG_FIELD: Partial<Record<ContentField, { column: string; key: string }>> = {
  description: { column: 'description', key: 'description' },
  indications: { column: 'indications', key: 'indications_uses' },
  dosage_instructions: { column: 'dosage', key: 'dosage_instructions' },
  how_to_use: { column: 'usage_instructions', key: 'how_to_use' },
  warnings: { column: 'warnings', key: 'warnings_precautions' },
  side_effects: { column: 'side_effects', key: 'side_effects' },
  storage_conditions: { column: 'storage_conditions', key: 'storage_conditions' },
  package_content_details: { column: 'package_content_details', key: 'package_content_details' },
};
const FACT_FIELD: Partial<Record<ContentField, { root: string; key: string }>> = {
  active_ingredient: { root: 'active_ingredient', key: 'active_ingredient' },
  form: { root: 'form', key: 'dosage_form' },
  package_size: { root: 'package_size', key: 'size_volume' },
  category: { root: 'category', key: 'main_category' },
  sub_category: { root: 'sub_category', key: 'sub_category' },
};
const DB_OF: Record<ContentLocale, DbLang> = { ar: 'ar', en: 'en', ur: 'ur', hi: 'hi', bn: 'bn', fil: 'tl' };

export function storedContentText(raw: Record<string, any>, field: ContentField, locale: ContentLocale): string | null {
  const db = DB_OF[locale];
  const tr = raw?.translations?.[db];
  const long = LONG_FIELD[field];
  if (long) {
    if (db === 'ar' || db === 'en') return pick(raw?.[`${long.column}_${db}`], tr?.[long.key]);
    return pick(tr?.[long.key]);
  }
  const fact = FACT_FIELD[field] as { root: string; key: string };
  if (db === 'ar') return pick(raw?.[fact.root], tr?.[fact.key]);
  return pick(tr?.[fact.key]);
}

/** Text direction of a content language (Arabic and Urdu are right-to-left). */
export const contentDir = (l: ContentLocale): 'rtl' | 'ltr' => (l === 'ar' || l === 'ur' ? 'rtl' : 'ltr');

/**
 * The language a stored text is really written in. A slot named `_ar` or `_en` is not trusted when the letters say otherwise (an English
 * leaflet imported into an Arabic column): Arabic-script letters and Latin letters are counted, the majority wins. Urdu, Hindi, Bengali
 * and Filipino slots are taken as labelled (Urdu shares the Arabic script, so letters cannot tell it from Arabic).
 */
export function textLanguage(value: string, slot: ContentLocale): ContentLocale {
  if (slot !== 'ar' && slot !== 'en') return slot;
  const arabic = (value.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (value.match(/[A-Za-z]/g) || []).length;
  if (slot === 'ar' && latin >= 12 && latin > arabic * 2) return 'en';
  if (slot === 'en' && arabic >= 12 && arabic > latin * 2) return 'ar';
  return slot;
}

export function resolveMedicinePublicDto(raw: Record<string, any>, productLocale: string) {
  const lang = productLocaleToDb(productLocale);
  const tr = raw?.translations?.[lang] || {};
  const trEn = raw?.translations?.en || {};
  const trAr = raw?.translations?.ar || {};

  // For ar/en the long-text values live in *_ar / *_en columns; the
  // translations map is a secondary source. For ur/hi/bn/tl only the map exists.
  const COLUMN_ALIAS: Record<string, string> = { dosage_instructions: 'dosage', how_to_use: 'usage_instructions' };
  const column = (base: string, l: DbLang) => (raw as any)?.[`${COLUMN_ALIAS[base] || base}_${l}`] ?? (raw as any)?.[`${base}_${l}`];
  // The stored text of one section in each language, in the order of the fallback rule; the first non-empty one wins.
  const slots = (base: string, trKey: string): Array<{ lang: ContentLocale; value: unknown }> => {
    const by: Record<ContentLocale, unknown[]> = {
      ar: [column(base, 'ar'), trAr[trKey]],
      en: [column(base, 'en'), trEn[trKey]],
      ur: [raw?.translations?.ur?.[trKey]], hi: [raw?.translations?.hi?.[trKey]], bn: [raw?.translations?.bn?.[trKey]], fil: [raw?.translations?.tl?.[trKey]],
    };
    return contentFallbackOrder(productLocale).flatMap((l) => by[l].map((value) => ({ lang: l, value })));
  };
  /** Which language each shown section really is in, only where it is not the page's language. */
  const fallback_langs: Record<string, ContentLocale> = {};
  const pageLang = DB_TO_CONTENT[lang];
  const note = (field: string, used: ContentLocale | null) => { if (used && used !== pageLang) fallback_langs[field] = used; };
  const text = (base: string, trKey: string, field = base): string | null => {
    for (const { lang: l, value } of slots(base, trKey)) {
      const v = pick(value);
      if (v) { note(field, textLanguage(v, l)); return v; }
    }
    return null;
  };
  const list = (base: string, trKey: string, field = base): string[] => {
    for (const { lang: l, value } of slots(base, trKey)) {
      const items = bulletList(value);
      if (items.length) { note(field, textLanguage(items.join(' '), l)); return items; }
    }
    return [];
  };

  const fact = (base: string, arabicRoot: string) => {
    const key = TR_KEY[base] || base;
    const own = lang === 'ar' ? null : pick(tr[key]);
    if (own) return own;
    const value = lang === 'ar' ? pick(arabicRoot, trAr[key]) : localizeFactField(base, arabicRoot, trEn[key], lang);
    if (value && lang !== 'ar') note(base, textLanguage(value, value === arabicRoot ? 'ar' : 'en'));
    else if (value) note(base, textLanguage(value, 'ar'));
    return value;
  };

  const images = [
    ...(Array.isArray(raw?.images) ? raw.images : []),
    raw?.image_1, raw?.image_2, raw?.image_3, raw?.image_4, raw?.image_5, raw?.image,
  ].filter((u: any, i: number, arr: any[]) => typeof u === 'string' && u.length > 4 && arr.indexOf(u) === i);

  const price = Number(raw?.price || 0);
  const isRx = raw?.requires_prescription === true || raw?.is_rx === true;
  // Decision 10: no promotion on a prescription item. The old price and the discount are withheld here,
  // like the admin catalogue lists and GET /medicines/:id do (medicines.service.ts), so no card can show them.
  const old = isRx ? 0 : Number(raw?.old_price || 0);
  const discount = old > price && price > 0 ? Math.round((1 - price / old) * 100) : 0;

  // Slugs per locale so the web app can emit true per-language hreflang URLs.
  const slugs: Record<string, string | null> = {};
  for (const { product, db } of [
    { product: 'ar', db: 'ar' }, { product: 'en', db: 'en' }, { product: 'ur', db: 'ur' },
    { product: 'hi', db: 'hi' }, { product: 'bn', db: 'bn' }, { product: 'fil', db: 'tl' },
  ] as Array<{ product: string; db: DbLang }>) {
    slugs[product] = pick(raw?.translations?.[db]?.slug, db === 'ar' ? raw?.slug : null, raw?.slug, raw?.id ? String(raw.id) : null);
  }

  const name = text('name', LONG_TEXT_TR_KEYS.name);
  return {
    id: raw?.id,
    sku: raw?.sku ?? null,
    locale: productLocale,
    resolved_lang: lang,
    name,
    english_name: englishNameUnder(productLocale, name, raw?.name_en),
    official_name: text('official_name', LONG_TEXT_TR_KEYS.official_name),
    slug: slugs[productLocale] || raw?.slug || raw?.id,
    slugs,
    description: text('description', LONG_TEXT_TR_KEYS.description),
    indications: list('indications', LONG_TEXT_TR_KEYS.indications),
    dosage_instructions: text('dosage_instructions', LONG_TEXT_TR_KEYS.dosage_instructions),
    side_effects: list('side_effects', LONG_TEXT_TR_KEYS.side_effects),
    warnings: list('warnings', LONG_TEXT_TR_KEYS.warnings),
    storage_conditions: text('storage_conditions', LONG_TEXT_TR_KEYS.storage_conditions),
    how_to_use: list('usage_instructions', LONG_TEXT_TR_KEYS.how_to_use, 'how_to_use'),
    package_content_details: text('package_content_details', LONG_TEXT_TR_KEYS.package_content_details)
      || fact('package_content_details', String(raw?.package_size || '')),
    brand_benefits: text('brand_benefits', LONG_TEXT_TR_KEYS.brand_benefits),
    category: fact('category', String(raw?.category || '')),
    sub_category: fact('sub_category', String(raw?.sub_category || '')),
    sub_sub_category: fact('sub_sub_category', String((raw as any)?.sub_sub_category || '')),
    form: fact('form', String(raw?.form || '')),
    strength: fact('strength', String(raw?.strength || '')),
    package_size: fact('package_size', String(raw?.package_size || '')),
    active_ingredient: fact('active_ingredient', String(raw?.active_ingredient || '')),
    manufacturer: raw?.manufacturer || null,
    barcode: raw?.barcode || null,
    price, old_price: old || null,
    discount_percent: discount, has_discount: discount > 0,
    currency: 'SAR',
    is_rx: isRx,
    // Decision 11: the "online only" badge on the public product page and the online-only note on cart lines.
    online_exclusive: raw?.online_exclusive === true,
    // Published items are shown on the site; only indexable ones go to search engines (the page says noindex otherwise).
    indexable: raw?.indexing_eligibility === true,
    available_online: raw?.available_online !== false,
    availability_status: raw?.availability_status || 'none',
    available: raw?.availability_status === 'none' || !raw?.availability_status,
    country_of_origin: raw?.country_of_origin || null,
    // Design parity (#1819): the stored refrigeration flag, and the active ingredients recorded as interacting with this
    // product (leaflet information; strings only, trimmed, no duplicates, at most 30). Nothing is derived or invented.
    cold_chain: raw?.cold_chain === true,
    interactions: publicInteractions(raw?.interactions),
    images,
    image: images[0] || null,
    // Decision D (issue 1556): the record's variant group and its own attribute (power / colour / shade / picture order).
    variant_group: typeof raw?.variant_group === 'string' && raw.variant_group ? raw.variant_group : null,
    variant: publicVariant(raw?.variant),
    /** Sections shown in another language than `locale` (field → the language the text is in); empty when nothing fell back. */
    fallback_langs,
    search_aliases: Array.isArray(tr?.search_aliases) ? tr.search_aliases : (Array.isArray(trEn?.search_aliases) ? trEn.search_aliases : []),
  };
}

export function localizeMedicineStructured<T extends Record<string, any>>(raw: T, lang?: DbLang): T {
  if (!raw || !lang || lang === 'ar') return raw;
  const out: Record<string, any> = { ...raw };
  for (const base of LOCALIZABLE) {
    const current = out[base];
    // translations map first (ur/hi/bn/tl)
    const trKey = TR_KEY[base];
    const fromTr = trKey ? raw?.translations?.[lang]?.[trKey] : undefined;
    if (typeof fromTr === 'string' && fromTr.trim()) { out[base] = fromTr; continue; }
    if (typeof current !== 'string' || !current.trim()) continue;
    // English dictionaries (and fallback for other languages)
    let translated: string | null = null;
    if (base === 'form') translated = translateWith(FORM_EN, current);
    else if (base === 'package_size' || base === 'package_content_details' || base === 'strength') translated = translateUnits(current);
    else translated = translateWith(CATEGORY_EN, current);
    if (translated && translated !== current) out[base] = translated;
  }
  return out as T;
}
