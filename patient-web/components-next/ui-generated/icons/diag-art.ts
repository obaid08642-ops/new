/**
 * Labs and radiology category illustrations: ONE flat SVG per CATEGORY of test or scan, as plain data (not one per item: the
 * catalogue has hundreds). Same format as the pharmacy set (`category-art.ts`): framework-neutral, colours are ROLES that resolve
 * to tokens (bg / fg / ink / coral / surface), the tone of each art is one of SERVICE_TONES. The vitamins art IS the pharmacy
 * vitamins art. Drawing grid: 64 x 64.
 *
 * Also holds the pure mapping from a catalogue row (its category / sample type / modality / names) to one of these arts, so the web
 * and the app group tests and scans the same way. An item's own picture is used only when the backend sends one.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/diag-art.ts by tools/design/sync-ui-components.mjs.
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

export { CATEGORY_ART_VIEWBOX as DIAG_ART_VIEWBOX };
export type { CategoryArtRole as DiagArtRole } from './category-art';

/** Lab test groups, then scan groups. The order is the order of the filter chips. */
export const LAB_ART_KEYS = ['blood', 'hormones', 'vitamins', 'sugar', 'urine', 'liver'] as const;
export const RAD_ART_KEYS = ['xray', 'ct', 'mri', 'ultrasound', 'mammography', 'ecg'] as const;
export const DIAG_ART_KEYS = [...LAB_ART_KEYS, ...RAD_ART_KEYS] as const;
export type DiagArtKey = (typeof DIAG_ART_KEYS)[number];
export type DiagKind = 'lab' | 'radiology';

/** Used when nothing in a row says what it is: a lab test is most often a blood test, a scan an X-ray. */
export const DIAG_ART_FALLBACK: Record<DiagKind, DiagArtKey> = { lab: 'blood', radiology: 'xray' };

export const DIAG_ART_TONE = {
  blood: 'coral',
  hormones: 'violet',
  vitamins: 'lime',
  sugar: 'amber',
  urine: 'mint',
  liver: 'peach',
  xray: 'violet',
  ct: 'blue',
  mri: 'teal',
  ultrasound: 'mint',
  mammography: 'pink',
  ecg: 'coral',
} as const satisfies Record<DiagArtKey, string>;

const rr = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
const circle = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;

export const DIAG_ART: Record<DiagArtKey, readonly CategoryArtShape[]> = {
  // a blood drop over a sample tube
  blood: [
    { d: 'M32 6C32 6 46 22 46 34A14 14 0 0 1 18 34C18 22 32 6 32 6Z', fill: 'coral' },
    { d: 'M25 36a7 7 0 0 0 6 7', stroke: 'surface', sw: 2 },
    { d: rr(40, 38, 12, 20, 5), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M40 46h12v7a5 5 0 0 1 -5 5h-2a5 5 0 0 1 -5 -5z', fill: 'fg' },
  ],
  // a molecule: three linked atoms
  hormones: [
    { d: 'M20 44L32 20L46 42', stroke: 'ink', sw: 2.5 },
    { d: circle(32, 18, 9), fill: 'fg' },
    { d: circle(18, 46, 8), fill: 'coral' },
    { d: circle(47, 44, 7), fill: 'surface', stroke: 'ink', sw: 2 },
  ],
  // the pharmacy vitamins art: a supplement bottle
  vitamins: CATEGORY_ART.vitamins,
  // a glucose meter (screen, button, test strip) with a blood drop beside it
  sugar: [
    { d: rr(8, 18, 32, 42, 7), fill: 'fg' },
    { d: rr(13, 24, 22, 14, 3), fill: 'surface' },
    { d: circle(24, 49, 5), fill: 'surface' },
    { d: rr(20, 6, 8, 14, 2), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M47 20C47 20 58 32 58 40A11 11 0 0 1 36 40C36 32 47 20 47 20Z', fill: 'coral', stroke: 'surface', sw: 2.5 },
  ],
  // a specimen cup
  urine: [
    { d: rr(15, 8, 34, 8, 3), fill: 'fg' },
    { d: 'M18 16h28l-3 40H21z', fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M19.5 34h25l-1.5 22H21z', fill: 'fg' },
    { d: 'M26 26h8', stroke: 'ink', sw: 2 },
  ],
  // a liver (wedge) with a smaller kidney (bean) overlapping it
  liver: [
    { d: 'M4 22C4 14 14 10 26 12L52 17C60 19 61 27 56 33C48 46 36 52 24 48C10 44 4 34 4 22Z', fill: 'fg' },
    { d: 'M30 13C30 22 31 30 38 38', stroke: 'surface', sw: 2.5 },
    { d: 'M8 28C12 36 18 41 24 43', stroke: 'surface', sw: 2.5 },
    { d: 'M46 31C38 31 34 39 38 47C42 55 55 56 58 48C59 43 53 43 53 40C53 36 51 31 46 31Z', fill: 'coral', stroke: 'surface', sw: 2.5 },
  ],
  // a chest film: a frame with a spine and three pairs of ribs
  xray: [
    { d: rr(8, 6, 48, 52, 6), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M32 13V51', stroke: 'fg', sw: 5 },
    { d: 'M32 21C24 19 18 23 16 29M32 31C23 29 16 33 14 40M32 41C25 40 20 43 19 48', stroke: 'fg', sw: 3.5 },
    { d: 'M32 21C40 19 46 23 48 29M32 31C41 29 48 33 50 40M32 41C39 40 44 43 45 48', stroke: 'fg', sw: 3.5 },
    { d: rr(44, 10, 7, 4, 1.5), fill: 'coral' },
  ],
  // a ring scanner seen from the front, on a bed
  ct: [
    { d: circle(32, 28, 21), fill: 'fg' },
    { d: circle(32, 28, 12), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(10, 52, 44, 6, 3), fill: 'coral' },
    { d: 'M44 10l5 -4', stroke: 'ink', sw: 2 },
  ],
  // a tunnel scanner from the side, with the bed sliding in
  mri: [
    { d: rr(14, 10, 36, 34, 14), fill: 'fg' },
    { d: rr(24, 20, 16, 14, 7), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(4, 47, 56, 7, 3), fill: 'coral' },
    { d: 'M20 54v4M44 54v4', stroke: 'ink', sw: 2 },
  ],
  // a probe sending waves
  ultrasound: [
    { d: rr(25, 30, 14, 26, 6), fill: 'fg' },
    { d: rr(22, 22, 20, 10, 4), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M16 16a22 22 0 0 1 32 0', stroke: 'coral', sw: 3 },
    { d: 'M23 10a12 12 0 0 1 18 0', stroke: 'coral', sw: 3 },
  ],
  // a breast in profile pressed between a paddle above and a platform below
  mammography: [
    { d: rr(6, 6, 52, 8, 3), fill: 'fg' },
    { d: rr(6, 50, 52, 8, 3), fill: 'fg' },
    { d: 'M8 14H34C46 14 52 22 52 32C52 42 46 50 34 50H8Z', fill: 'surface', stroke: 'ink', sw: 2.5 },
    { d: circle(55, 32, 3), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: circle(30, 32, 5), fill: 'coral' },
  ],
  // a heart and its pulse line
  ecg: [
    { d: 'M32 54C32 54 8 40 8 24A12 12 0 0 1 32 18A12 12 0 0 1 56 24C56 40 32 54 32 54Z', fill: 'coral' },
    { d: 'M6 34h14l5 -10l8 20l5 -10h20', stroke: 'surface', sw: 3 },
  ],
};

// ---------------------------------------------------------------------------------------------------------------------
// The mapping: a catalogue row to its category art.

type Rule = readonly [DiagArtKey, RegExp];

// Latin stems are lower case; short ones carry word boundaries. Arabic, Urdu, Hindi, Bengali and Filipino names are the ones the catalogue uses.
const LAB_RULES: readonly Rule[] = [
  ['sugar', /glucose|sugar|diabet|hba1c|insulin resist|سكر|جلوكوز|گلوکوز|शर्करा|ग्लूकोज|ডায়াবেটিস|asukal/],
  ['hormones', /hormon|thyroid|\btsh\b|\bft[34]\b|cortisol|testosterone|estradiol|prolactin|\bfsh\b|\blh\b|هرمون|درقي|الغدة|تستوستيرون|ہارمون|हार्मोन|হরমোন/],
  ['vitamins', /vitamin|ferritin|\bb12\b|calcium|\bzinc\b|\biron\b|فيتامين|فيريتين|كالسيوم|حديد|وٹامن|विटामिन|ভিটামিন|bitamina/],
  ['liver', /liver|kidney|renal|hepat|creatinine|\burea\b|bilirubin|\balt\b|\bast\b|كبد|كلى|كلية|كرياتينين|يوريا|جگر|گردے|यकृत|गुर्दा|লিভার|কিডনি|atay|bato/],
  ['urine', /urin|stool|faec|fecal|feces|بول|براز|إدرار|ادرار|پیشاب|پاخانہ|मूत्र|मल|প্রস্রাব|পায়খানা|ihi|dumi/],
  ['blood', /blood|\bcbc\b|hemoglobin|haemoglobin|coagulation|\bpt\b|\binr\b|platelet|الدم|هيموجلوبين|صورة الدم|خون|रक्त|রক্ত|dugo/],
];

const RAD_RULES: readonly Rule[] = [
  ['mri', /\bmri\b|magnetic|رنين|مغناطيس|ایم آر آئی|एमआरआई|এমআরআই/],
  ['ct', /\bct\b|\bcat scan|computed|tomograph|مقطعية|سي تي|سی ٹی|सीटी|সিটি/],
  ['ultrasound', /ultrasound|ultrasonograph|sonogra|doppler|\busg\b|سونار|موجات فوق|دوبلر|الترا ساؤنڈ|अल्ट्रासाउंड|আল্ট্রাসাউন্ড/],
  ['mammography', /mammo|breast|ماموجرام|ثدي|پستان|स्तन|মেমো|স্তন|suso/],
  ['ecg', /\becg\b|\bekg\b|echo|cardi|heart|تخطيط|قلب|إيكو|ايكو|دل|हृदय|हार्ट|হার্ট|puso/],
  ['xray', /x-?ray|radiograph|dexa|densitom|fluorosc|أشعة سينية|اشعة سينية|إكس|ایکس رے|एक्स-रे|এক্স-রে/],
];

export type DiagArtInput = {
  kind: DiagKind;
  /** The lab test's category (free text from the backend). */
  category?: string;
  /** The lab test's sample type (blood, urine, stool ...). */
  sampleType?: string;
  /** The scan's modality and modality category (mri, ct, ultrasound ...). */
  modality?: string;
  bodyPart?: string;
  /** Every name the row has (any language). */
  names?: ReadonlyArray<string | undefined>;
};

const firstMatch = (rules: readonly Rule[], text: string): DiagArtKey | null => {
  for (const [key, re] of rules) if (re.test(text)) return key;
  return null;
};

/**
 * The category art of one test or scan. Labs: the test's own words (names, category) decide first, the sample type last (every row of a
 * lab has a sample type, so it only says "blood" or "urine" when nothing sharper is there). Scans: the modality decides, then the names.
 * Nothing matches: the kind's fallback (blood for labs, X-ray for scans). Always one of the keys of that kind.
 */
export function diagArtKey(input: DiagArtInput): DiagArtKey {
  const lower = (...parts: Array<string | undefined>) => parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).join(' | ').toLowerCase();
  if (input.kind === 'radiology') {
    return firstMatch(RAD_RULES, lower(input.modality)) ?? firstMatch(RAD_RULES, lower(input.bodyPart, ...(input.names ?? []))) ?? DIAG_ART_FALLBACK.radiology;
  }
  return firstMatch(LAB_RULES, lower(input.category, ...(input.names ?? []))) ?? firstMatch(LAB_RULES, lower(input.sampleType)) ?? DIAG_ART_FALLBACK.lab;
}

/**
 * True when a text is just a machine value of the catalogue ("xray", "ct", "mammography", "blood_test"): one lower-case token with no
 * spaces, or the same as one of the row's own raw fields (category, modality, sample type, body part) in any case.
 */
export function isMachineValue(text: string | undefined, rawFields: ReadonlyArray<string | undefined> = []): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  return /^[a-z0-9_-]+$/.test(t) || rawFields.some((f) => typeof f === 'string' && f.trim().toLowerCase() === t.toLowerCase());
}

/** The subtitle of an item card: the real description when there is one, else the TRANSLATED category name; a raw machine value is never shown. */
export function itemSubtitle(description: string | undefined, rawFields: ReadonlyArray<string | undefined>, categoryLabel: string): string {
  const d = (description ?? '').trim();
  return d && !isMachineValue(d, rawFields) ? d : categoryLabel;
}

/** The chips of a kind: the art keys that kind's catalogue is grouped by. */
export const diagArtKeysOf = (kind: DiagKind): readonly DiagArtKey[] => (kind === 'radiology' ? RAD_ART_KEYS : LAB_ART_KEYS);

/** Keeps the rows of one group; `null` / `'all'` keeps every row. Pure, order kept. */
export function filterByArt<T extends { art: DiagArtKey }>(rows: readonly T[], art: DiagArtKey | 'all' | null | undefined): T[] {
  return !art || art === 'all' ? [...rows] : rows.filter((row) => row.art === art);
}

/** A chip value from the page URL or state: one of the kind's keys, else 'all'. */
export function parseDiagArt(raw: string | null | undefined, kind: DiagKind): DiagArtKey | 'all' {
  return (diagArtKeysOf(kind) as readonly string[]).includes(raw ?? '') ? (raw as DiagArtKey) : 'all';
}

/** The "Most requested" strip: the first `count` rows by popularity (highest first; rows without one count as 0; ties keep the catalogue order). */
export function mostRequested<T extends { popularity?: number }>(rows: readonly T[], count = 6): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (b.row.popularity ?? 0) - (a.row.popularity ?? 0) || a.index - b.index)
    .slice(0, count)
    .map((entry) => entry.row);
}
