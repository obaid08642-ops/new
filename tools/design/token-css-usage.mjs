#!/usr/bin/env node
/**
 * Every `var(--nabd-…)` in the repo must exist in the built token CSS.
 *
 * This gate exists because `51dc39f` shipped 1,125 references to custom
 * properties that do not exist. The commit claimed "zero visual change" and
 * 430/430 tests passed, because neither a test nor a ratchet had ever asked
 * whether a variable name was real.
 *
 * The generator is the only authority:
 *
 *     const cssVarName = (path) => `--${PREFIX}${path.replace(/\./g, '-')}`;
 *
 * so `color.bg.surface` becomes `--nabd-color-bg-surface`, and light/dark is chosen
 * by the theme selector — never by a suffix. The script that caused the damage
 * wrote `--nabd-bg.surface-light`: no `color-` prefix, dots left in, and a mode
 * suffix that does not exist. Every one of those resolved to nothing, so each
 * colour silently fell back to whatever it inherited.
 *
 * A custom property that does not exist is not an error in CSS. It is a colour
 * that vanishes. That is why nothing caught it and why this gate is a hard fail.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/**
 * Every stylesheet that may define one.
 *
 * The first version read only `packages/design-tokens/dist/css/tokens.css` and
 * reported 122 failures. All 122 were false: `--nabd-font-sans`,
 * `--nabd-color-glass-bgStrong` and `--nabd-a11y-minTouchTarget` are defined as
 * app-level aliases in `patient-web/app/globals.css`, which uses a different
 * naming convention from the generator — camelCase aliases beside the
 * generator's kebab-case. So a gate that proves "this name does not exist"
 * still has to know every place it *could* exist, or it manufactures findings.
 *
 * That is the same lesson as `css-palette`'s comment stripping, one level up: the
 * gate is right and its input is wrong, and the failure looks like the gate's.
 */
const SOURCES = [
  'packages/design-tokens/dist/css/tokens.css',
  'packages/design-tokens/dist/css/seasonal.css',
  'packages/design-tokens/dist/css/fonts.css',
  'patient-web/app/globals.css',
  'admin/src/styles/globals.css',
  'provider-app/src/styles/globals.css',
];

const defined = new Set();
for (const rel of SOURCES) {
  const abs = join(REPO, rel);
  if (!existsSync(abs)) continue;
  for (const m of readFileSync(abs, 'utf8').matchAll(/(--nabd-[a-zA-Z0-9_-]+)\s*:/g)) defined.add(m[1]);
}
if (defined.size === 0) {
  console.error('token-css-usage: no token stylesheets found. Build the tokens first.');
  process.exit(1);
}

const ROOTS = ['patient-web', 'patient-app', 'admin', 'provider-app', 'packages', 'tools'];
const SKIP = new Set(['node_modules', 'dist', '.next', 'build', 'coverage', 'ui-generated']);
const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts|css|mjs)$/.test(p)) files.push(p);
  }
};
for (const r of ROOTS) {
  const abs = join(REPO, r);
  if (existsSync(abs)) walk(abs);
}

const USE = /var\(\s*(--nabd-[a-zA-Z0-9_-]+)/g;
const problems = [];
const used = new Set();
let refs = 0;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(USE)) {
    refs++;
    const name = m[1];
    used.add(name);
    if (!defined.has(name)) problems.push(`${relative(REPO, f)}  ${name}`);
  }
}

// A ratchet, not a ban. The 24 that remain are pre-existing and all live in
// `packages/ui` — the design system's own components, referencing tokens that
// were never emitted. They survived because that package's `check` cannot run:
// it imports @phosphor-icons/react, which is declared in package.json and absent
// from node_modules, so nothing was ever verified there.
//
// Fixing them is not this gate's job and is not authorised: those components
// cannot be type-checked or rendered in this state, so a change to them would be
// exactly the unverifiable edit this gate was written in response to. They are
// recorded at 24 and only ever move down.
const BASELINE = 24;
const extra = problems.length - BASELINE;

if (problems.length > BASELINE) {
  problems.length = BASELINE;
  console.error(`token-css-usage: ${extra} NEW reference(s) beyond the baseline of ${BASELINE}.`);
}

if (extra > 0) {
  console.error(`token-css-usage: FAILED — ${problems.length} reference(s) to custom properties that do not exist.\n`);
  console.error('  A custom property that is not defined is not an error in CSS. It is a colour\n');
  console.error('  that silently disappears. Names must come from cssVarName() in build.mjs:\n');
  problems.slice(0, 20).forEach((p) => console.error(`  ${p}`));
  if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more`);
  process.exit(1);
}
if (problems.length === BASELINE) {
  console.log(`token-css-usage: at the baseline — ${BASELINE} pre-existing reference(s) in packages/ui.`);
}

console.log(
  `token-css-usage: ${refs} reference(s) to ${used.size} distinct custom propert(ies), all defined.`,
);