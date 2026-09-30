#!/usr/bin/env node
/**
 * Generate the React Native token modules from tokens.json (12.A0 / 12.A2).
 *
 * WHY A MIRROR AND NOT AN IMPORT
 *
 * patient-web already established this: a client cannot import from a sibling
 * package. Metro refuses to resolve outside the app root, and TypeScript cannot
 * find the module either — the same wall the CSS import hit, so the fix is the
 * same one. The generated file is committed so consumers need no build step, and
 * `--check` fails if it drifts from the source of truth.
 *
 * WHY IT MATTERS
 *
 * provider-app/src/theme/tokens.ts used to be written by hand while claiming to
 * mirror tokens.json, and it held the pre-A2 palette. Ten screens imported it.
 * The generated file is the thing that cannot drift, because nothing edits it.
 *
 * Usage:
 *   node tools/design/sync-client-tokens.mjs           # write
 *   node tools/design/sync-client-tokens.mjs --check   # fail if stale
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const CHECK_ONLY = process.argv.includes('--check');

const tokensPath = join(REPO, 'packages/design-tokens/tokens.json');
const tokensRaw = readFileSync(tokensPath, 'utf8');
const source = JSON.parse(tokensRaw);
const color = source.color;

/** The names each client already uses, and where each one comes from. */
const NAMES = {
  provider: {
    primary: 'action.primary.bg',
    primaryFg: 'action.primary.fg',
    primaryDeep: 'brand.coral',
    coral: 'brand.coral',
    navy: 'brand.ink',
    mint: 'iconArt.mint',
    mintDeep: 'iconArt.mint',
    sky: 'service.consult.glyph',
    lime: 'accent.lime',
    yellow: 'accent.lime',
    purple: 'iconArt.violet',
    purpleSurface: 'service.consult.bg',
    pink: 'iconArt.pink',
    pinkSurface: 'status.danger.bg',
    background: 'bg.canvas',
    surface: 'bg.surface',
    surfaceSunken: 'bg.sunken',
    text: 'text.primary',
    textSecondary: 'text.secondary',
    textTertiary: 'text.tertiary',
    border: 'border.subtle',
    success: 'status.success.fg',
    successSurface: 'status.success.bg',
    error: 'status.danger.fg',
    errorSurface: 'status.danger.bg',
    info: 'status.info.fg',
    infoSurface: 'status.info.bg',
    warning: 'status.warning.fg',
    warningSurface: 'status.warning.bg',
  },
};

function read(path, theme = 'light') {
  const value = path.split('.').reduce((acc, k) => acc?.[k], color);
  if (value === undefined) throw new Error(`design token not found: color.${path}`);
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'light' in value && 'dark' in value) return value[theme];
  return String(value);
}

const banner = (client) => `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Written by tools/design/sync-client-tokens.mjs from
 * packages/design-tokens/tokens.json. Run \`npm run sync-client-tokens\` in
 * packages/design-tokens after a token change; \`--check\` in CI fails if this
 * file drifts.
 *
 * Client: ${client}
 */`;

function emit(client, names) {
  const light = Object.entries(names)
    .map(([k, p]) => `  ${k}: ${JSON.stringify(read(p))},`)
    .join('\n');
  const dark = Object.entries(names)
    .map(([k, p]) => `  ${k}: ${JSON.stringify(read(p, 'dark'))},`)
    .join('\n');
  return `${banner(client)}

export const light = {
${light}
} as const;

export const dark = {
${dark}
} as const;

export type Palette = typeof light;
export type PaletteName = keyof Palette;
`;
}

/**
 * patient-app's legacy palette, by ROLE rather than by name.
 *
 * Its keys are cryptic one- and two-letter names (`p`, `pd`, `tl`, `prs`) from a
 * pre-12 design system whose primary was lime `#7CB518`. Mapping each key to the
 * token that plays the same part is what lets the screens keep compiling while
 * the brand underneath them changes: `p` was "the primary action colour" and is
 * now the owner's coral action pair, whatever the key is called.
 *
 * `ps`/`pt` (pale and deep primary) map to the coral tints rather than the lime
 * ones they used to be, because a pale lime surface behind coral text is a
 * pairing nobody chose.
 */
const PATIENT = {
  brandPrimary: 'action.primary.bg',
  brandPrimaryDeep: 'brand.coral',
  brandBg: 'bg.canvas',
  bg: 'bg.sunken',
  s: 'bg.surface',
  n: 'brand.ink',
  n2: 'bg.elevated',
  t: 'text.primary',
  t2: 'text.secondary',
  t3: 'text.tertiary',
  bd: 'border.subtle',
  p: 'action.primary.bg',
  pd: 'brand.coral',
  ps: 'status.danger.bg',
  pt: 'status.danger.fg',
  c1: 'service.consult.glyph',
  c2: 'service.consult.glyph',
  tl: 'service.lab.glyph',
  ts: 'service.lab.bg',
  pr: 'iconArt.violet',
  prs: 'service.consult.bg',
  am: 'status.warning.fg',
  as: 'status.warning.bg',
  cr: 'status.danger.fg',
  cs: 'status.danger.bg',
  bl: 'status.info.fg',
  bs: 'status.info.bg',
  pk: 'iconArt.pink',
  pks: 'status.danger.bg',
  gr: 'status.success.fg',
  grs: 'status.success.bg',
  or: 'iconArt.amber',
  ors: 'status.warning.bg',
};

const TARGETS = [
  { file: 'provider-app/src/theme/tokens.generated.ts', client: 'provider-app', names: NAMES.provider },
  { file: 'patient-app/src/theme/colors.generated.ts', client: 'patient-app', names: PATIENT },
];

let stale = 0;
for (const target of TARGETS) {
  const out = resolve(REPO, target.file);
  const content = emit(target.client, target.names);
  if (CHECK_ONLY) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (current !== content) {
      console.error(`sync-client-tokens: ${target.file} is stale.`);
      console.error(`  source: packages/design-tokens/tokens.json`);
      console.error(`  fix:    node tools/design/sync-client-tokens.mjs`);
      stale++;
    }
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, content, 'utf8');
    console.log(`sync-client-tokens: wrote ${target.file}`);
  }
}

if (CHECK_ONLY) {
  if (stale) process.exit(1);
  console.log(`sync-client-tokens: ${TARGETS.length} generated file(s) are up to date.`);
}
