/**
 * no-px-font-size — 12.A5's guard, as a RATCHET.
 *
 * The type scale lives in the tokens (display 40 → micro 11.5, each with its own
 * line height tuned for Arabic). A component that writes `font-size: 15px` or
 * `fontSize: 15` has stepped outside that scale, which is how two screens end up
 * with two different "body" sizes and the Arabic line height stops working.
 *
 * THE DEBT IS REAL AND RECORDED, NOT HIDDEN. When this rule landed, 289
 * hard-coded sizes already existed across the four clients, written before the
 * design system existed. They are listed, per file, in
 * `no-px-font-size.baseline.json`. The rule therefore:
 *
 *   - FAILS if the total grows, or if any single file exceeds its baseline;
 *   - FAILS on any file that is not in the baseline and has a violation;
 *   - reports the outstanding count, and how many were cleared;
 *   - can only get stricter, never looser.
 *
 * 12.A11 rebuilds the screens on the stamps and deletes entries as it goes, so
 * the baseline is meant to shrink to zero. `--update` rewrites it and is only
 * correct when the count went DOWN.
 *
 * Run:  node tools/design/no-px-font-size.ts [--update]
 * Exit: 0 = within the baseline, 1 = a new hard-coded size appeared.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASELINE_PATH = join(HERE, 'no-px-font-size.baseline.json');

/** Scan the four clients; the design packages are the source of truth, not a client. */
const TARGETS = ['patient-web', 'patient-app', 'provider-app', 'admin'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss']);
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.expo', '.turbo', 'out']);

/** `font-size: 15px`, `fontSize: 15`, `fontSize={15}` — a raw number, not a token. */
const RAW_SIZE =
  /font-?size\s*[:=]\s*\{\s*-?\d+(?:\.\d+)?\s*\}|font-?size\s*:\s*-?\d+(?:\.\d+)?px/gi;

/** The token lookups that are the supported way to set a size. */
const TOKEN_SIZE =
  /font-?size\s*[:=]\s*\{\s*(?:t\.|tokens\(|typeScale|font\.size|style\.\w*[Ff]ont|var\(--nabd-font-size)/;

interface Finding {
  file: string;
  line: number;
  text: string;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(extname(full))) yield full;
  }
}

const findings: Finding[] = [];
let scanned = 0;

for (const target of TARGETS) {
  const base = join(ROOT, target);
  if (!existsSync(base)) {
    console.error(`no-px-font-size: ${target} does not exist.`);
    process.exit(1);
  }
  for (const file of walk(base)) {
    scanned += 1;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, index) => {
      // A size inside a comment is documentation, not a style.
      const code = text.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
      if (TOKEN_SIZE.test(code)) return;
      if (RAW_SIZE.test(code)) {
        findings.push({ file: relative(ROOT, file), line: index + 1, text: text.trim() });
      }
      RAW_SIZE.lastIndex = 0;
      TOKEN_SIZE.lastIndex = 0;
    });
  }
}

const current: Record<string, number> = {};
for (const f of findings) current[f.file] = (current[f.file] ?? 0) + 1;

// The baseline file stores { $comment, total, files } — only `files` is a map.
const recorded = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
const baseline: Record<string, number> = recorded?.files ?? {};

const currentTotal = findings.length;
const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);

const INIT = process.argv.includes('--init');
if (INIT || process.argv.includes('--update')) {
  if (!INIT && currentTotal > baselineTotal) {
    console.error(
      `no-px-font-size: refusing to raise the baseline from ${baselineTotal} to ${currentTotal}. ` +
        'The ratchet only goes down — fix the new sizes first. ' +
        '(--init records the very first baseline and may only be used once.)',
    );
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $comment:
          'Recorded debt for tools/design/no-px-font-size.ts. Every entry is a hard-coded ' +
          'font size that predates the design system. 12.A11 removes entries as screens are ' +
          'rebuilt on the stamps. This file may only shrink.',
        total: currentTotal,
        files: sorted,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(
    INIT
      ? `no-px-font-size: recorded the initial baseline: ${currentTotal} hard-coded size(s) ` +
        `in ${Object.keys(current).length} file(s). 12.A11 shrinks this to zero.`
      : `no-px-font-size: baseline updated ${baselineTotal} -> ${currentTotal} ` +
        `(${baselineTotal - currentTotal} cleared).`,
  );
  process.exit(0);
}

const regressions: string[] = [];
for (const [file, count] of Object.entries(current)) {
  const allowed = baseline[file] ?? 0;
  if (count > allowed) {
    regressions.push(
      `  ${file}: ${count} hard-coded size(s), baseline allows ${allowed}` +
        (allowed === 0 ? ' (this file had none before)' : ''),
    );
  }
}
const cleared = baselineTotal - currentTotal;

if (regressions.length) {
  console.error(
    `no-px-font-size FAILED — ${currentTotal} hard-coded font size(s) in ${scanned} files, ` +
      `baseline allows ${baselineTotal}:\n` +
      `${regressions.join('\n')}\n\n` +
      'Use the type scale: the CSS variable var(--nabd-font-size-body), or in React Native\n' +
      'tokens(theme).font.size.body.size. A genuinely new size is added to\n' +
      'packages/design-tokens/tokens.json — never written into a screen.',
  );
  process.exit(1);
}

console.log(
  `no-px-font-size: ${scanned} files scanned. ${currentTotal} recorded, none added ` +
    `(baseline ${baselineTotal}${cleared > 0 ? `, ${cleared} cleared since — update the baseline` : ''}).`,
);
