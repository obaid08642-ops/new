import { SPECIALTY_SLUGS, orderSpecialties, type SpecialtyInput, type SpecialtyTileModel } from '../../../packages/ui/icons/specialty-look';

/** One row of GET /care/specialties as the app reads it. */
export interface SpecialtyRow {
  slug?: string;
  name_ar?: string;
  name_en?: string;
  specialty?: string;
  count?: number;
}

const KNOWN = new Set<string>(SPECIALTY_SLUGS);

/** The message key of a known specialty's name (six languages); null for a slug this build does not list. */
export const specialtyNameKey = (slug: string | undefined): string | null => (slug && KNOWN.has(slug) ? `consult.specName.${slug}` : null);

/** The tile models of the endpoint's rows: with doctors first (most doctors first), then the others in the registry's order. */
export function specialtyTileModels(rows: readonly SpecialtyRow[], nameOf: (slug: string, nameAr?: string, nameEn?: string) => string): SpecialtyTileModel[] {
  const input: SpecialtyInput[] = rows.map((row) => ({ slug: row.slug, nameAr: row.name_ar ?? row.specialty, nameEn: row.name_en ?? row.specialty, count: row.count }));
  return orderSpecialties(input, (row) => nameOf(row.slug ?? '', row.nameAr, row.nameEn));
}

/** The Arabic and English names by slug, for the search of the specialty grid. */
export const specialtyNamesBySlug = (rows: readonly SpecialtyRow[]): Record<string, { nameAr?: string; nameEn?: string }> =>
  Object.fromEntries(rows.flatMap((row) => (row.slug ? [[row.slug, { nameAr: row.name_ar ?? row.specialty, nameEn: row.name_en ?? row.specialty }]] : [])));

const sameName = (a?: string, b?: string): boolean => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Whether a doctor's stored specialty is this specialty. Profiles store the canonical slug and older imported ones the Arabic or English
 * name; GET /care/specialties counts a doctor under the specialty by the same three, so the filter matches the count the tile shows.
 */
export function doctorHasSpecialty(stored: string | undefined, row: SpecialtyRow | undefined): boolean {
  if (!row || !stored) return false;
  return sameName(stored, row.slug) || sameName(stored, row.name_ar ?? row.specialty) || sameName(stored, row.name_en);
}
