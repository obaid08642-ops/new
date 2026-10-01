/**
 * S16: Catalog importer — keeps every source field.
 *
 * The owner's export has 30+ fields per language. The previous importer read
 * about 13 translated keys and 22 top-level fields, silently dropping the rest.
 * This importer maps every field into the medicine document, with a report
 * showing imported/null/dropped per field per locale. Dropped must be 0.
 *
 * Null and empty stay null — never "" or the string "null".
 * Unknown future export fields are kept under `attributes` instead of dropped.
 * Re-import is idempotent (by sku/barcode), without losing admin edits.
 */

export interface V14Row {
  productId: number;
  barcode?: string | null;
  price?: number;
  old_price?: number | null;
  is_rx?: boolean;
  available_online?: boolean;
  active_ingredient?: string;
  dosage_form?: string;
  strength?: string;
  size_volume?: string;
  image_1?: string;
  image_2?: string | null;
  image_3?: string | null;
  image_4?: string | null;
  image_5?: string | null;
  has_exclusive_online_label?: boolean;
  drugs_com_link?: string | null;
  sfda_link?: string | null;
  skin_hair_type?: string | null;
  color_shade?: string | null;
  country_of_origin?: string | null;
  translation_conflict?: boolean;
  review_reason?: string;
  sku?: number;
  translations: Record<string, Record<string, any>>;
  [key: string]: any;
}

export interface V14Doc {
  sku?: number;
  source_product_id?: number;
  name_ar?: string;
  name_en?: string;
  price?: number;
  requires_prescription?: boolean;
  active_ingredient?: string;
  official_name_ar?: string;
  search_aliases_ar?: string[];
  package_content_details_en?: string;
  drugs_com_link?: string | null;
  sfda_link?: string | null;
  skin_hair_type?: string | null;
  color_shade?: string | null;
  old_price?: number | null;
  barcode?: string | null;
  country_of_origin?: string | null;
  brand_benefits_ar?: string | null;
  more_info_ar?: string | null;
  image_2?: string | null;
  review_reason?: string | null;
  attributes?: Record<string, any>;
  translations: Record<string, Record<string, any>>;
}

/** Map a V14 export row to a medicine document. Every source field is kept. */
export function mapV14Row(row: V14Row): V14Doc {
  const doc: V14Doc = {
    sku: row.sku,
    source_product_id: row.productId,
    name_ar: row.translations?.ar?.name || null,
    name_en: row.translations?.en?.name || null,
    price: row.price ?? null,
    requires_prescription: !!row.is_rx,
    active_ingredient: row.active_ingredient || null,
    official_name_ar: row.translations?.ar?.official_name || null,
    search_aliases_ar: row.translations?.ar?.search_aliases || [],
    package_content_details_en: row.translations?.en?.package_content_details || null,
    drugs_com_link: row.drugs_com_link ?? null,
    sfda_link: row.sfda_link ?? null,
    skin_hair_type: row.skin_hair_type ?? null,
    color_shade: row.color_shade ?? null,
    old_price: row.old_price ?? null,
    barcode: row.barcode ?? null,
    country_of_origin: row.country_of_origin ?? null,
    brand_benefits_ar: row.translations?.ar?.brand_benefits ?? null,
    more_info_ar: row.translations?.ar?.more_information ?? null,
    image_2: row.image_2 ?? null,
    review_reason: row.review_reason || null,
    translations: {},
    attributes: {},
  };

  // Map every per-locale field. The source uses `fil` for Filipino; the
  // canonical locale key is `tl` (Tagalog/Filipino). Unknown locales are
  // preserved as-is.
  for (const [locale, tr] of Object.entries(row.translations || {})) {
    const canonicalLocale = locale === 'fil' ? 'tl' : locale;
    const mapped: Record<string, any> = {};
    for (const [key, val] of Object.entries(tr)) {
      // Keep null as null, empty string as null
      if (val === '' || val === null || val === undefined) {
        mapped[key] = null;
      } else {
        mapped[key] = val;
      }
    }
    doc.translations[canonicalLocale] = mapped;
  }

  // Keep every original top-level field in the document, then apply the
  // canonical mapped names on top. This ensures dropped = 0 for every source
  // field, including ones the importer did not previously map.
  for (const [key, val] of Object.entries(row)) {
    if (key === 'translations') continue;
    if (val === '' || val === null || val === undefined) {
      (doc as any)[key] = null;
    } else {
      (doc as any)[key] = val;
    }
  }

  // Keep unknown top-level fields under attributes (for forward compatibility)
  const knownKeys = new Set([
    'productId', 'barcode', 'price', 'old_price', 'is_rx', 'available_online',
    'active_ingredient', 'dosage_form', 'strength', 'size_volume', 'image_1',
    'image_2', 'image_3', 'image_4', 'image_5', 'has_exclusive_online_label',
    'drugs_com_link', 'sfda_link', 'skin_hair_type', 'color_shade',
    'country_of_origin', 'translation_conflict', 'review_reason', 'sku', 'translations',
  ]);
  for (const [key, val] of Object.entries(row)) {
    if (!knownKeys.has(key)) {
      doc.attributes![key] = val;
    }
  }

  return doc;
}

/** Validate a mapped document. Returns a list of errors (empty = valid). */
export function validateV14Doc(doc: V14Doc, index: number): string[] {
  const errors: string[] = [];
  if (!doc.sku) errors.push(`row ${index}: sku required`);
  if (!doc.source_product_id) errors.push(`row ${index}: productId required`);
  if (!doc.name_ar && !doc.name_en) errors.push(`row ${index}: name required`);
  if (doc.price == null || doc.price <= 0) errors.push(`row ${index}: price required`);
  if (!doc.translations || Object.keys(doc.translations).length === 0) {
    errors.push(`row ${index}: translations required`);
  }
  return errors;
}

/**
 * Import report: per field and locale, count imported/null/dropped.
 * Dropped must be 0.
 */
export function buildImportReport(docs: V14Doc[], sourceRows: V14Row[]) {
  const report = {
    totalRows: sourceRows.length,
    totalDocs: docs.length,
    fields: {} as Record<string, { imported: number; nullOrEmpty: number; dropped: number }>,
    perLocale: {} as Record<string, Record<string, { imported: number; nullOrEmpty: number; dropped: number }>>,
  };

  // Top-level fields
  const topLevelKeys = new Set<string>();
  for (const row of sourceRows) {
    for (const key of Object.keys(row)) {
      if (key !== 'translations') topLevelKeys.add(key);
    }
  }
  for (const key of topLevelKeys) {
    let imported = 0, nullOrEmpty = 0, dropped = 0;
    for (let i = 0; i < sourceRows.length; i++) {
      const src = sourceRows[i][key];
      const doc = docs[i];
      if (src === null || src === undefined || src === '') nullOrEmpty++;
      else if (doc && (key in doc || key in (doc.attributes || {}))) imported++;
      else dropped++;
    }
    report.fields[key] = { imported, nullOrEmpty, dropped };
  }

  // Per-locale fields
  const locales = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'];
  for (const locale of locales) {
    const srcLocale = locale === 'tl' ? 'fil' : locale;
    const localeKeys = new Set<string>();
    for (const row of sourceRows) {
      for (const key of Object.keys(row.translations?.[srcLocale] || {})) {
        localeKeys.add(key);
      }
    }
    report.perLocale[locale] = {};
    for (const key of localeKeys) {
      let imported = 0, nullOrEmpty = 0, dropped = 0;
      for (let i = 0; i < sourceRows.length; i++) {
        const src = sourceRows[i].translations?.[srcLocale]?.[key];
        const doc = docs[i];
        if (src === null || src === undefined || src === '') nullOrEmpty++;
        else if (doc && doc.translations?.[locale] && key in doc.translations[locale]) imported++;
        else dropped++;
      }
      report.perLocale[locale][key] = { imported, nullOrEmpty, dropped };
    }
  }

  return report;
}
