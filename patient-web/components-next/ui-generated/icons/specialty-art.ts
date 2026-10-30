/**
 * Specialty illustrations: ONE flat duotone picture per medical specialty, as plain data, plus the pure rules the consultations hub
 * uses to order, search and mark its specialty tiles. Same format as the pharmacy set (`category-art.ts`) and the tab-bar set
 * (`nav-art.ts`): framework-neutral, drawing grid 64 x 64, colours are ROLES (bg / fg / ink / coral / surface) that resolve to tokens,
 * the tone of each art is one of SERVICE_TONES. The web draws it with classes, the app with react-native-svg, from these shapes.
 *
 * Made in BATCHES, most used first. `SPECIALTY_ART_BY_SLUG` is the registry: every backend specialty slug maps to an art key or to the
 * explicit marker `'fallback'` (no illustration yet: the client draws the fill icon the specialty always had, never a blank tile).
 * Batch 2 adds keys to `SPECIALTY_ART` and flips the matching slugs from `'fallback'`; nothing else changes.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/specialty-art.ts by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// `next build`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// `--check` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.
import { CATEGORY_ART, CATEGORY_ART_VIEWBOX, type CategoryArtShape } from './category-art';
import { DIAG_ART } from './diag-art';
import { NAV_ART } from './nav-art';

export { CATEGORY_ART_VIEWBOX as SPECIALTY_ART_VIEWBOX };
export type { CategoryArtRole as SpecialtyArtRole } from './category-art';

const rr = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
const circle = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;

/** The batch-1 illustrations (the most used specialties), then the two tiles that are not specialties. */
export const SPECIALTY_ART_KEYS = [
  'cardiology', 'dermatology', 'pediatrics', 'women', 'orthopedics', 'internal', 'doctor', 'ent', 'eye', 'tooth', 'mind', 'brain',
  'kidney', 'nutrition', 'lungs', 'lab', 'xray',
  // the "All" tile and the "All specialties" tile
  'all', 'more',
] as const;
export type SpecialtyArtKey = (typeof SPECIALTY_ART_KEYS)[number];

export const SPECIALTY_ART_TONE = {
  cardiology: 'coral',
  dermatology: 'peach',
  pediatrics: 'amber',
  women: 'pink',
  orthopedics: 'violet',
  internal: 'teal',
  doctor: 'blue',
  ent: 'lime',
  eye: 'blue',
  tooth: 'teal',
  mind: 'violet',
  brain: 'pink',
  kidney: 'peach',
  nutrition: 'lime',
  lungs: 'mint',
  lab: 'coral',
  xray: 'violet',
  all: 'blue',
  more: 'ink',
} as const satisfies Record<SpecialtyArtKey, string>;

export const SPECIALTY_ART: Record<SpecialtyArtKey, readonly CategoryArtShape[]> = {
  // a heart with a pulse line
  cardiology: [
    { d: 'M32 54C32 54 8 40 8 24A12 12 0 0 1 32 19A12 12 0 0 1 56 24C56 40 32 54 32 54Z', fill: 'coral', stroke: 'ink', sw: 2 },
    { d: 'M15 22a7 7 0 0 1 6-6', stroke: 'surface', sw: 2 },
    { d: 'M12 34h12l4-9 6 17 4-8h14', stroke: 'ink', sw: 2.5 },
  ],
  // a cream jar with a drop
  dermatology: [
    { d: rr(12, 28, 40, 26, 7), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(14, 16, 36, 14, 5), fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M32 35C32 35 38 41 38 45A6 6 0 0 1 26 45C26 41 32 35 32 35Z', fill: 'coral' },
    { d: 'M48 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z', fill: 'coral' },
  ],
  // a child's face with a curl and rosy cheeks
  pediatrics: [
    { d: circle(32, 35, 21), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M32 14c-5 0-7 5-3 7 2 1 4 0 4-2', stroke: 'ink', sw: 2.5 },
    { d: circle(24, 34, 2), fill: 'ink' },
    { d: circle(40, 34, 2), fill: 'ink' },
    { d: circle(20, 41, 3.5), fill: 'coral' },
    { d: circle(44, 41, 3.5), fill: 'coral' },
    { d: 'M27 43q5 5 10 0', stroke: 'ink', sw: 2.5 },
  ],
  // the female sign with a small heart
  women: [
    { d: circle(32, 24, 15), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M32 39v18M23 48h18', stroke: 'ink', sw: 3 },
    { d: 'M32 31C32 31 24 26 24 21A4.5 4.5 0 0 1 32 19A4.5 4.5 0 0 1 40 21C40 26 32 31 32 31Z', fill: 'coral' },
  ],
  // a bone
  orthopedics: [
    { d: circle(15, 24, 7), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: circle(15, 40, 7), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: circle(49, 24, 7), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: circle(49, 40, 7), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(15, 25, 34, 14, 2), fill: 'surface' },
    { d: 'M18 25h28M18 39h28', stroke: 'ink', sw: 2 },
    { d: circle(32, 32, 3), fill: 'coral' },
  ],
  // a clipboard with a cross
  internal: [
    { d: rr(14, 10, 36, 46, 6), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(23, 5, 18, 10, 4), fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M32 26v14M25 33h14', stroke: 'coral', sw: 4 },
    { d: 'M22 47h20', stroke: 'ink', sw: 2 },
  ],
  // a doctor: head, coat and a cross badge
  doctor: [
    { d: circle(32, 18, 10), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M10 56a22 22 0 0 1 44 0Z', fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M32 38l-7 18h14Z', fill: 'surface' },
    { d: 'M42 42v6M39 45h6', stroke: 'coral', sw: 2.5 },
  ],
  // an ear
  ent: [
    { d: 'M32 8C21 8 15 16 15 26v8c0 6 4 8 7 12 3 5 6 10 12 10 7 0 11-5 11-12 0-8 8-10 8-19C53 15 44 8 32 8Z', fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M25 26c0-5 4-8 8-8s8 3 8 8c0 7-7 8-7 14', stroke: 'ink', sw: 2.5 },
    { d: circle(34, 46, 2.5), fill: 'coral' },
  ],
  // an eye
  eye: [
    { d: 'M5 32C13 20 23 15 32 15s19 5 27 17C51 44 41 49 32 49S13 44 5 32Z', fill: 'surface', stroke: 'ink', sw: 2 },
    { d: circle(32, 32, 11), fill: 'fg', stroke: 'ink', sw: 2 },
    { d: circle(32, 32, 5), fill: 'ink' },
    { d: circle(36, 28, 2.5), fill: 'surface' },
  ],
  // a tooth with a sparkle
  tooth: [
    { d: 'M19 10c-8 0-12 8-10 17 2 8 6 11 7 20 1 6 5 8 7 2 2-6 3-9 9-9s7 3 9 9c2 6 6 4 7-2 1-9 5-12 7-20 2-9-2-17-10-17-5 0-8 3-13 3s-8-3-13-3Z', fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M18 20c0-3 2-5 5-5', stroke: 'fg', sw: 2.5 },
    { d: 'M50 6l1.5 4 4 1.5-4 1.5L50 17l-1.5-4-4-1.5 4-1.5Z', fill: 'coral' },
  ],
  // a speech bubble holding a heart
  mind: [
    { d: 'M18 10h28a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10H34l-10 10v-10h-6a10 10 0 0 1-10-10V20A10 10 0 0 1 18 10Z', fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M32 36C32 36 21 30 21 23A5.5 5.5 0 0 1 32 21A5.5 5.5 0 0 1 43 23C43 30 32 36 32 36Z', fill: 'coral' },
  ],
  // a brain: two lobes, a fold line and curls
  brain: [
    { d: circle(24, 30, 15), fill: 'fg', stroke: 'ink', sw: 2 },
    { d: circle(40, 30, 15), fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M32 17v26', stroke: 'ink', sw: 2 },
    { d: 'M15 26c4-3 8 0 6 4M49 26c-4-3-8 0-6 4M20 38c3 2 6 0 6-3M44 38c-3 2-6 0-6-3', stroke: 'ink', sw: 2 },
    { d: 'M29 46h6v9a3 3 0 0 1-6 0Z', fill: 'coral', stroke: 'ink', sw: 2 },
  ],
  // a kidney
  kidney: [
    { d: 'M42 9C27 5 12 14 14 31c1 9 9 11 9 17 0 6 7 10 15 7 12-5 17-19 12-33-2-6-4-12-8-13Z', fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M40 26c-6 0-9 4-7 9', stroke: 'ink', sw: 2.5 },
    { d: 'M22 20c3-4 7-6 11-6', stroke: 'surface', sw: 2.5 },
    { d: circle(46, 12, 3), fill: 'coral' },
  ],
  // an apple with a leaf
  nutrition: [
    { d: 'M32 22C24 14 9 18 9 33c0 12 8 24 16 24 4 0 5-2 7-2s3 2 7 2c8 0 16-12 16-24 0-15-15-19-23-11Z', fill: 'coral', stroke: 'ink', sw: 2 },
    { d: 'M32 22c0-7 4-11 10-13 0 7-4 11-10 13Z', fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M17 33c0-4 2-7 5-8', stroke: 'surface', sw: 2.5 },
  ],
  // lungs with the airway
  lungs: [
    { d: 'M28 24C20 22 9 33 9 47c0 6 6 8 11 5 6-3 8-8 8-15Z', fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M36 24c8-2 19 9 19 23 0 6-6 8-11 5-6-3-8-8-8-15Z', fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M32 8v18M32 26l-6 8M32 26l6 8', stroke: 'ink', sw: 2.5 },
    { d: circle(32, 8, 3), fill: 'coral' },
  ],
  // the diagnostics blood art (a lab is a specialty of the list)
  lab: DIAG_ART.blood,
  xray: DIAG_ART.xray,
  // the "All" tile: the consultations stethoscope; the "All specialties" tile: the four-tile grid of the pharmacy "All"
  all: NAV_ART.consult,
  more: CATEGORY_ART.all,
};

/** The marker of a specialty with no illustration yet: the client draws its existing fill icon. */
export const SPECIALTY_ART_FALLBACK = 'fallback' as const;
export type SpecialtyArtChoice = SpecialtyArtKey | typeof SPECIALTY_ART_FALLBACK;

/** The backend's specialty slugs (SPECIALTY_MASTER, GET /care/specialties). */
export const SPECIALTY_ART_SLUGS = [
  'general_practice', 'family_medicine', 'internal_medicine', 'pediatrics', 'pediatric_surgery', 'cardiology', 'cardiac_surgery',
  'dermatology', 'dentistry', 'ent', 'audiology', 'speech_therapy', 'ophthalmology', 'neurology', 'orthopedics', 'spine_surgery',
  'urology', 'andrology', 'nephrology', 'gastroenterology', 'hepatology', 'endoscopy', 'pulmonology', 'allergy_immunology',
  'hematology', 'oncology', 'oncology_surgery', 'endocrinology', 'rheumatology', 'gynecology', 'ivf', 'psychiatry', 'psychology',
  'general_surgery', 'vascular_surgery', 'plastic_surgery', 'bariatric_surgery', 'physiotherapy', 'nutrition', 'geriatrics',
  'laboratory', 'radiology',
] as const;
export type SpecialtyArtSlug = (typeof SPECIALTY_ART_SLUGS)[number];

/** The registry: every slug has an illustration (batch 1) or the explicit fallback (later batches). */
export const SPECIALTY_ART_BY_SLUG: Record<SpecialtyArtSlug, SpecialtyArtChoice> = {
  general_practice: 'doctor',
  family_medicine: 'fallback',
  internal_medicine: 'internal',
  pediatrics: 'pediatrics',
  pediatric_surgery: 'fallback',
  cardiology: 'cardiology',
  cardiac_surgery: 'cardiology',
  dermatology: 'dermatology',
  dentistry: 'tooth',
  ent: 'ent',
  audiology: 'ent',
  speech_therapy: 'fallback',
  ophthalmology: 'eye',
  neurology: 'brain',
  orthopedics: 'orthopedics',
  spine_surgery: 'orthopedics',
  urology: 'kidney',
  andrology: 'fallback',
  nephrology: 'kidney',
  gastroenterology: 'fallback',
  hepatology: 'fallback',
  endoscopy: 'fallback',
  pulmonology: 'lungs',
  allergy_immunology: 'fallback',
  hematology: 'lab',
  oncology: 'fallback',
  oncology_surgery: 'fallback',
  endocrinology: 'fallback',
  rheumatology: 'fallback',
  gynecology: 'women',
  ivf: 'women',
  psychiatry: 'mind',
  psychology: 'mind',
  general_surgery: 'fallback',
  vascular_surgery: 'fallback',
  plastic_surgery: 'fallback',
  bariatric_surgery: 'fallback',
  physiotherapy: 'fallback',
  nutrition: 'nutrition',
  geriatrics: 'fallback',
  laboratory: 'lab',
  radiology: 'xray',
};

const REGISTRY = SPECIALTY_ART_BY_SLUG as Readonly<Record<string, SpecialtyArtChoice>>;

/** The illustration of a slug, or null when it has none yet (an unknown slug too): the caller then draws the fallback icon. */
export function specialtyArtKey(slug: string | null | undefined): SpecialtyArtKey | null {
  const choice = Object.prototype.hasOwnProperty.call(REGISTRY, (slug ?? '').trim()) ? REGISTRY[(slug ?? '').trim()] : SPECIALTY_ART_FALLBACK;
  return choice === SPECIALTY_ART_FALLBACK ? null : choice;
}

/** One specialty as the endpoint sends it (GET /care/specialties: slug, names, live published-doctor count). */
export type SpecialtyInput = { slug?: string; nameAr?: string; nameEn?: string; count?: number };

export type SpecialtyTileModel = {
  slug: string;
  /** The name in the page's language. */
  name: string;
  count: number;
  /** The illustration, or null: the client draws the fill-icon fallback. */
  art: SpecialtyArtKey | null;
  /** No published doctor yet: shown muted with "Coming soon" and not offered as a filter. */
  comingSoon: boolean;
};

/** A specialty with no published doctor yet. */
export const isComingSoon = (row: { count?: number }): boolean => !(typeof row.count === 'number' && row.count > 0);

/**
 * The tiles in order: the specialties that have doctors first, the most doctors first (the endpoint sends no booked count, so the
 * live doctor count is the popularity; ties keep the registry order), then the ones with no doctor yet in the registry order.
 * "All" and "All specialties" are not rows: the client puts them first and last.
 */
export function orderSpecialties(rows: readonly SpecialtyInput[], nameOf: (row: SpecialtyInput) => string): SpecialtyTileModel[] {
  return rows
    .flatMap((row, index) => {
      const slug = (row.slug ?? '').trim();
      return slug ? [{ index, model: { slug, name: nameOf(row), count: row.count ?? 0, art: specialtyArtKey(slug), comingSoon: isComingSoon(row) } }] : [];
    })
    .sort((a, b) => Number(a.model.comingSoon) - Number(b.model.comingSoon) || (a.model.comingSoon ? 0 : b.model.count - a.model.count) || a.index - b.index)
    .map((entry) => entry.model);
}

/** The search of the specialty grid: the name in the page's language, the Arabic and the English name; an empty query keeps all. */
export function filterSpecialties<T extends { slug: string; name: string }>(tiles: readonly T[], query: string, names: Readonly<Record<string, { nameAr?: string; nameEn?: string }>> = {}): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...tiles];
  return tiles.filter((tile) => [tile.name, names[tile.slug]?.nameAr, names[tile.slug]?.nameEn].some((value) => typeof value === 'string' && value.toLowerCase().includes(q)));
}
