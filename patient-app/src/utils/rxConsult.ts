/**
 * "Consult a doctor" from a cart that holds prescription medicines (owner decision 10, backend D-10).
 *
 * GET /medicines/:id/consult-specialty answers `{ medicine_id, requires_prescription, specialty: { slug, name_ar, name_en } | null,
 * source }`: the specialty comes from the admin's category mapping (never a client-side guess), and is null when the admin has
 * not mapped one. The cart asks once per prescription line when the patient taps the row; the specialty is opened by its slug
 * only (no medicine or health data in the route).
 */

/** The specialty slug of one answer, or null when the answer has none (no mapping, a malformed body). */
export function specialtySlugOf(answer: unknown): string | null {
  const root = answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : null;
  const body = root?.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  const specialty = body?.specialty && typeof body.specialty === 'object' ? (body.specialty as Record<string, unknown>) : null;
  const slug = specialty?.slug;
  return typeof slug === 'string' && /^[a-z0-9_]{1,60}$/.test(slug) ? slug : null;
}

/**
 * One specialty for the whole cart: the slug every line that has one agrees on. Lines with no mapping do not vote; when two
 * lines map to different specialties (or none maps) there is no single suggestion and the patient picks from the full list.
 */
export function cartSpecialty(slugs: Array<string | null>): string | null {
  const distinct = [...new Set(slugs.filter((s): s is string => s !== null))];
  return distinct.length === 1 ? distinct[0] : null;
}

/** The medicines asked about: the prescription lines of the cart, once each, at most five (the cart is small, the answer is the same). */
export function rxLineIds(lines: ReadonlyArray<{ id: string; rx: boolean }>, max = 5): string[] {
  return [...new Set(lines.filter((l) => l.rx).map((l) => l.id))].slice(0, max);
}

export const SPECIALTY_LIST_ROUTE = '/consultations/specialty-select';

/** Where "consult a doctor" goes: the doctors of the suggested specialty, or the specialty list when there is none. */
export function consultTarget(slug: string | null): { pathname: string; params?: { specialty: string } } {
  return slug ? { pathname: '/consultations/doctor-search', params: { specialty: slug } } : { pathname: SPECIALTY_LIST_ROUTE };
}
