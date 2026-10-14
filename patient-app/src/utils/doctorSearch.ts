/**
 * The doctors search view (`/search?view=doctors`) against GET /care/doctors.
 *
 * The endpoint answers `{ page, limit, total, items: [...] }`; each item is the public doctor card of
 * backend/src/modules/care/care.service.ts (`toPublicDoctor`): name_ar, name_en, specialty, title, academic_degree,
 * years_experience, consultation_modes[], price_clinic / price_online / price_home, hospital, rating, reviews_count,
 * accepts_insurance, next_available_at. The query names the controller reads are `q`, `specialty` and `sort`
 * (rating, price_asc, price_desc, experience, distance_asc, distance_desc). Nothing is invented: a field the server
 * does not send stays null (the server has no waiting-time data, so there is no waiting-time sort or value).
 */

/** The sorts the view offers, as the server names them. */
export const DOCTOR_SORTS = ['rating', 'price_asc'] as const;
export type DoctorSort = (typeof DOCTOR_SORTS)[number];

/** `?q=...&specialty=...&sort=...`, with empty values left out. */
export function doctorsQuery(opts: { q?: string; specialty?: string; sort?: string }): string {
  const qs = new URLSearchParams();
  const q = (opts.q ?? '').trim();
  if (q) qs.set('q', q);
  if (opts.specialty) qs.set('specialty', opts.specialty);
  if (opts.sort) qs.set('sort', opts.sort);
  return qs.toString();
}

export interface DoctorCardRow {
  id: string;
  name: string;
  deg: string | null;
  spec: string | null;
  rating: number | null;
  reviews: number | null;
  price: number | null;
  wait: null;
  exp: number | null;
  online: boolean;
  clinic: boolean;
  home: boolean;
  ins: boolean;
  hospital: string | null;
  slot: string | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The rows of a GET /care/doctors answer (`items`; a bare array is tolerated); anything else is no rows. */
export function doctorRows(res: unknown, pick: (ar: string | null, en: string | null) => string | null, slotLabel: (iso: string) => string | null): DoctorCardRow[] {
  const items = Array.isArray((res as { items?: unknown })?.items) ? (res as { items: unknown[] }).items : Array.isArray(res) ? res : [];
  const rows: DoctorCardRow[] = [];
  for (const raw of items) {
    const d = (raw ?? {}) as Record<string, unknown>;
    const id = text(d.id);
    const name = pick(text(d.name_ar), text(d.name_en));
    if (!id || !name) continue;
    const modes = Array.isArray(d.consultation_modes) ? (d.consultation_modes as unknown[]) : [];
    const next = text(d.next_available_at);
    rows.push({
      id,
      name,
      deg: text(d.academic_degree) ?? text(d.title),
      spec: text(d.specialty),
      rating: num(d.rating),
      reviews: num(d.reviews_count),
      price: num(d.price_clinic) ?? num(d.price_online) ?? num(d.price_home),
      wait: null,
      exp: num(d.years_experience),
      online: modes.includes('online') || modes.includes('video'),
      clinic: modes.includes('clinic'),
      home: modes.includes('home'),
      ins: d.accepts_insurance === true,
      hospital: text(d.hospital),
      slot: next ? slotLabel(next) : null,
    });
  }
  return rows;
}
