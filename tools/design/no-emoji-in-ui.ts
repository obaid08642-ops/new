/**
 * no-emoji-in-ui — 12.A6's guard, as a RATCHET.
 *
 * §A6: "Zero emoji anywhere in the UI (buttons, tabs, lists, toasts, empty
 * states, notifications). Add a lint rule `no-emoji-in-ui` (regex on JSX text and
 * i18n values) that fails CI."
 *
 * An emoji is a full-colour glyph that ignores the theme, breaks in RTL, is
 * announced as a different word by a screen reader and cannot be recoloured —
 * which is exactly why the brand ships an illustrated icon set instead. This rule
 * fails the build when one sneaks back in.
 *
 * THE DEBT IS REAL AND RECORDED, NOT HIDDEN. When this rule landed, 47 emoji
 * were already being used as icons across the clients (29 in provider-app,
 * 17 in admin, 1 in patient-web), before the design system existed. They are listed, per file, in `no-emoji-in-ui.baseline.json`. The rule
 * therefore:
 *   - FAILS if the total grows, or if any single file exceeds its own entry;
 *   - reports the outstanding count and how many were cleared;
 *   - can only get stricter. 12.A11 replaces the emoji with <Icon> and shrinks
 *     the baseline to zero.
 *
 * What is NOT counted, and why:
 *   - a glyph inside a comment — the checkmark that opens a comment block is
 *     documentation, not UI (same rule as no-px-font-size);
 *   - anything in a *.test.* / *.spec.* file — those are fixtures, not UI, and one
 *     of them exists precisely to assert that the UI has no emoji. Their count is
 *     printed so nothing is hidden;
 *   - typographic characters that are not pictorial: © ® ™ № ° · — – … × arrows.
 *
 * Run:  node tools/design/no-emoji-in-ui.ts [--init | --update]
 * Exit: 0 = within the baseline, 1 = a new emoji appeared.
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASELINE_PATH = join(HERE, 'no-emoji-in-ui.baseline.json');

const TARGETS = ['patient-web', 'patient-app', 'provider-app', 'admin'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json']);
const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'coverage', '.expo', '.turbo', 'out',
  'public', 'assets',
]);

/**
 * Presentation emoji, kept as explicit ranges so the rule cannot start failing a
 * build on a character nobody meant as an icon: pictographs, emoticons,
 * transport, flags, symbols, supplemental, and the Dingbat/Misc blocks that
 * iOS and Android render as emoji. Regional indicators are included so a flag
 * pair is caught; the variation selector and ZWJ are included because they are
 * the glue inside a real emoji.
 */
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}\u{3030}\u{303D}]/u;

/** Typographic, not pictorial — fine in UI text. */
const ALLOWED = new Set(['©', '®', '™', '№', '°', '·', '—', '–', '…', '×', '→', '←', '↑', '↓', '↔', '✓', '☑', '★', '☆']);

interface Finding {
  file: string;
  line: number;
  text: string;
  emoji: string;
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

/** Strip comments so a glyph in prose is not reported as UI. */
const stripComments = (line: string): string =>
  line
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*(\*|\/\/|#).*$/, ' ')
    .replace(/(\/\/).*$/, ' ');

const isTestFile = (file: string) => /\.(test|spec)\.[jt]sx?$/.test(file);

const findings: Finding[] = [];
const inTests: Finding[] = [];
let scanned = 0;
let uiFiles = 0;
const perApp: Record<string, number> = {};

for (const target of TARGETS) {
  const base = join(ROOT, target);
  if (!existsSync(base)) {
    console.error(`no-emoji-in-ui: ${target} does not exist.`);
    process.exit(1);
  }
  perApp[target] = 0;
  for (const file of walk(base)) {
    scanned += 1;
    const test = isTestFile(file);
    if (!test) uiFiles += 1;
    const bucket = test ? inTests : findings;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((text, index) => {
        for (const char of stripComments(text)) {
          if (!EMOJI.test(char) || ALLOWED.has(char)) continue;
          bucket.push({ file: relative(ROOT, file), line: index + 1, text: text.trim(), emoji: char });
          if (!test) perApp[target] += 1;
          break;
        }
      });
  }
}

const current: Record<string, number> = {};
for (const f of findings) current[f.file] = (current[f.file] ?? 0) + 1;
const currentTotal = findings.length;

const recorded = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
const baseline: Record<string, number> = recorded?.files ?? {};
const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);

const INIT = process.argv.includes('--init');
if (INIT || process.argv.includes('--update')) {
  if (!INIT && currentTotal > baselineTotal) {
    console.error(
      `no-emoji-in-ui: refusing to raise the baseline from ${baselineTotal} to ${currentTotal}. ` +
        'The ratchet only goes down — replace the emoji with an <Icon> first.',
    );
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $comment:
          'Recorded debt for tools/design/no-emoji-in-ui.ts. Every entry is an emoji being used as ' +
          'an icon somewhere in a client, before the design system existed. 12.A11 replaces them ' +
          'with the illustrated or line icon set and this file shrinks to zero. It may only shrink.',
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
      ? `no-emoji-in-ui: recorded the initial baseline: ${currentTotal} in ${Object.keys(current).length} file(s).`
      : `no-emoji-in-ui: baseline ${baselineTotal} -> ${currentTotal}.`,
  );
  process.exit(0);
}

const regressions = Object.entries(current).filter(([file, count]) => count > (baseline[file] ?? 0));
const cleared = baselineTotal - currentTotal;

if (regressions.length) {
  const regressed = new Set(regressions.map(([file]) => file));
  const apps = Object.entries(perApp)
    .filter(([, n]) => n > 0)
    .map(([app, n]) => `${app}: ${n}`)
    .join(', ');
  console.error(
    `no-emoji-in-ui FAILED — ${currentTotal} emoji in ${uiFiles} UI files (${apps}), ` +
      `baseline allows ${baselineTotal}:\n` +
      `${regressions.map(([file, count]) => `  ${file}: ${count}, baseline allows ${baseline[file] ?? 0}`).join('\n')}\n`,
  );
  for (const f of findings) {
    if (!regressed.has(f.file)) continue;
    const code = f.emoji.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
    console.error(`  ${f.file}:${f.line}  U+${code}  ${f.text.slice(0, 96)}`);
  }
  console.error(
    '\nUse <Icon> from the design system: an illustrated icon for a tile or an\n' +
      'empty state, a line icon inside a button, list or tab bar. A translation\n' +
      'string carries words, never a glyph.',
  );
  process.exit(1);
}

if (inTests.length) {
  console.log(`no-emoji-in-ui: ${inTests.length} emoji in test fixtures (not UI, not counted).`);
}
console.log(
  `no-emoji-in-ui: ${uiFiles} UI files scanned. ${currentTotal} recorded, none added ` +
    `(baseline ${baselineTotal}${cleared > 0 ? `, ${cleared} cleared — run --update` : ''}).`,
);
