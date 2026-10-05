/**
 * no-left-right — handoff §6 and DEVICE_STANDARD §3.6 / §5: start/end, never
 * left/right, as a RATCHET.
 *
 * Arabic and Urdu are read right to left, and English, Hindi, Bengali and
 * Filipino left to right; the same screen ships in all six. A `marginLeft` is on
 * the wrong side in half of them. Logical properties follow the direction:
 *   React Native / inline styles: marginStart/End, paddingStart/End, start/end,
 *     borderStartWidth …; web CSS: margin-inline-start, padding-inline-end,
 *     inset-inline-start, border-inline-start ….
 *
 * What counts:
 *   - .ts/.tsx/.js/.jsx: a style KEY — `marginLeft`, `marginRight`, `paddingLeft`,
 *     `paddingRight`, `borderLeft…`, `borderRight…`, `left`, `right` — written as an
 *     object key (after `{`, `,` or at the start of a line). `insets.left` in an
 *     expression is not a key and is not counted.
 *   - .css/.scss: the properties `left`, `right`, `margin-left/right`,
 *     `padding-left/right`, `border-left/right…`.
 * Not counted: comments, *.test.* / *.spec.* files.
 *
 * THE DEBT IS RECORDED, NOT HIDDEN: the uses that existed when the gate landed
 * are listed per file in `no-left-right.baseline.json`. A file may not grow past
 * its entry, a new file must have none, and the total may only go down as screens
 * are rebuilt on the shells and the shared components. packages/ui and
 * packages/ui-native are the design system, and a new physical side there fails
 * like anywhere else.
 *
 * Run:  node tools/design/no-left-right.ts [--init | --update]
 * Exit: 0 = within the baseline, 1 = a new physical left/right.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASELINE_PATH = join(HERE, 'no-left-right.baseline.json');

const TARGETS = ['patient-app', 'patient-web', 'provider-app', 'admin', 'packages/ui', 'packages/ui-native'];
const CODE = new Set(['.ts', '.tsx', '.js', '.jsx']);
const STYLE = new Set(['.css', '.scss']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.expo', 'out', 'public', 'assets', 'android', 'ios', '.turbo']);

const KEY = /(?:^|[{,])\s*(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft\w*|borderRight\w*|left|right)\s*:/g;
const PROP = /(?:^|[;{\s])(left|right|margin-left|margin-right|padding-left|padding-right|border-left[\w-]*|border-right[\w-]*)\s*:/g;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (CODE.has(extname(full)) || STYLE.has(extname(full))) yield full;
  }
}

const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const isTestFile = (file: string) => /\.(test|spec)\.[jt]sx?$/.test(file) || /[\\/]__tests__[\\/]/.test(file);

const counts: Record<string, number> = {};
const where: Record<string, string[]> = {};
let scanned = 0;

for (const target of TARGETS) {
  const base = join(ROOT, target);
  if (!existsSync(base)) {
    console.error(`no-left-right: ${target} does not exist.`);
    process.exit(1);
  }
  for (const file of walk(base)) {
    if (isTestFile(file)) continue;
    scanned += 1;
    const rel = relative(ROOT, file);
    const re = STYLE.has(extname(file)) ? PROP : KEY;
    stripComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, i) => {
        for (const m of line.matchAll(re)) {
          counts[rel] = (counts[rel] ?? 0) + 1;
          (where[rel] ??= []).push(`  ${rel}:${i + 1}  ${m[1]}  ${line.trim().slice(0, 90)}`);
        }
      });
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const recorded = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
const baseline: Record<string, number> = recorded?.files ?? {};
const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);

const INIT = process.argv.includes('--init');
if (INIT || process.argv.includes('--update')) {
  if (!INIT && total > baselineTotal) {
    console.error(`no-left-right: refusing to raise the baseline from ${baselineTotal} to ${total}. Use start/end first.`);
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $comment:
          'Recorded debt for tools/design/no-left-right.ts: physical left/right style keys and CSS ' +
          'properties, per file, when the gate landed. They move to start/end (logical properties) as ' +
          'each screen is rebuilt on the shells and the shared components. This file may only shrink.',
        total,
        files: sorted,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`no-left-right: baseline ${INIT ? 'recorded' : `${baselineTotal} ->`} ${total} in ${Object.keys(sorted).length} file(s).`);
  process.exit(0);
}

const regressions = Object.entries(counts).filter(([file, n]) => n > (baseline[file] ?? 0));
if (regressions.length) {
  console.error(
    `no-left-right FAILED — ${total} physical left/right in ${scanned} files, baseline allows ${baselineTotal}:\n` +
      regressions.map(([file, n]) => `  ${file}: ${n}, baseline allows ${baseline[file] ?? 0}`).join('\n') +
      '\n',
  );
  for (const [file] of regressions) console.error(where[file].join('\n'));
  console.error(
    '\nUse start/end: marginStart/End, paddingStart/End, start/end, borderStartWidth in React Native and\n' +
      'inline styles; margin-inline-start, padding-inline-end, inset-inline-start in CSS.',
  );
  process.exit(1);
}
const cleared = baselineTotal - total;
console.log(
  `no-left-right: ${scanned} files scanned. ${total} recorded, none added ` +
    `(baseline ${baselineTotal}${cleared > 0 ? `, ${cleared} cleared — run --update` : ''}).`,
);
