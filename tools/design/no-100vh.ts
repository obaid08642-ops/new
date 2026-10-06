/**
 * no-100vh — handoff §6 and DEVICE_STANDARD §5 (web): `100vh` is banned.
 *
 * On a phone `100vh` is the height with the browser's URL bar collapsed, so a
 * 100vh page is taller than the screen the user actually sees and its bottom (the
 * CTA, the tab bar) sits under the browser chrome. `100dvh` follows the visible
 * viewport. The web shells (packages/ui/shells) use `100dvh`; so must every page.
 *
 * STRICT: there is no recorded debt. The six uses found when the gate landed
 * (patient-web login, map, globals.css, map-explorer; admin's AdminGuard) were
 * moved to `100dvh` in the same change.
 *
 * Not counted: comments (a comment may say "never 100vh"), and *.test.* / *.spec.*
 * files (a test asserts its absence).
 *
 * Run:  node tools/design/no-100vh.ts
 * Exit: 0 = none, 1 = a 100vh in a web source file.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const TARGETS = ['patient-web', 'admin', 'packages/ui'];
const EXTENSIONS = new Set(['.css', '.scss', '.ts', '.tsx', '.js', '.jsx', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', 'out', 'public', '.turbo']);
const VH = /\b100vh\b/;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(extname(full))) yield full;
  }
}

/** Blank out block and line comments, keeping line numbers. `://` (a URL) is not a comment. */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const isTestFile = (file: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);

const findings: string[] = [];
let scanned = 0;
for (const target of TARGETS) {
  const base = join(ROOT, target);
  if (!existsSync(base)) {
    console.error(`no-100vh: ${target} does not exist.`);
    process.exit(1);
  }
  for (const file of walk(base)) {
    if (isTestFile(file)) continue;
    scanned += 1;
    stripComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, i) => {
        if (VH.test(line)) findings.push(`  ${relative(ROOT, file)}:${i + 1}  ${line.trim().slice(0, 110)}`);
      });
  }
}

if (findings.length) {
  console.error(`no-100vh FAILED — ${findings.length} use(s) of 100vh in ${scanned} web files:\n${findings.join('\n')}`);
  console.error('\nUse 100dvh (the visible viewport), or put the page in <AppShell>, which already does.');
  process.exit(1);
}
console.log(`no-100vh: ${scanned} web files scanned (${TARGETS.join(', ')}), no 100vh.`);
