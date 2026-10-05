/**
 * R19 (admin medicines catalog): merge the four editable locale names
 * (ur / hi / bn / fil) into the item's EXISTING translations map, so an edit
 * PATCHes one product id and never forks a sibling record per locale.
 *
 * Pure and null-safe: `existing` may be missing, null or malformed, and each
 * per-locale entry may be null. Other keys of a locale (slug, search_aliases,
 * descriptions...) are kept as they are.
 */
export type TranslationsMap = Record<string, Record<string, unknown>>;

export interface LocaleNameFields {
  name_ur?: string;
  name_hi?: string;
  name_bn?: string;
  name_fil?: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function mergeLocaleName(prev: unknown, raw: unknown): Record<string, unknown> {
  const base = isRecord(prev) ? prev : {};
  const name = typeof raw === 'string' ? raw.trim() : '';
  return name ? { ...base, name } : base;
}

export function mergeLocaleNames(existing: unknown, names: LocaleNameFields): TranslationsMap {
  const current: Record<string, unknown> = isRecord(existing) ? existing : {};
  const merged: TranslationsMap = {};
  for (const [locale, map] of Object.entries(current)) {
    if (isRecord(map)) merged[locale] = { ...map };
  }
  // Legacy `tl` alias: seed `fil` from it so fil and tl never diverge.
  const legacyTl = current.tl;
  if (isRecord(legacyTl) && !merged.fil) merged.fil = { ...legacyTl };

  merged.ur = mergeLocaleName(current.ur, names.name_ur);
  merged.hi = mergeLocaleName(current.hi, names.name_hi);
  merged.bn = mergeLocaleName(current.bn, names.name_bn);
  merged.fil = mergeLocaleName(merged.fil ?? current.tl, names.name_fil);

  // Never send an empty locale object: the backend merges per locale, so an
  // omitted locale keeps what is stored, while `{}` carries nothing useful.
  for (const loc of ['ur', 'hi', 'bn', 'fil'] as const) {
    if (Object.keys(merged[loc]).length === 0) delete merged[loc];
  }

  // A new Filipino name travels under `fil` only (the backend stores it under tl).
  if (merged.tl !== undefined && typeof names.name_fil === 'string' && names.name_fil.trim()) delete merged.tl;
  return merged;
}
