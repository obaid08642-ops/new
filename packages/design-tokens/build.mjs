#!/usr/bin/env node
/**
 * Nabd+ design tokens — generator.
 *
 * `tokens.json` is the only place a colour, size, radius, spacing, shadow,
 * font or duration is written down. This script turns it into the three
 * artefacts the clients consume and must never edit by hand:
 *
 *   dist/css/tokens.css        CSS custom properties for patient-web and admin
 *                              (:root = light, [data-theme='dark'] = dark)
 *   dist/ts/tokens.ts          the same tokens as a TypeScript module, for
 *                              patient-app and provider-app (React Native has
 *                              no CSS variables)
 *   dist/tailwind-preset.js    a Tailwind preset mapping the semantic names
 *
 * A value is either a plain string (identical in both themes) or
 * { "light": …, "dark": … }. Nothing else is accepted, so a new token cannot
 * silently be added to only one platform.
 *
 * Usage: node packages/design-tokens/build.mjs [--check]
 *   --check  regenerate into memory and fail if the committed output differs
 *            (this is what CI runs, so a hand-edited dist/ is caught)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = join(HERE, 'tokens.json');
const DIST = join(HERE, 'dist');
const PREFIX = 'nabd-';

/** Keys that are documentation, not design tokens. */
const SKIP_TOP = new Set(['$schema', 'meta', 'contrast']);
/** A leading underscore marks a documentation key at ANY depth (e.g. `_note`). */
const isDoc = (key, depth) => key.startsWith('_') || (depth === 0 && SKIP_TOP.has(key));

const CHECK_ONLY = process.argv.includes('--check');

const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));

/* ------------------------------------------------------------------ helpers */

const isThemed = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && ('light' in v || 'dark' in v);
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !isThemed(v);

/** Flatten to { 'color.bg.canvas': value }. value is a string or {light,dark}. */
function flatten(node, trail = [], out = {}) {
  for (const [key, value] of Object.entries(node)) {
    if (isDoc(key, trail.length)) continue;
    const path = [...trail, key];
    if (isThemed(value)) {
      for (const theme of ['light', 'dark']) {
        if (typeof value[theme] !== 'string') {
          throw new Error(`${path.join('.')}.${theme} must be a string`);
        }
        out[path.join('.')] = { ...(out[path.join('.')] || {}), [theme]: value[theme] };
      }
    } else if (isPlain(value)) {
      flatten(value, path, out);
    } else if (Array.isArray(value)) {
      out[path.join('.')] = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      out[path.join('.')] = value;
    } else {
      throw new Error(`${path.join('.')} must be a string, {light,dark} or a nested object — got ${typeof value}`);
    }
  }
  return out;
}

/** The value for one theme. Falls back to the other theme, then to itself. */
function forTheme(value, theme) {
  if (!isThemed(value)) return value;
  return value[theme] ?? value[theme === 'light' ? 'dark' : 'light'];
}

const cssVarName = (path) => `--${PREFIX}${path.replace(/\./g, '-')}`;

const BANNER = (tool) => `/* GENERATED from packages/design-tokens/tokens.json by ${tool}. Do not edit. */`;

/* ---------------------------------------------------------------------- CSS */

function buildCss(flat) {
  const light = [];
  const dark = [];
  for (const [path, value] of Object.entries(flat)) {
    if (Array.isArray(value)) continue;
    const name = cssVarName(path);
    if (isThemed(value)) {
      light.push(`  ${name}: ${value.light};`);
      dark.push(`  ${name}: ${value.dark};`);
    } else {
      // Theme-independent: declared once on :root and inherited by the dark block.
      light.push(`  ${name}: ${value};`);
    }
  }
  return [
    BANNER('packages/design-tokens/build.mjs'),
    '',
    ':root {',
    '  color-scheme: light;',
    ...light,
    '}',
    '',
    '[data-theme="dark"] {',
    '  color-scheme: dark;',
    ...dark,
    '}',
    '',
  ].join('\n');
}

/* ----------------------------------------------------------------------- TS */

const tsType = (value) => {
  if (Array.isArray(value)) return 'readonly (string | number)[]';
  // A {light, dark} token is always resolved for one theme before it reaches
  // this module, so its type here is the resolved one.
  if (typeof value === 'number') return 'number';
  return 'string';
};

/** A key like `2xl` or `3xs` is not a valid identifier, so it must be quoted. */
const tsKey = (key) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key));

/** Recursive members of one group, preserving the nesting of tokens.json. Braces are added by the caller. */
function tsInterface(node, indent) {
  const inner = '  '.repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(node)) {
    if (isDoc(key, indent - 1)) continue;
    if (isThemed(value) || Array.isArray(value) || !isPlain(value)) {
      lines.push(`${inner}readonly ${tsKey(key)}: ${tsType(value)};`);
    } else {
      lines.push(`${inner}readonly ${tsKey(key)}: {`);
      lines.push(...tsInterface(value, indent + 1));
      lines.push(`${inner}};`);
    }
  }
  return lines;
}

/** Recursive runtime value for one group, with every theme resolved. Braces are added by the caller. */
function tsValue(node, theme, indent) {
  const inner = '  '.repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(node)) {
    if (isDoc(key, indent - 1)) continue;
    if (isThemed(value) || Array.isArray(value) || !isPlain(value)) {
      const resolved = Array.isArray(value) ? value : forTheme(value, theme);
      lines.push(`${inner}${JSON.stringify(key)}: ${JSON.stringify(resolved)},`);
    } else {
      lines.push(`${inner}${JSON.stringify(key)}: {`);
      lines.push(...tsValue(value, theme, indent + 1));
      lines.push(`${inner}},`);
    }
  }
  return lines;
}

function buildTs(flat) {
  const assignments = (theme) =>
    Object.entries(flat)
      .filter(([, v]) => !Array.isArray(v))
      .map(([path, value]) => `  ${JSON.stringify(path)}: ${JSON.stringify(forTheme(value, theme))},`)
      .join('\n');

  const lightTree = ['const lightTree: Tokens = {', ...tsValue(tokens, 'light', 1), '};'].join('\n');
  const darkTree = ['const darkTree: Tokens = {', ...tsValue(tokens, 'dark', 1), '};'].join('\n');

  const themedPaths = [
    'const themedPaths: Readonly<Record<string, true>> = Object.freeze({',
    ...Object.entries(flat)
      .filter(([, v]) => isThemed(v))
      .map(([path]) => `  ${JSON.stringify(path)}: true,`),
    '});',
  ].join('\n');

  return `${BANNER('packages/design-tokens/build.mjs')}
export type ThemeName = 'light' | 'dark';

export interface Tokens {
${tsInterface(tokens, 1).join('\n')}
}

${lightTree}

${darkTree}

${themedPaths}

/**
 * The whole system for one theme, nested exactly like tokens.json.
 * React Native has no CSS custom properties, so the apps read this object.
 */
export function tokens(theme: ThemeName): Tokens {
  return theme === 'dark' ? darkTree : lightTree;
}

/** Every token flattened, \`light\` resolved. Keys are dotted paths. */
export const light: Readonly<Record<string, string | number>> = Object.freeze({
${assignments('light')}
});

/** Every token flattened, \`dark\` resolved. Keys are dotted paths. */
export const dark: Readonly<Record<string, string | number>> = Object.freeze({
${assignments('dark')}
});

/**
 * One token by its dotted path, in a theme. Throws so a typo never renders
 * silently. Returns a number for the few numeric tokens (font weights).
 */
export function token(path: string, theme: ThemeName): string | number {
  const table = theme === 'dark' ? dark : light;
  const value = table[path];
  if (value === undefined) {
    throw new Error(\`Unknown design token: \${path}. It must exist in packages/design-tokens/tokens.json.\`);
  }
  return value;
}

/** True when the token has a light/dark split, so a caller can report the pair it picked. */
export function isThemed(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(themedPaths, path);
}

${(() => {
  const hrefs = LOCALES.map((l) => `  ${l}: ${JSON.stringify(fontHref(l))},`).join('\n');
  const stacks = LOCALES.map((l) => `  ${l}: lightTree.font.family.locale.${l},`).join('\n');
  return `/** The six supported locales. ar and ur are RTL; the rest are LTR. */
export const locales = ${JSON.stringify(LOCALES)} as const;
export type Locale = (typeof locales)[number];

const hrefByLocale: Readonly<Record<Locale, string>> = {
${hrefs}
};

const stackByLocale: Readonly<Record<Locale, string>> = {
${stacks}
};

/**
 * The Google Fonts request for ONE locale, so a page downloads only the scripts
 * it actually renders: a Hindi page never pulls Nastaliq, and an English page
 * never pulls Devanagari. \`\`fontHrefFor('en')\`\`.
 */
export function fontHrefFor(locale: Locale): string {
  return hrefByLocale[locale];
}

/** The font stack for one locale, ready for a StyleSheet or a CSS variable. */
export function fontStackFor(locale: Locale): string {
  return stackByLocale[locale];
}

/** The type scale for one theme, e.g. \`fontStack('ar').size.h1.size\` -> "26px". */
export function typeScale(theme: ThemeName = 'light') {
  return (theme === 'dark' ? darkTree : lightTree).font.size;
}`;
})()}

export default { tokens, light, dark, token, isThemed, locales, fontHrefFor, fontStackFor, typeScale };
`;
}

/* ------------------------------------------------------------------ Tailwind */

function buildTailwindPreset(flat) {
  const colors = {};
  for (const [path, value] of Object.entries(flat)) {
    if (!path.startsWith('color.') || Array.isArray(value)) continue;
    if (path.split('.').some((part) => part.startsWith('_'))) continue;
    const key = path.slice('color.'.length).replace(/\./g, '-');
    colors[key] = isThemed(value) ? { light: value.light, dark: value.dark, DEFAULT: value.light } : value;
  }

  const group = (prefix) =>
    Object.fromEntries(
      Object.entries(flat)
        .filter(([p, v]) => p.startsWith(`${prefix}.`) && !Array.isArray(v) && !isThemed(v) && !p.split('.').some((q) => q.startsWith('_')))
        .map(([p, v]) => [p.slice(prefix.length + 1).replace(/\./g, '-'), v]),
    );

  const shadows = Object.fromEntries(
    Object.entries(flat)
      .filter(([p, v]) => p.startsWith('shadow.') && !Array.isArray(v) && !p.includes('_'))
      .map(([p, v]) => [p.slice('shadow.'.length).replace(/\./g, '-'), isThemed(v) ? v.light : v]),
  );

  const fonts = {
    sans: flat['font.family.sans'],
    brand: flat['font.family.brand'],
    ...Object.fromEntries(
      Object.entries(flat)
        .filter(([p]) => p.startsWith('font.family.locale.'))
        .map(([p, v]) => [p.slice('font.family.locale.'.length).replace(/\./g, '-'), v]),
    ),
  };

  return `${BANNER('packages/design-tokens/build.mjs')}
/**
 * Tailwind preset carrying the Nabd+ semantic tokens.
 *
 *   colors['bg-canvas']   colors['action-primary-bg']   colors['service-pharmacy-glyph']
 *   spacing.sm            borderRadius['2xl']           boxShadow.tile
 *
 * A screen never writes a hex value: it picks a token from here. The
 * \`no-raw-color\` lint of 12.C2 fails the build if it does.
 */
const colors = ${JSON.stringify(colors, null, 2)};

const spacing = ${JSON.stringify(group('space'), null, 2)};

const borderRadius = ${JSON.stringify(group('radius'), null, 2)};

const boxShadow = ${JSON.stringify(shadows, null, 2)};

const fontFamily = ${JSON.stringify(fonts, null, 2)};

module.exports = { theme: { extend: { colors, spacing, borderRadius, boxShadow, fontFamily } } };
module.exports.nabdTokens = { colors, spacing, borderRadius, boxShadow, fontFamily };
`;
}

/* ------------------------------------------------------------------- fonts */

const LOCALES = ['ar', 'en', 'ur', 'hi', 'fil', 'bn'];

/** The Google Fonts request for one locale: only what that locale needs. */
function fontHref(locale) {
  const spec = tokens.font?.load?.[locale];
  if (!spec) throw new Error(`font.load has no entry for locale "${locale}"`);
  const families = spec.families
    .map((f) => `family=${f}:wght@${spec.weights.join(';')}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

function buildFontsCss(flat) {
  const sizeVars = Object.entries(flat)
    .filter(([p]) => p.startsWith('font.size.') && !Array.isArray(tokens.font.size) && !isThemed(p))
    .filter(([p]) => !p.includes('.size.') || p.split('.').length === 4)
    .map(([p, v]) => [p, v])
    .filter(([p, v]) => typeof v === 'string' || typeof v === 'number');

  const line = (name, prop) => {
    const entry = sizeVars.find(([p]) => p === `font.size.${name}.${prop}`);
    return entry ? entry[1] : undefined;
  };

  const vars = [];
  for (const name of Object.keys(tokens.font.size)) {
    const size = line(name, 'size');
    const lh = line(name, 'lineHeight');
    const weight = line(name, 'weight');
    const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    if (size) vars.push(`  --nabd-font-size-${kebab}: ${size};`);
    if (lh) vars.push(`  --nabd-line-height-${kebab}: ${lh};`);
    if (weight !== undefined) vars.push(`  --nabd-font-weight-${kebab}: ${weight};`);
  }

  const localeVars = LOCALES.map(
    (l) => `  --nabd-font-${l}: ${flat[`font.family.locale.${l}`]};`,
  );

  // One request for a preview page: every family any locale can need.
  const allFamilies = [...new Set(LOCALES.flatMap((l) => tokens.font.load[l].families))];
  const allWeights = [...new Set(LOCALES.flatMap((l) => tokens.font.load[l].weights))].sort((a, b) => a - b);
  const previewHref = `https://fonts.googleapis.com/css2?${allFamilies
    .map((f) => `family=${f}:wght@${allWeights.join(';')}`)
    .join('&')}&display=swap`;

  return [
    BANNER('packages/design-tokens/build.mjs'),
    '/*',
    ' * Web fonts and the type scale as CSS custom properties.',
    ' *',
    ' * The @import below is a SAFE DEFAULT: every family, so a preview page or a',
    ' * static render never falls back to a system font. A real app does NOT load',
    ' * this file wholesale — 12.A4 loads the href for the ACTIVE locale only via',
    ' * `fontHrefFor()`, so a Hindi page never downloads Nastaliq.',
    ' */',
    `@import url("${previewHref}");`,
    '',
    ':root {',
    `  --nabd-font-sans: ${flat['font.family.sans']};`,
    `  --nabd-font-brand: ${flat['font.family.brand']};`,
    ...localeVars,
    ...vars,
    '}',
    '',
  ].join('\n');
}

/* ------------------------------------------------------------------ main */

const flat = flatten(tokens);
const outputs = {
  'css/tokens.css': buildCss(flat),
  'css/fonts.css': buildFontsCss(flat),
  'ts/tokens.ts': buildTs(flat),
  'tailwind-preset.cjs': buildTailwindPreset(flat),
};

let drift = 0;
for (const [rel, content] of Object.entries(outputs)) {
  const target = join(DIST, rel);
  if (CHECK_ONLY) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
    if (current !== content) {
      console.error(`DRIFT  ${rel} is not what the generator produces. Run: node packages/design-tokens/build.mjs`);
      drift += 1;
    }
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

if (CHECK_ONLY) {
  if (drift) {
    console.error(`design-tokens: ${drift} generated file(s) out of date.`);
    process.exit(1);
  }
  console.log(`design-tokens: ${readdirSync(DIST).length} generated artefacts are up to date.`);
} else {
  const count = Object.keys(flat).length;
  console.log(`design-tokens: wrote ${Object.keys(outputs).length} artefacts from ${count} tokens.`);
  for (const rel of Object.keys(outputs)) console.log(`  dist/${rel}`);
}
