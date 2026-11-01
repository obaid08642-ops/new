/**
 * The look of a medical specialty, as plain data: the board's own style (docs/design/canvas/Consult.dc.html, the specialty chips): a
 * filled icon of the board's icon set (FIcon, `fill.ts`) in a soft tonal chip, the tone one of the service tones. The seven specialties of
 * the board keep the icon and tone it draws (internal medicine, dentistry, dermatology, ophthalmology, cardiology, pediatrics,
 * orthopedics); every other backend specialty takes an icon of the same set and a service tone, nothing new is drawn.
 * Plus the pure rules the consultations hub uses to order and search its specialty tiles. Framework-neutral: the web and the app draw it.
 */
import type { FillIconName, ServiceTone } from './fill';

export type SpecialtyLook = { icon: FillIconName; tone: ServiceTone };

/** The backend's specialty slugs (SPECIALTY_MASTER, GET /care/specialties) and the look of each. */
export const SPECIALTY_LOOK = {
  general_practice: { icon: 'stethoscope', tone: 'blue' },
  family_medicine: { icon: 'users-three', tone: 'peach' },
  internal_medicine: { icon: 'stethoscope', tone: 'blue' },
  pediatrics: { icon: 'baby', tone: 'amber' },
  pediatric_surgery: { icon: 'baby', tone: 'peach' },
  cardiology: { icon: 'heart', tone: 'coral' },
  cardiac_surgery: { icon: 'heartbeat', tone: 'coral' },
  dermatology: { icon: 'hand-heart', tone: 'pink' },
  dentistry: { icon: 'tooth', tone: 'mint' },
  ent: { icon: 'first-aid', tone: 'teal' },
  audiology: { icon: 'headset', tone: 'teal' },
  speech_therapy: { icon: 'chat-circle-text', tone: 'violet' },
  ophthalmology: { icon: 'eye', tone: 'teal' },
  neurology: { icon: 'brain', tone: 'blue' },
  orthopedics: { icon: 'bone', tone: 'violet' },
  spine_surgery: { icon: 'bone', tone: 'peach' },
  urology: { icon: 'drop', tone: 'blue' },
  andrology: { icon: 'person', tone: 'blue' },
  nephrology: { icon: 'drop', tone: 'teal' },
  gastroenterology: { icon: 'bowl-food', tone: 'amber' },
  hepatology: { icon: 'test-tube', tone: 'amber' },
  endoscopy: { icon: 'scan', tone: 'teal' },
  pulmonology: { icon: 'stethoscope', tone: 'lime' },
  allergy_immunology: { icon: 'shield-check', tone: 'mint' },
  hematology: { icon: 'drop', tone: 'coral' },
  oncology: { icon: 'flower-lotus', tone: 'pink' },
  oncology_surgery: { icon: 'first-aid-kit', tone: 'pink' },
  endocrinology: { icon: 'scales', tone: 'amber' },
  rheumatology: { icon: 'bone', tone: 'pink' },
  gynecology: { icon: 'baby-carriage', tone: 'pink' },
  ivf: { icon: 'baby-carriage', tone: 'coral' },
  psychiatry: { icon: 'brain', tone: 'violet' },
  psychology: { icon: 'flower-lotus', tone: 'violet' },
  general_surgery: { icon: 'first-aid-kit', tone: 'blue' },
  vascular_surgery: { icon: 'heartbeat', tone: 'blue' },
  plastic_surgery: { icon: 'sparkle', tone: 'pink' },
  bariatric_surgery: { icon: 'scales', tone: 'lime' },
  physiotherapy: { icon: 'person', tone: 'mint' },
  nutrition: { icon: 'bowl-food', tone: 'lime' },
  geriatrics: { icon: 'person', tone: 'amber' },
  laboratory: { icon: 'test-tube', tone: 'teal' },
  radiology: { icon: 'scan', tone: 'blue' },
} as const satisfies Record<string, SpecialtyLook>;

export type SpecialtySlug = keyof typeof SPECIALTY_LOOK;
export const SPECIALTY_SLUGS = Object.keys(SPECIALTY_LOOK) as SpecialtySlug[];

/** The "All" tile (the whole list) and the "All specialties" tile (the grid): board icons, not specialties. */
export const SPECIALTY_ALL_LOOK: SpecialtyLook = { icon: 'squares-four', tone: 'ink' };
export const SPECIALTY_MORE_LOOK: SpecialtyLook = { icon: 'magnifying-glass', tone: 'ink' };

/** The look of a slug; a specialty added to the backend before it is listed here draws the board's stethoscope in blue, never a blank tile. */
export function specialtyLook(slug: string | null | undefined): SpecialtyLook {
  const key = (slug ?? '').trim();
  return Object.prototype.hasOwnProperty.call(SPECIALTY_LOOK, key) ? SPECIALTY_LOOK[key as SpecialtySlug] : { icon: 'stethoscope', tone: 'blue' };
}

/** One specialty as the endpoint sends it (GET /care/specialties: slug, names, live published-doctor count). */
export type SpecialtyInput = { slug?: string; nameAr?: string; nameEn?: string; count?: number };

export type SpecialtyTileModel = {
  slug: string;
  /** The name in the page's language. */
  name: string;
  /** The live published-doctor count (0 = none yet: the tile still opens the doctor search, which then shows its empty state). */
  count: number;
  look: SpecialtyLook;
};

/**
 * The tiles in order: the specialties that have doctors first, the most doctors first (the endpoint sends no booked count, so the live doctor
 * count is the popularity; ties keep the registry order), then the others in the registry order. Every tile is a normal tile.
 * "All" and "All specialties" are not rows: the client puts them first and last.
 */
export function orderSpecialties(rows: readonly SpecialtyInput[], nameOf: (row: SpecialtyInput) => string): SpecialtyTileModel[] {
  return rows
    .flatMap((row, index) => {
      const slug = (row.slug ?? '').trim();
      const count = typeof row.count === 'number' && row.count > 0 ? row.count : 0;
      return slug ? [{ index, model: { slug, name: nameOf(row), count, look: specialtyLook(slug) } }] : [];
    })
    .sort((a, b) => Number(b.model.count > 0) - Number(a.model.count > 0) || (a.model.count > 0 ? b.model.count - a.model.count : 0) || a.index - b.index)
    .map((entry) => entry.model);
}

/** The search of the specialty grid: the name in the page's language, the Arabic and the English name; an empty query keeps all. */
export function filterSpecialties<T extends { slug: string; name: string }>(tiles: readonly T[], query: string, names: Readonly<Record<string, { nameAr?: string; nameEn?: string }>> = {}): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...tiles];
  return tiles.filter((tile) => [tile.name, names[tile.slug]?.nameAr, names[tile.slug]?.nameEn].some((value) => typeof value === 'string' && value.toLowerCase().includes(q)));
}
