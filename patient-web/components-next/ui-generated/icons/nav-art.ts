/**
 * Bottom tab bar illustrations: ONE small duotone picture per tab, as plain data (same format and roles as
 * ./category-art.ts, so the web draws it with classes and the app with react-native-svg from the very same shapes).
 *
 * Pharmacy and labs reuse the pharmacy category art (medicines) and the diagnostics art (blood); home, consultations and
 * nursing are new and drawn in the same style (flat tone fills, 2-unit ink outline, one coral accent). The tone of each tab is
 * one of SERVICE_TONES (icons/fill.ts), the same the service map gives the service. Drawing grid: 64 x 64.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/nav-art.ts by tools/design/sync-ui-components.mjs.
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
import { CATEGORY_ART, type CategoryArtShape } from './category-art';
import { DIAG_ART } from './diag-art';

export { CATEGORY_ART_VIEWBOX as NAV_ART_VIEWBOX } from './category-art';

export const NAV_ART_KEYS = ['home', 'pharmacy', 'consult', 'labs', 'nursing'] as const;
export type NavArtKey = (typeof NAV_ART_KEYS)[number];

export const NAV_ART_TONE = {
  home: 'amber',
  pharmacy: 'coral',
  consult: 'blue',
  labs: 'mint',
  nursing: 'teal',
} as const satisfies Record<NavArtKey, string>;

const rr = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
const circle = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 -${2 * r} 0z`;

export const NAV_ART: Record<NavArtKey, readonly CategoryArtShape[]> = {
  // a house: chimney, tone roof, door
  home: [
    { d: rr(41, 12, 7, 14, 2), fill: 'ink' },
    { d: rr(13, 28, 38, 26, 4), fill: 'surface', stroke: 'ink', sw: 2 },
    { d: 'M7 31L32 9L57 31Z', fill: 'fg', stroke: 'ink', sw: 2 },
    { d: rr(27, 38, 10, 16, 3), fill: 'coral' },
  ],
  pharmacy: CATEGORY_ART.medicines,
  // a stethoscope
  consult: [
    { d: 'M17 10v16a11 11 0 0 0 22 0V10', stroke: 'ink', sw: 3 },
    { d: circle(17, 10, 4), fill: 'fg' },
    { d: circle(39, 10, 4), fill: 'fg' },
    { d: 'M28 37v6a10 10 0 0 0 20 0v-5', stroke: 'ink', sw: 3 },
    { d: circle(48, 34, 7), fill: 'fg', stroke: 'ink', sw: 2 },
    { d: circle(48, 34, 3), fill: 'coral' },
  ],
  labs: DIAG_ART.blood,
  // a first-aid case
  nursing: [
    { d: 'M24 20v-5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5', stroke: 'ink', sw: 2.5 },
    { d: rr(8, 20, 48, 34, 8), fill: 'fg', stroke: 'ink', sw: 2 },
    { d: 'M28 28h8v7h7v8h-7v7h-8v-7h-7v-8h7Z', fill: 'surface' },
    { d: circle(49, 27, 3), fill: 'coral' },
  ],
};

/**
 * The raised centre button's picture (Consultations): the same illustrated stethoscope as `NAV_ART.consult`, one
 * step bolder (stroke 4, so it still reads at 30 pt) and drawn light on the coral fab gradient. Same roles as the
 * other art; on the button they resolve to the fab tokens instead of the tone (NAV_FAB_ROLE_TOKEN): the outline and
 * the light fills to `action.fab.fg`, the accent to `action.fab.to`. No colour of its own.
 */
export const NAV_FAB_ART: Record<'consult', readonly CategoryArtShape[]> = {
  consult: [
    { d: 'M17 10v16a11 11 0 0 0 22 0V10', stroke: 'ink', sw: 4 },
    { d: circle(17, 10, 4.5), fill: 'fg' },
    { d: circle(39, 10, 4.5), fill: 'fg' },
    { d: 'M28 37v6a10 10 0 0 0 20 0v-5', stroke: 'ink', sw: 4 },
    { d: circle(48, 34, 8), fill: 'fg', stroke: 'ink', sw: 3 },
    { d: circle(48, 34, 3.5), fill: 'coral' },
  ],
};

/** Which `action.fab` token each role takes on the raised button (web: the CSS variable; native: the token value). */
export const NAV_FAB_ROLE_TOKEN = {
  bg: 'fg',
  fg: 'fg',
  ink: 'fg',
  surface: 'fg',
  coral: 'to',
} as const satisfies Record<'bg' | 'fg' | 'ink' | 'surface' | 'coral', 'fg' | 'to'>;
