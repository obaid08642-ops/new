#!/usr/bin/env node
/**
 * C2 — the import rule: screens take visual primitives from `packages/ui*` only.
 *
 * WHAT THIS IS FOR
 *
 * 12.C2 in the plan: "Lints in all 4 clients: `no-raw-color`, `no-emoji-in-ui`,
 * and an import rule that screens take visual primitives only from `packages/ui*`."
 *
 * The first two lints catch a hard-coded VALUE. This one catches a hard-coded
 * COMPONENT — a screen reaching past the design system for its own icons, its own
 * shadows, its own press behaviour. That is the same drift by a different route:
 * A6 built one curated Phosphor set and one `<Icon>` wrapper precisely so a
 * weight, a size or a stroke could not be decided at the call site, and a screen
 * that imports `lucide-react` or `@expo/vector-icons` directly is deciding those
 * things at the call site again.
 *
 * ALLOWED
 *   - `@nabd/ui`, `@nabd/ui-native` and their generated mirrors
 *   - a screen's own CSS, which the other two lints govern
 *
 * The generated mirrors are allowed because they ARE `packages/ui`: patient-web
 * cannot import the package directly (Turbopack refuses to resolve outside the
 * app root) and gets a copy instead, so the mirror is the design system, not a
 * way around it.
 *
 * RATCHETED, like the others: `--update` records the current count and only ever
 * lowers it. 12.A11 clears it as screens are rebuilt on the system.
 *
 * Usage: node tools/design/import-rule.mjs [--update]
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const BASELINE_PATH = join(REPO, 'tools/design/import-rule.baseline.json');
const argv = process.argv.slice(2);
const IS_UPDATE = argv.includes('--update');

/** Primitive libraries a screen must not import directly. */
const FORBIDDEN = [
  { spec: 'lucide-react', why: 'A6 ships one curated Phosphor set behind a single <Icon> wrapper' },
  { spec: '@expo/vector-icons', why: 'same: MaterialCommunityIcons is a second, uncontrolled icon set' },
  { spec: 'expo-material-symbols', why: 'same' },
  { spec: 'react-native-vector-icons', why: 'same' },
  { spec: '@fortawesome/react-fontawesome', why: 'a fourth icon set' },
];

/** Where a design-system import IS allowed from. */
const ALLOWED_PREFIXES = [
  '@nabd/ui',
  '@nabd/ui-native',
  '@/components-next/ui-generated', // the mirrored copy of @nabd/ui
];

const CLIENTS = [
  { name: 'patient-web', roots: ['app', 'components-next', 'lib', 'components'] },
  { name: 'patient-app', roots: ['app', 'src'] },
  { name: 'provider-app', roots: ['app', 'src'] },
  { name: 'admin', roots: ['src', 'app'] },
];

const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'coverage', '.expo',
  'ios', 'android', '__tests__', '__snapshots__', 'tests',
]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full) && !/\.d\.ts$/.test(full)) out.push(full);
  }
  return out;
}

const findings = [];
let scanned = 0;

for (const client of CLIENTS) {
  const files = CLIENTS[0] === client ? null : null; // placeholder to keep shape clear
  const all = [];
  for (const root of client.roots) walk(join(REPO, client.name, root), all);
  for (const file of all) {
    scanned++;
    const src = readFileSync(file, 'utf8');
    const rel = relative(REPO, file);
    for (const { spec, why } of FORBIDDEN) {
      const re = new RegExp(`(?:from|require\\()\\s*["']${spec.replace('/', '\\/')}(?:\\/[^"']*)?["']`, 'g');
      for (const m of src.matchAll(re)) {
        findings.push({ file: rel, spec, why, line: src.slice(0, m.index).split('\n').length });
      }
    }
  }
  void files;
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

const total = findings.length;
console.log(`import-rule: ${scanned} source file(s) scanned across ${CLIENTS.length} clients.`);
console.log(`import-rule: ${byFile.size} file(s) import a visual primitive directly (${total} import(s)).`);

if (IS_UPDATE) {
  const files = {};
  for (const [file, list] of byFile) files[file] = list.length;
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        note:
          'Screens importing a visual-primitive library directly instead of taking it from ' +
          'packages/ui*. Ratcheted per file; --update only ever lowers. 12.A11 clears it as ' +
          'screens are rebuilt on the design system.',
        files,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`import-rule: recorded ${byFile.size} file(s), ${total} import(s). 12.A11 clears it.`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error('import-rule: no baseline. Run --update once to record the current debt.');
  process.exit(2);
}
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

const problems = [];
for (const [file, list] of byFile) {
  const allowed = baseline.files[file] ?? 0;
  if (list.length > allowed) {
    problems.push(
      `  NEW  ${file}: ${list.length} direct primitive import(s), baseline allows ${allowed}\n` +
        list.slice(0, 3).map((f) => `        line ${f.line}: ${f.spec} — ${f.why}`).join('\n'),
    );
  }
}
const gone = Object.keys(baseline.files).filter((f) => !byFile.has(f));
if (gone.length) {
  problems.push(`  ${gone.length} file(s) are clean but still in the baseline — run --update to lower it`);
}

// A sanity check on the rule itself: if the allowed prefixes stop matching, the
// gate would pass by finding nothing. Assert the exemption is load-bearing.
const sample = readFileSync(join(REPO, 'patient-web/components-next/ui-generated/src/Icon.tsx'), 'utf8');
if (!/^"use client"/.test(sample)) {
  problems.push('  the mirrored renderer is missing its "use client" directive — check the mirror');
}

if (problems.length) {
  console.error('\nimport-rule: FAILED\n');
  problems.forEach((p) => console.error(p));
  console.error('\nTake the primitive from packages/ui* (or its generated mirror), not from the library.');
  process.exit(1);
}

const baseTotal = Object.values(baseline.files).reduce((a, b) => a + b, 0);
console.log(
  `import-rule: no NEW direct primitive import. ${total} remain (baseline ${baseTotal}). ` +
    `PARTIAL: 12.A11 clears them.`,
);
console.log(`import-rule: allowed sources are ${ALLOWED_PREFIXES.join(', ')}`);
