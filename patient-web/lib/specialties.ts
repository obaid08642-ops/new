/**
 * The specialty slugs the backend stores on provider profiles (backend SPECIALTY_MASTER, GET /care/specialties).
 * The patient sees the name from messages (`SpecialtyNames.<slug>`), never the slug: an unknown slug has no label and
 * the line is hidden. tests/specialties.test.ts keeps this list and the six message files identical.
 */
export const SPECIALTY_SLUGS = [
  "general_practice", "family_medicine", "internal_medicine", "pediatrics", "pediatric_surgery", "cardiology",
  "cardiac_surgery", "dermatology", "dentistry", "ent", "audiology", "speech_therapy", "ophthalmology", "neurology",
  "orthopedics", "spine_surgery", "urology", "andrology", "nephrology", "gastroenterology", "hepatology", "endoscopy",
  "pulmonology", "allergy_immunology", "hematology", "oncology", "oncology_surgery", "endocrinology", "rheumatology",
  "gynecology", "ivf", "psychiatry", "psychology", "general_surgery", "vascular_surgery", "plastic_surgery",
  "bariatric_surgery", "physiotherapy", "nutrition", "geriatrics", "laboratory", "radiology",
] as const;

export type SpecialtySlug = (typeof SPECIALTY_SLUGS)[number];

const KNOWN = new Set<string>(SPECIALTY_SLUGS);

export function isSpecialtySlug(value: string | null | undefined): value is SpecialtySlug {
  return typeof value === "string" && KNOWN.has(value.trim());
}

/** The translated name of a specialty slug, or null when the slug is unknown (the caller then shows nothing). */
export function specialtyLabel(t: (key: SpecialtySlug) => string, slug: string | null | undefined): string | null {
  return isSpecialtySlug(slug) ? t(slug.trim() as SpecialtySlug) : null;
}
