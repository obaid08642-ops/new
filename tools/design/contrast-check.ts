/**
 * Nabd+ contrast check — the permanent guard against "text/icon the same
 * colour as the background".
 *
 * Reads `packages/design-tokens/tokens.json` and verifies every token pair a
 * component is allowed to put on screen, in BOTH themes. A component never
 * picks colours freely: it picks a foreground token and a background token
 * from the same group, and every such combination is declared in the
 * `contrast` array of the token file. If a new component invents a pairing,
 * it is not in that array and the pair cannot be claimed to be checked — which
 * is why `12.C2` also lints for raw colours.
 *
 * Thresholds (WCAG 2.2):
 *   - body text  4.5:1
 *   - text >= 24px, and every icon  3:1
 * A translucent background is composited over the surface it really sits on
 * (a tint chip sits on a card, not on the page), then measured.
 *
 * Run:  node tools/design/contrast-check.ts
 * Exit: 0 = every declared pair passes in both themes, 1 = at least one fails.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOKENS = JSON.parse(readFileSync(join(ROOT, 'packages/design-tokens/tokens.json'), 'utf8')) as any;

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/* ------------------------------------------------------------------ colours */

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(input: unknown, tokenPath: string): Rgba {
  if (typeof input !== 'string') {
    throw new Error(`${tokenPath}: expected a colour string, got ${typeof input}`);
  }
  const value = input.trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  throw new Error(`${tokenPath}: cannot parse colour ${JSON.stringify(value)}`);
}

/** Source-over compositing of a possibly translucent colour onto an opaque one. */
function composite(fg: Rgba, bg: Rgba): Rgba {
  if (fg.a >= 1) return fg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

/** WCAG relative luminance. */
function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------- token access */

/** Read a dotted token path and resolve it for one theme. Paths in `contrast` are relative to the `color` group. */
/**
 * 12.A12 — the seasonal theme currently in force, or null.
 *
 * Set by `SEASONAL_ID` so the same declared pair can be re-checked under every
 * pre-designed theme. A seasonal theme is a set of token OVERRIDES, so it can
 * only change the answer for a pair whose fg or bg it actually overrides — but
 * that is exactly the pair a designer would not think to re-check, which is why
 * it is checked mechanically rather than by remembering.
 */
let SEASONAL: { id: string; overrides: Record<string, string> } | null = null;
const SEASONAL_ID = process.env.SEASONAL_ID || '';

function resolve(path: string, theme: Theme, group = 'color'): unknown {
  const full = path.startsWith(`${group}.`) ? path : `${group}.${path}`;
  if (SEASONAL && group === 'color' && full in SEASONAL.overrides) {
    const override = SEASONAL.overrides[full];
    // A themed override is a {light,dark} pair, resolved for the theme under test.
    if (override && typeof override === 'object' && theme in override) {
      return (override as Record<string, unknown>)[theme];
    }
    return override;
  }
  let node: any = TOKENS;
  for (const key of full.split('.')) {
    if (node === null || typeof node !== 'object' || !(key in node)) {
      throw new Error(`Unknown design token: ${path} (looked for ${full})`);
    }
    node = node[key];
  }
  if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
    if (!(theme in node)) {
      throw new Error(`Token ${path} has no "${theme}" value. Give it a {light, dark} pair or a plain string.`);
    }
    return node[theme];
  }
  return node;
}

const hex = ({ r, g, b }: Rgba) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/* ------------------------------------------------------------------- checks */

interface Pair {
  id: string;
  fg: string;
  bg: string;
  min?: number;
  kind?: 'text' | 'icon' | 'large';
  /** The token the background is painted on when the background is translucent. */
  over?: string;
  /** Only check these themes (defaults to both). */
  themes?: Theme[];
}

const pairs: Pair[] = TOKENS.contrast;
if (!Array.isArray(pairs) || pairs.length === 0) {
  console.error('contrast-check: tokens.json has no `contrast` pairs. Every component pairing must be declared.');
  process.exit(1);
}

if (SEASONAL_ID) {
  const theme = (TOKENS.seasonal?.themes ?? []).find((t: any) => t.id === SEASONAL_ID);
  if (!theme) {
    console.error(`contrast-check: no seasonal theme "${SEASONAL_ID}" in tokens.json.`);
    process.exit(2);
  }
  SEASONAL = { id: SEASONAL_ID, overrides: theme.overrides ?? {} };
  console.log(`contrast-check: checking under seasonal theme "${SEASONAL_ID}".`);
}

const failures: string[] = [];
const rows: string[] = [];
let checked = 0;

for (const pair of pairs) {
  const min = pair.min ?? (pair.kind === 'text' ? 4.5 : 3);
  for (const theme of pair.themes ?? THEMES) {
    const fgRaw = parseColor(resolve(pair.fg, theme), pair.fg);
    const bgRaw = parseColor(resolve(pair.bg, theme), pair.bg);

    // A translucent background is composited over the real surface underneath.
    const canvasPath = pair.over ?? 'bg.canvas';
    const under = parseColor(resolve(canvasPath, theme), canvasPath);
    const bg = composite(bgRaw, under);
    const fg = fgRaw.a < 1 ? composite(fgRaw, bg) : fgRaw;

    const ratio = contrastRatio(fg, bg);
    checked += 1;
    const pass = ratio >= min - 1e-9;
    const shown = `${ratio.toFixed(2)}:1 (min ${min})`;
    rows.push(
      `  ${pass ? 'PASS' : 'FAIL'}  ${theme.padEnd(5)}  ${pair.id.padEnd(52)}  ${shown.padEnd(22)}  ${hex(fg)} on ${hex(bg)}`,
    );
    if (!pass) failures.push(`${theme}: ${pair.id} — ${hex(fg)} on ${hex(bg)} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
  }
}

console.log(`Nabd+ contrast check — ${pairs.length} declared pair(s), ${checked} theme checks`);
console.log(rows.join('\n'));

if (failures.length) {
  console.error(`\ncontrast-check FAILED — ${failures.length} of ${checked}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nFix the token values in packages/design-tokens/tokens.json (never the checker).');
  process.exit(1);
}

console.log(`\ncontrast-check: all ${checked} checks pass in both themes.`);
