#!/usr/bin/env node
/**
 * 12.A7 / 12.A11 — the two icon maps must have the same keys.
 *
 * The name union in `packages/ui/icons/names.ts` and the renderer map in
 * `packages/ui/src/Icon.tsx` are two halves of one decision, and the union is
 * deliberately declared once so the curated set cannot grow on the web and stay
 * missing on native.
 *
 * This check exists because `packages/ui`'s own `check` cannot run: it imports
 * `@phosphor-icons/react`, which is declared in package.json and absent from
 * node_modules, so `build-preview.mjs` exits 1 — before and after any change of
 * mine. A gate that has never been green is not a gate, and reporting "all gates
 * green" while never invoking it is the same failure as a value written down but
 * never measured.
 *
 * Key parity needs no dependency, so this runs. It is the strongest claim
 * available without the library: a name can exist here and still be missing from
 * Phosphor, and that remains unproven until the dependency is installed.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const keys = (src, re) => new Set([...src.matchAll(re)].map((m) => m[1]));

const names = readFileSync(join(REPO, 'packages/ui/icons/names.ts'), 'utf8');
const icon = readFileSync(join(REPO, 'packages/ui/src/Icon.tsx'), 'utf8');

const declared = keys(names, /^\s+'?([a-z0-9-]+)'?:\s*'[A-Za-z]+',?\s*$/gm);
const rendered = keys(icon, /^\s+'?([a-z0-9-]+)'?:\s*phosphor\.[A-Za-z]+,\s*$/gm);

// Key parity is necessary and NOT sufficient: a key can be present in both maps
// and still be undefined at runtime, because the mapped Phosphor component does
// not exist. `activity: phosphor.Activity` passed parity for a whole commit and
// then threw "Unknown icon" the moment a screen used it, because Phosphor
// exports `Pulse` and has no `Activity`. So the component names are checked too.
const problems = [];
// Resolved through patient-web, which is where the package actually lives. The
// first version imported it from the repo root, did not find it, and printed
// "key parity only" — a green result from a weaker check, printed as if it were
// the real one. Degrading silently is the failure this gate exists to catch, so
// not resolving is now an error rather than a downgrade.
let phosphor = null;
let resolveError = null;
try {
  // `req.resolve` hands back the CommonJS entry, which cannot be imported from an
  // ES module ("exports is not defined in ES module scope"), so the ESM entry is
  // taken from the package's own `exports` map instead.
  const req = createRequire(join(REPO, 'patient-web/package.json'));
  const pkgPath = req.resolve('@phosphor-icons/react/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const root = dirname(pkgPath);
  const entry = typeof pkg.exports === 'string' ? pkg.exports : pkg.exports?.['.']?.import ?? pkg.module ?? pkg.main;
  phosphor = await import(pathToFileURL(resolve(root, entry)).href);
} catch (e) {
  resolveError = e;
}
if (!phosphor) {
  console.error(`icon-set-parity: cannot resolve @phosphor-icons/react via patient-web: ${resolveError?.message}`);
  console.error('  This check must not silently degrade to key parity. Install the dependency or fix the path.');
  process.exit(1);
}
{
  const mapped = [...names.matchAll(/^\s+'?([a-z0-9-]+)'?:\s*'([A-Za-z]+)'/gm)];
  for (const [, name, component] of mapped) {
    if (!(component in phosphor)) problems.push(`names.ts maps ${name} to ${component}, which Phosphor does not export`);
  }
}

for (const k of declared) if (!rendered.has(k)) problems.push(`declared in names.ts but not rendered: ${k}`);
for (const k of rendered) if (!declared.has(k)) problems.push(`rendered but not declared: ${k}`);

if (problems.length) {
  console.error('icon-set-parity: FAILED\n');
  problems.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}
console.log(`icon-set-parity: ${declared.size} line icon name(s) declared and rendered in step.`);
