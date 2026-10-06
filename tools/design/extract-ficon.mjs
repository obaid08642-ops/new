#!/usr/bin/env node
/**
 * Port the filled service/action icon set out of the board, never redraw it
 * (handoff §1 "Icons", docs/audit/02 §12 "Port, never redraw").
 *
 * docs/design/canvas/FIcon.dc.html holds the Phosphor *fill* glyphs as SVG path
 * data (viewBox 0 0 256 256) in its `const P = {...}` map. This script copies that
 * map, unchanged, into packages/ui/icons/fill.ts — the one geometry file the web
 * <FIcon> (packages/ui) and the native <FIcon> (packages/ui-native) both draw.
 *
 *   node tools/design/extract-ficon.mjs           # write
 *   node tools/design/extract-ficon.mjs --check   # fail if fill.ts differs from the board
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BOARD = join(REPO, 'docs/design/canvas/FIcon.dc.html');
const OUT = join(REPO, 'packages/ui/icons/fill.ts');

const html = readFileSync(BOARD, 'utf8');
const m = html.match(/const P = (\{[^\n]*\});/);
if (!m) {
  console.error('extract-ficon: `const P = {...};` not found in docs/design/canvas/FIcon.dc.html');
  process.exit(2);
}
const paths = JSON.parse(m[1]);
const names = Object.keys(paths);
if (names.length === 0 || !names.every((n) => /^[a-z][a-z-]*$/.test(n) && typeof paths[n] === 'string' && paths[n].startsWith('M'))) {
  console.error('extract-ficon: unexpected shape in the board icon map');
  process.exit(2);
}

const body = `/* GENERATED from docs/design/canvas/FIcon.dc.html by tools/design/extract-ficon.mjs. Do not edit. */
/**
 * The filled icon set of handoff §1: Phosphor "fill" glyphs, viewBox 0 0 256 256,
 * drawn inside a soft-tinted rounded square by <FIcon> on web and native.
 */

export const FILL_ICON_VIEWBOX = '0 0 256 256';

export const FILL_ICON_PATHS = ${JSON.stringify(paths, null, 2)} as const;

export type FillIconName = keyof typeof FILL_ICON_PATHS;

export const FILL_ICON_NAMES = Object.keys(FILL_ICON_PATHS) as FillIconName[];

/** The tones of color.service.<tone> (tokens.json). */
export const SERVICE_TONES = ['coral', 'blue', 'mint', 'violet', 'amber', 'pink', 'lime', 'peach', 'teal', 'ink'] as const;
export type ServiceTone = (typeof SERVICE_TONES)[number];

/** Handoff §1 service map: which icon and tone each service always uses. */
export const SERVICE_ICONS = {
  consult: { icon: 'stethoscope', tone: 'blue' },
  pharmacy: { icon: 'pill', tone: 'coral' },
  lab: { icon: 'test-tube', tone: 'mint' },
  radiology: { icon: 'scan', tone: 'violet' },
  nursing: { icon: 'first-aid-kit', tone: 'teal' },
  nutrition: { icon: 'bowl-food', tone: 'lime' },
  maternity: { icon: 'baby', tone: 'pink' },
  map: { icon: 'map-trifold', tone: 'amber' },
  health: { icon: 'heartbeat', tone: 'coral' },
  emergency: { icon: 'ambulance', tone: 'peach' },
  mind: { icon: 'brain', tone: 'violet' },
  family: { icon: 'users-three', tone: 'peach' },
  insurance: { icon: 'shield-check', tone: 'blue' },
  points: { icon: 'star', tone: 'amber' },
} as const satisfies Record<string, { icon: FillIconName; tone: ServiceTone }>;

export type ServiceName = keyof typeof SERVICE_ICONS;
`;

if (process.argv.includes('--check')) {
  const have = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (have !== body) {
    console.error('extract-ficon: packages/ui/icons/fill.ts is stale. Run: node tools/design/extract-ficon.mjs');
    process.exit(1);
  }
  console.log(`extract-ficon: packages/ui/icons/fill.ts matches the board (${names.length} icons).`);
} else {
  writeFileSync(OUT, body);
  console.log(`extract-ficon: wrote packages/ui/icons/fill.ts (${names.length} icons).`);
}
