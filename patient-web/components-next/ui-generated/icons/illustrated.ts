/**
 * The illustrated icon set — 12.A6.
 *
 * ONE geometry, TWO renderers. Every icon here is transcribed verbatim from the
 * owner-approved canvas (`docs/design/canvas/Icon.dc.html`, previewed in
 * `IconSet.dc.html`), so the app and the website cannot drift apart.
 *
 * The style, as the canvas states it: flat fills from the brand palette, a
 * 2.2px ink outline, rounded joins, one soft highlight, drawn on a 48x48 grid.
 * Illustrated icons are for service tiles, category tiles and empty states.
 * Small icons inside buttons, lists and the tab bar are NOT these — they are
 * the single line set behind `<Icon>`, which is why the two are kept apart.
 *
 * Colours are palette KEYS (`ink`, `coral`, …), never hex: they resolve through
 * `color.iconArt` in the design tokens, so a palette change moves the artwork
 * too. The artwork is identical in both themes, exactly as the canvas shows it;
 * readability comes from the ink outline rather than from the fill.
 */
// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/icons/illustrated.ts by tools/design/sync-ui-components.mjs.
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

export type IconArtKey =
  | 'ink'
  | 'paper'
  | 'coral'
  | 'amber'
  | 'blue'
  | 'blueSoft'
  | 'mint'
  | 'mintSoft'
  | 'violet'
  | 'lavender'
  | 'pink'
  | 'lime'
  | 'skin';

type Paint = IconArtKey;

/** A drawing primitive. Deliberately tiny: only what the nine icons need. */
export type Prim =
  | {
      el: 'path';
      d: string;
      fill?: Paint | 'none';
      stroke?: Paint;
      strokeWidth?: number;
      opacity?: number;
    }
  | {
      el: 'circle';
      cx: number;
      cy: number;
      r: number;
      fill?: Paint;
      stroke?: Paint;
      strokeWidth?: number;
      opacity?: number;
    }
  | {
      el: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      rx: number;
      fill?: Paint;
      stroke?: Paint;
      strokeWidth?: number;
      opacity?: number;
    }
  | { el: 'g'; rotate?: [number, number, number]; children: Prim[] };

/** The service tiles on the home screen, in the order the canvas lists them. */
export const ILLUSTRATED_ICONS = [
  'pharmacy',
  'consult',
  'lab',
  'radiology',
  'nursing',
  'mind',
  'nutrition',
  'family',
  'doctor',
] as const;

export type IllustratedIcon = (typeof ILLUSTRATED_ICONS)[number];

/** The service tint each tile puts the glyph on (tokens: color.service.*). */
export const ICON_TINT: Record<IllustratedIcon, string> = {
  pharmacy: 'pharmacy',
  consult: 'consult',
  lab: 'lab',
  radiology: 'radiology',
  nursing: 'nursing',
  mind: 'mind',
  nutrition: 'nutrition',
  family: 'family',
  doctor: 'consult',
};

export const ILLUSTRATED: Record<IllustratedIcon, Prim[]> = {
  // A capsule with a scored half and a tablet beside it.
  pharmacy: [
    {
      el: 'g',
      rotate: [-40, 22, 22],
      children: [
        { el: 'rect', x: 6, y: 15, w: 32, h: 14, rx: 7, fill: 'paper' },
        { el: 'path', d: 'M13 15 H22 V29 H13 A7 7 0 0 1 13 15 Z', fill: 'coral' },
        { el: 'rect', x: 6, y: 15, w: 32, h: 14, rx: 7, stroke: 'ink', strokeWidth: 2.2 },
        { el: 'path', d: 'M22 15 V29', stroke: 'ink', strokeWidth: 2.2 },
        { el: 'path', d: 'M27 19.5 h6', stroke: 'ink', strokeWidth: 2, opacity: 0.3 },
      ],
    },
    { el: 'circle', cx: 36, cy: 36, r: 7, fill: 'amber', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M32 36 h8', stroke: 'ink', strokeWidth: 2 },
  ],

  // A consultation kit: handle, body, lid, and a white cross.
  consult: [
    { el: 'path', d: 'M18 17 v-4 a3 3 0 0 1 3-3 h6 a3 3 0 0 1 3 3 v4', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'rect', x: 7, y: 17, w: 34, h: 24, rx: 7, fill: 'blueSoft', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M11 21 h26', stroke: 'blue', strokeWidth: 3 },
    { el: 'path', d: 'M24 24 v11 M18.5 29.5 h11', stroke: 'paper', strokeWidth: 4 },
  ],

  // A tilted test tube with a green sample, and two rising bubbles.
  lab: [
    {
      el: 'g',
      rotate: [28, 22, 26],
      children: [
        { el: 'path', d: 'M17 25 V36 a5 5 0 0 0 10 0 V25 Z', fill: 'mint' },
        { el: 'path', d: 'M17 8 V36 a5 5 0 0 0 10 0 V8', stroke: 'ink', strokeWidth: 2.2 },
        { el: 'path', d: 'M15 8 h14', stroke: 'ink', strokeWidth: 2.2 },
        { el: 'path', d: 'M17 25 h10', stroke: 'ink', strokeWidth: 2 },
        { el: 'path', d: 'M20 14 v6', stroke: 'ink', strokeWidth: 1.8, opacity: 0.3 },
      ],
    },
    { el: 'circle', cx: 37, cy: 11, r: 3.5, fill: 'amber', stroke: 'ink', strokeWidth: 2 },
    { el: 'circle', cx: 41, cy: 20, r: 2.2, fill: 'mintSoft' },
  ],

  // A film plate with a spine and two rows of frames.
  radiology: [
    { el: 'rect', x: 7, y: 7, w: 34, h: 34, rx: 9, fill: 'violet', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M24 12 v24', stroke: 'paper', strokeWidth: 3.2 },
    {
      el: 'path',
      d:
        'M16 17 c3 1.2 5.5 1.2 8 0 M32 17 c-3 1.2-5.5 1.2-8 0 ' +
        'M15 23.5 c4 1.6 6.5 1.6 9 0 M33 23.5 c-4 1.6-6.5 1.6-9 0 ' +
        'M16 30 c3 1.2 5.5 1.2 8 0 M32 30 c-3 1.2-5.5 1.2-8 0',
      stroke: 'paper',
      strokeWidth: 2.2,
    },
    { el: 'circle', cx: 37, cy: 11, r: 2, fill: 'amber' },
  ],

  // A house under a coral roof, with a heart at the door: care at home.
  nursing: [
    { el: 'path', d: 'M10 23 L24 11 L38 23 V40 H10 Z', fill: 'amber', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M6 25 L24 9 L42 25', stroke: 'coral', strokeWidth: 3.6 },
    {
      el: 'path',
      d: 'M24 36 s-7-4.4-7-9 a3.5 3.5 0 0 1 7-1.2 a3.5 3.5 0 0 1 7 1.2 c0 4.6-7 9-7 9 z',
      fill: 'paper',
      stroke: 'ink',
      strokeWidth: 2,
    },
  ],

  // Two halves of a brain with a spark above: mental health.
  mind: [
    { el: 'path', d: 'M23 10 a6 6 0 0 0-10 3 a6 6 0 0 0-3 10 a6 6 0 0 0 4 9 a6 6 0 0 0 9 4 Z', fill: 'lavender', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M25 10 a6 6 0 0 1 10 3 a6 6 0 0 1 3 10 a6 6 0 0 1-4 9 a6 6 0 0 1-9 4 Z', fill: 'pink', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M14 20 c2 0 3 1.5 3 3 M34 20 c-2 0-3 1.5-3 3', stroke: 'ink', strokeWidth: 1.8, opacity: 0.4 },
    { el: 'path', d: 'M41 4 l1.4 3.4 3.4 1.4-3.4 1.4 L41 13.6 l-1.4-3.4 L36.2 8.8 l3.4-1.4 z', fill: 'amber' },
  ],

  // An apple with a leaf and a highlight: nutrition.
  nutrition: [
    {
      el: 'path',
      d: 'M24 16 c-3-3-14-2-14 9 c0 9 6 15 10 15 c2 0 3-1 4-1 s2 1 4 1 c4 0 10-6 10-15 c0-11-11-12-14-9 z',
      fill: 'lime',
      stroke: 'ink',
      strokeWidth: 2.2,
    },
    { el: 'path', d: 'M24 16 c0-4 2-7 6-8', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M27 11 c3-4 8-3 9-1 c-2 3-6 4-9 1 z', fill: 'mint', stroke: 'ink', strokeWidth: 1.8 },
    { el: 'path', d: 'M15 23 c1-3 3-4 5-4', stroke: 'paper', strokeWidth: 2.6, opacity: 0.8 },
  ],

  // An adult and a child, side by side: the family account.
  family: [
    { el: 'circle', cx: 17, cy: 15, r: 6, fill: 'skin', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'circle', cx: 32, cy: 18, r: 5, fill: 'blueSoft', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M7 40 c0-7 4.5-12 10-12 s10 5 10 12 z', fill: 'coral', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M24 40 c0-6 3.5-10 8-10 s8 4 8 10 z', fill: 'blue', stroke: 'ink', strokeWidth: 2.2 },
  ],

  // A clinician in a coat with a stethoscope: the doctor avatar.
  doctor: [
    { el: 'path', d: 'M10 42 c0-8 6-13 14-13 s14 5 14 13 z', fill: 'paper', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M20 29.5 l4 6 4-6', stroke: 'ink', strokeWidth: 2 },
    { el: 'circle', cx: 24, cy: 17, r: 8, fill: 'skin', stroke: 'ink', strokeWidth: 2.2 },
    { el: 'path', d: 'M16 16 c1-6 5-8 8-8 s7 2 8 8 c-3-2-6-3-8-3 s-5 1-8 3 z', fill: 'ink' },
    { el: 'path', d: 'M31 33 v4 a3 3 0 0 1-6 0', stroke: 'blue', strokeWidth: 2 },
    { el: 'circle', cx: 25, cy: 38.5, r: 2, fill: 'blue' },
  ],
};

/** Every drawn colour must be a palette key — a raw hex here is a bug. */
export function assertArtworkIsPaletteBound(icons: Record<string, Prim[]> = ILLUSTRATED): string[] {
  const allowed = new Set<string>([
    'ink', 'paper', 'coral', 'amber', 'blue', 'blueSoft', 'mint', 'mintSoft',
    'violet', 'lavender', 'pink', 'lime', 'skin',
  ]);
  const offenders: string[] = [];
  const visit = (prims: Prim[], where: string) => {
    for (const prim of prims) {
      if (prim.el === 'g') {
        visit(prim.children, where);
        continue;
      }
      for (const slot of ['fill', 'stroke'] as const) {
        const value = (prim as Record<string, unknown>)[slot];
        if (value === undefined || value === 'none') continue;
        if (typeof value !== 'string' || !allowed.has(value)) {
          offenders.push(`${where}: ${slot}="${String(value)}" is not a color.iconArt key`);
        }
      }
    }
  };
  for (const [name, prims] of Object.entries(icons)) visit(prims, name);
  return offenders;
}
