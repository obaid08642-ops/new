#!/usr/bin/env node
/**
 * 12.A12 — the admin brand-controls gate.
 *
 * "Brand colors are not editable in admin; admin can enable and schedule
 * pre-designed seasonal themes (token overrides, contrast-checked)."
 *
 * The page this replaces rendered one `<input type="color">` per brand value and
 * wrote the result to `--brand` on the document root, reporting that the colour
 * was "applied to all screens". So the brand was editable by anyone with the page
 * open, globally, with no contrast check anywhere. That is the defect the spec
 * names, and it is easier to catch with a rule than with a review.
 *
 * The contrast half of the requirement is `run-seasonal-contrast`, which re-runs
 * every declared pair under every theme in both modes. This is the other half:
 * that the page cannot do the thing, that every theme is well-formed, and that
 * no theme moves the brand colour or an undeclared token.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(REPO, 'packages/design-tokens/tokens.json'), 'utf8'));
const page = readFileSync(join(REPO, 'admin/src/pages/admin/theme-control.tsx'), 'utf8');
// Comments are stripped before the assertions. The page's own header explains WHY
// the colour picker is gone, and a raw substring match reads that explanation as
// the defect — a report that flags its own documentation is worse than useless.
// Same class as the `.sr-only` false positive earlier.
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const problems = [];

if (code.includes('type="color"')) {
  problems.push('the admin page still offers a colour picker: the brand must not be editable');
}
if (/setProperty\(\s*["']--brand/.test(code)) {
  problems.push('the admin page still writes --brand directly onto the document root');
}
if (code.includes('setProperty')) {
  problems.push('the admin page writes CSS properties by hand; it should set one data-seasonal attribute');
}
if (!code.includes('setAttribute("data-seasonal"')) {
  problems.push('the admin page does not drive the theme through data-seasonal');
}

const themes = tokens.seasonal?.themes ?? [];
if (!themes.length) problems.push('tokens.json declares no seasonal themes');

const flat = new Set();
const walk = (o, p = '') => {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !('light' in v)) walk(v, key);
    else flat.add(key);
  }
};
walk(tokens);

for (const theme of themes) {
  if (!/^[a-z][a-z-]*$/.test(theme.id)) problems.push(`seasonal theme id "${theme.id}" is not kebab-case`);
  if (!theme.label?.ar || !theme.label?.en) problems.push(`seasonal theme "${theme.id}" lacks an ar/en label`);
  for (const [path, value] of Object.entries(theme.overrides ?? {})) {
    if (path === 'color.brand.coral' || path === 'color.brand.ink') {
      problems.push(`seasonal theme "${theme.id}" overrides the brand colour ${path}`);
    }
    if (!flat.has(path)) problems.push(`seasonal theme "${theme.id}" overrides undeclared ${path}`);
    if (!value || typeof value !== 'object' || !('light' in value) || !('dark' in value)) {
      problems.push(`seasonal theme "${theme.id}" override ${path} is not a {light,dark} pair`);
    }
  }
  if (theme.window) {
    const ok = /^\d{2}-\d{2}$/.test(theme.window.from) && /^\d{2}-\d{2}$/.test(theme.window.to);
    if (!ok) problems.push(`seasonal theme "${theme.id}" has a malformed window`);
  }
}

if (problems.length) {
  console.error('brand-controls: FAILED\n');
  problems.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}
console.log(
  `brand-controls: the brand is not editable, and ${themes.length} seasonal theme(s) are well-formed. ` +
    `Contrast for each is checked by run-seasonal-contrast.`,
);
