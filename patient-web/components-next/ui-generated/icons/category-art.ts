/**
 * Pharmacy category illustrations: ONE flat SVG per category, as plain data.
 *
 * Framework-neutral on purpose: this file has no imports and no JSX. It exports strings and arrays only, so the web
 * (a thin <svg> component in patient-web) and the app (react-native-svg <Path>) draw the very same shapes.
 *
 * Colours are ROLES, never colour values. A role resolves to a token through a CSS variable (`CATEGORY_ART_ROLE_VAR`),
 * so dark mode and the ten service tones follow the tokens with no per-screen override:
 *   bg      the tone's tint            (--nabd-tone-bg, set by the `nabd-tone--<tone>` class)
 *   fg      the tone's strong colour   (--nabd-tone-fg)
 *   ink     the ink of the identity    (--nabd-color-text-primary)
 *   coral   the brand coral            (--nabd-color-brand-coral)
 *   surface the card surface           (--nabd-color-bg-surface)
 * The tone of each category is one of SERVICE_TONES (icons/fill.ts); it is data here, not a colour name in a screen.
 *
 * Drawing grid: 64 x 64, strokes round-capped, stroke width in the same units.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/category-art.ts by tools/design/sync-ui-components.mjs.
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

export const CATEGORY_ART_VIEWBOX = '0 0 64 64';

export type CategoryArtRole = 'bg' | 'fg' | 'ink' | 'coral' | 'surface';

/** The CSS variable each role reads (web: var(--x); native: the same token's resolved value). */
export const CATEGORY_ART_ROLE_VAR: Record<CategoryArtRole, string> = {
  bg: '--nabd-tone-bg',
  fg: '--nabd-tone-fg',
  ink: '--nabd-color-text-primary',
  coral: '--nabd-color-brand-coral',
  surface: '--nabd-color-bg-surface',
};

export type CategoryArtShape = {
  /** SVG path data on the 64 x 64 grid. */
  d: string;
  fill?: CategoryArtRole;
  stroke?: CategoryArtRole;
  /** Stroke width, in grid units (only with `stroke`). */
  sw?: number;
};

export const CATEGORY_ART_KEYS = [
  'all',
  'medicines',
  'vitamins',
  'motherBaby',
  'skin',
  'hair',
  'makeup',
  'personal',
  'devices',
  'generic',
] as const;
export type CategoryArtKey = (typeof CATEGORY_ART_KEYS)[number];

/** Rounded rectangle as path data. */
const rr = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
/** Circle as path data. */
const circle = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;

/** Service tone of each illustration (one of SERVICE_TONES). */
export const CATEGORY_ART_TONE = {
  all: 'ink',
  medicines: 'coral',
  vitamins: 'lime',
  motherBaby: 'blue',
  skin: 'peach',
  hair: 'violet',
  makeup: 'pink',
  personal: 'teal',
  devices: 'mint',
  generic: 'amber',
} as const satisfies Record<CategoryArtKey, string>;

export const CATEGORY_ART: Record<CategoryArtKey, readonly CategoryArtShape[]> = {
  // four tiles of a grid
  all: [
    { d: rr(10, 10, 20, 20, 5), fill: 'coral' },
    { d: rr(34, 10, 20, 20, 5), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(10, 34, 20, 20, 5), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(34, 34, 20, 20, 5), fill: 'fg' },
  ],
  // a capsule on the diagonal and a round tablet
  medicines: [
    { d: 'M12.34 40.34L36.34 16.34A8 8 0 0 1 47.66 27.66L23.66 51.66A8 8 0 0 1 12.34 40.34Z', fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M24.34 28.34L36.34 16.34A8 8 0 0 1 47.66 27.66L35.66 39.66Z', fill: 'coral' },
    { d: circle(18, 17, 9), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M12 17h12', stroke: 'ink', sw: 2 },
    { d: circle(47, 47, 7), fill: 'fg' },
  ],
  // a supplement bottle
  vitamins: [
    { d: rr(20, 24, 24, 32, 5), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(22, 13, 20, 11, 3), fill: 'fg' },
    { d: rr(24, 33, 16, 14, 3), fill: 'coral' },
    { d: 'M32 36v8M28 40h8', stroke: 'surface', sw: 2 },
  ],
  // a baby bottle
  motherBaby: [
    { d: 'M26 24C26 10 38 10 38 24Z', fill: 'fg' },
    { d: rr(20, 24, 24, 6, 3), fill: 'coral' },
    { d: rr(22, 30, 20, 26, 6), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M27 38h6M27 44h6M27 50h6', stroke: 'ink', sw: 2 },
  ],
  // a cream jar under a drop
  skin: [
    { d: 'M32 4C32 4 40 13 40 17A8 8 0 0 1 24 17C24 13 32 4 32 4Z', fill: 'coral' },
    { d: rr(14, 28, 36, 9, 4), fill: 'fg' },
    { d: rr(16, 37, 32, 19, 6), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M23 46h10', stroke: 'ink', sw: 2 },
  ],
  // a comb and a sparkle
  hair: [
    { d: rr(8, 22, 48, 12, 4), fill: 'fg' },
    { d: 'M14 34v18M22 34v18M30 34v18M38 34v18M46 34v18', stroke: 'ink', sw: 3 },
    { d: circle(48, 12, 4), fill: 'coral' },
    { d: circle(14, 12, 2.5), fill: 'ink' },
  ],
  // a lipstick
  makeup: [
    { d: 'M26 30V20L38 11V30Z', fill: 'coral' },
    { d: rr(22, 30, 20, 7, 2), fill: 'fg' },
    { d: rr(22, 37, 20, 19, 3), fill: 'ink' },
    { d: 'M26 43v7', stroke: 'surface', sw: 2 },
  ],
  // a pump bottle with bubbles
  personal: [
    { d: rr(18, 26, 28, 30, 7), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: rr(28, 18, 8, 8, 2), fill: 'fg' },
    { d: 'M26 12h14a3 3 0 0 1 3 3v3H26Z', fill: 'fg' },
    { d: 'M43 14h8', stroke: 'ink', sw: 2.5 },
    { d: circle(32, 41, 6), fill: 'coral' },
    { d: circle(54, 24, 4), stroke: 'fg', sw: 2 },
    { d: circle(10, 36, 3), stroke: 'fg', sw: 2 },
  ],
  // a monitor with a pulse line
  devices: [
    { d: rr(8, 12, 48, 34, 6), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M14 30h9l4-10 6 18 4-8h13', stroke: 'coral', sw: 3 },
    { d: rr(22, 50, 20, 5, 2.5), fill: 'fg' },
  ],
  // a medical cross on a tile
  generic: [
    { d: rr(10, 14, 44, 40, 9), fill: 'fg' },
    { d: 'M28 22h8v8h8v8h-8v8h-8v-8h-8v-8h8Z', fill: 'surface' },
    { d: circle(48, 20, 3), fill: 'coral' },
  ],
};

/**
 * Words of a category name, per art. Names arrive in the language of the page (ar, en, ur, hi, bn, fil), so every
 * language has its stems here. Matched in this order, first hit wins; no hit is `generic`.
 */
const STEMS: ReadonlyArray<readonly [CategoryArtKey, readonly string[]]> = [
  ['skin', ['بشرة', 'skin', 'جلد', 'جلدی', 'त्वचा', 'ত্বক', 'balat']],
  ['hair', ['شعر', 'hair', 'बाल', 'চুল', 'buhok', 'بالوں']],
  ['makeup', ['مكياج', 'تجميل', 'إكسسوار', 'اكسسوار', 'makeup', 'make-up', 'cosmetic', 'beauty', 'accessor', 'میک اپ', 'مینک', 'मेकअप', 'মেকআপ', 'kolorete', 'pampaganda', 'کاسمیٹکس', 'सौंदर्य', 'कॉस्मेटिक', 'প্রসাধনী', 'kosmetiko']],
  ['motherBaby', ['أم ', 'الأم', 'طفل', 'رضع', 'حفاض', 'mother', 'baby', 'infant', 'diaper', 'ماں', 'بچ', 'माँ', 'मां', 'बच्च', 'শিশু', 'মা ', 'nanay', 'sanggol', 'bata']],
  ['vitamins', ['فيتامين', 'مكمل', 'تغذية', 'vitamin', 'supplement', 'nutrition', 'وٹامن', 'غذائیت', 'विटामिन', 'पोषण', 'ভিটামিন', 'পুষ্টি', 'bitamina', 'nutrisyon', 'سپلیمنٹ', 'अनुपूरक', 'পরিপূরক']],
  ['devices', ['أجهزة', 'مستلزمات', 'منزلي', 'device', 'equipment', 'supplies', 'home health', 'آلات', 'آلے', 'उपकरण', 'যন্ত্র', 'kagamitan', 'aparato', 'সরঞ্জাম', 'গৃহ স্বাস্থ্য']],
  ['personal', ['شخصية', 'personal', 'hygiene', 'oral', 'فم', 'أسنان', 'ذاتی', 'व्यक्तिगत', 'ব্যক্তিগত', 'pansariling', 'pangkalinisan', 'استحمام', 'bath', 'body', 'غسل', 'جسم', 'स्नान', 'शरीर', 'স্নান', 'শরীর', 'paliligo', 'katawan']],
  ['medicines', ['أدوية', 'دواء', 'علاج', 'medicin', 'drug', 'pharma', 'دوا', 'दवा', 'औषध', 'ওষুধ', 'gamot']],
  // "Specialized wellness" has no art of its own: it shares the vitamins art (after devices, whose Filipino name also holds "kalusugan")
  ['vitamins', ['العافية', 'wellness', 'تندرستی', 'कल्याण', 'সুস্থতা', 'kalusugan']],
];

/** The illustration of a category by its (localized) name. The "All" entry passes `'all'` itself. */
export function categoryArtKey(name: string): CategoryArtKey {
  const n = name.toLowerCase();
  for (const [key, stems] of STEMS) if (stems.some((s) => n.includes(s))) return key;
  return 'generic';
}
