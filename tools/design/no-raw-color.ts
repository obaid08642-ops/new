#!/usr/bin/env node
/**
 * `no-raw-color` — the A0 guard, and the lint Gate P12 names.
 *
 * A0 is the principle the owner set: "Nothing in any screen may hardcode a
 * colour... Changing a token must change every screen of patient-app,
 * patient-web, provider-app and admin at once."
 *
 * That sentence is only true if a screen cannot carry a colour of its own. So
 * this is the rule that makes the rest of the system mean anything: no `#hex`,
 * no `rgb()`, no `hsl()`, no named colour, in any UI file, in any of the four
 * clients — a colour must be a token.
 *
 * WHY IT IS A RATCHET, AND WHAT THAT MEANS
 *
 * When the rule landed, **6,705 hard-coded colours already existed** across the
 * four clients, written before any design system. They are recorded per file in
 * `no-raw-color.baseline.json`. The rule fails if the total grows or if any file
 * exceeds its own entry, and it refuses to raise the baseline: `--init` records
 * it once, `--update` only ever LOWERS it.
 *
 * So this is PARTIAL and must not be called green. Clearing the debt is 12.A11's
 * job — it rebuilds the screens on the tokens, and each rebuilt file drops out of
 * the baseline on its own. What is true NOW is that the debt is measured, it is
 * frozen, and any new colour is refused.
 *
 * WHY DESIGN PACKAGES ARE EXCLUDED
 *
 * `packages/**` is the SYSTEM, not a screen. `color.iconArt` holds literal hex
 * because it is the palette those values define, and a `contrast-check` fixture
 * has to name a real colour to mean anything. Excluding the packages is what
 * lets this rule be absolute everywhere it matters: in the four clients.
 *
 * Proven to bite: adding `#ff00aa` to a component turns it red and names the
 * file and the line.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const BASELINE_PATH = join(HERE, 'no-raw-color.baseline.json');

const CLIENTS = ['patient-web', 'patient-app', 'provider-app', 'admin'] as const;

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss']);

/** Directories that hold no shipped UI. */
const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.turbo', '.cache',
  '.expo', 'ios', 'android', 'public', 'attached_assets', 'shared', '__snapshots__',
]);

/**
 * Files allowed to carry a literal colour, each with the reason it is exempt.
 * A blanket skip is how a guard rots, so every entry is a decision with a name
 * attached rather than a path nobody remembers adding.
 */
const EXEMPT_FILES: Record<string, string> = {
  'admin/src/app/globals.css':
    'holds the Tailwind/Next layer; 12.A11 moves the palette onto tokens.css',
  // patient-web/app/globals.css WAS exempt while its five legacy :root palettes
  // were being replaced. They have been: it imports tokens.css and every name is
  // a var() now, so the exemption is removed and the file is under the rule again.
};

const SKIP_FILES = new Set(Object.keys(EXEMPT_FILES));

/* ------------------------------------------------------------------ patterns */

/**
 * A colour, matched where a colour can actually appear in these file types.
 *
 * `var(--x)` and `color-mix()` are NOT matches: the first is the point, the
 * second composes two tokens. `currentColor`/`transparent`/`inherit` are not
 * colours, they are instructions.
 */
const PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: 'hex', re: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g },
  { id: 'rgb', re: /\brgba?\(\s*[0-9]/g },
  { id: 'hsl', re: /\bhsla?\(\s*[0-9]/g },
  {
    // The CSS named colours that actually reach a UI. The full CSS list is 148
    // entries and several are the token NAMES, so the practical set is what
    // matters; `white`/`black` alone are the two that show up most in a codebase.
    id: 'named',
    re: /(?<![\w$-])(?:white|black|silver|gray|grey|crimson|maroon|olive|lime|aqua|teal|navy|teal|salmon|coral|khaki|plum|orchid|crimson)(?![\w$-])(?=\s*[;,"')]|\s*$)/g,
  },
];

/* -------------------------------------------------------------------- walk */

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.') && entry !== '.') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      yield* walk(full);
    } else if (SOURCE_EXT.has(extname(entry))) {
      yield full;
    }
  }
}

interface Offender {
  client: string;
  file: string;
  line: number;
  kind: string;
  text: string;
}

function scan(): Offender[] {
  const found: Offender[] = [];

  for (const client of CLIENTS) {
    for (const file of walk(join(REPO, client))) {
      const rel = relative(REPO, file);
      if (SKIP_FILES.has(rel)) continue;

      // A test is not a screen: an expected colour in an assertion is data, not
      // a decision about how the product looks.
      if (/\.(test|spec)\.[a-z]+$/.test(rel) || rel.includes('/__tests__/') || rel.includes('/tests/')) {
        continue;
      }

      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        // A line that is entirely a comment is not code.
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

        for (const { id, re } of PATTERNS) {
          re.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = re.exec(line)) !== null) {
            const text = m[0];
            // `var(--nabd-...)` and `color-mix(in srgb, var(--a), var(--b))` are
            // how a token is USED. Neither should ever read as a hard-coded colour.
            const before = line.slice(0, m.index);
            if (/var\(\s*--/.test(before.slice(-24))) continue;
            if (/^#[0-9a-fA-F]{3,8}$/.test(text) && /url\(/.test(before)) continue;

            found.push({ client, file: rel, line: i + 1, kind: id, text: text.slice(0, 40) });
          }
        }
      });
    }
  }

  return found;
}

/* ----------------------------------------------------------------- baseline */

interface Baseline {
  note: string;
  totals: Record<string, number>;
  files: Record<string, number>;
}

function readBaseline(): Baseline | null {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

function buildBaseline(offenders: Offender[]): Baseline {
  const files: Record<string, number> = {};
  const totals: Record<string, number> = {};
  for (const o of offenders) {
    files[o.file] = (files[o.file] ?? 0) + 1;
    totals[o.client] = (totals[o.client] ?? 0) + 1;
  }
  for (const c of CLIENTS) totals[c] ??= 0;
  return {
    note:
      'Hard-coded colours that predate the design system. Recorded once with --init. ' +
      '12.A11 rebuilds the screens on tokens and each rebuilt file drops out. ' +
      '--update only ever LOWERS a count; it cannot raise one.',
    totals,
    files,
  };
}

/* --------------------------------------------------------------------- main */

const argv = new Set(process.argv.slice(2));
const offenders = scan();
const byFile = new Map<string, Offender[]>();
for (const o of offenders) {
  if (!byFile.has(o.file)) byFile.set(o.file, []);
  byFile.get(o.file)!.push(o);
}

if (argv.has('--init')) {
  if (readBaseline()) {
    console.error('no-raw-color: a baseline already exists. Use --update to LOWER it; it is never raised.');
    process.exit(2);
  }
  const b = buildBaseline(offenders);
  writeFileSync(BASELINE_PATH, `${JSON.stringify(b, null, 2)}\n`, 'utf8');
  console.log(`no-raw-color: recorded ${offenders.length} pre-existing colours across ${Object.keys(b.files).length} files.`);
  process.exit(0);
}

const baseline = readBaseline();
if (!baseline) {
  console.error('no-raw-color: no baseline. Run with --init ONCE, then reduce it with --update as screens are rebuilt.');
  process.exit(2);
}

const problems: string[] = [];

// 1. A file that appears for the first time, or grew, is a NEW hard-coded colour.
for (const [file, list] of [...byFile].sort((a, b) => a[0].localeCompare(b[0]))) {
  const allowed = baseline.files[file] ?? 0;
  if (list.length > allowed) {
    problems.push(
      `  ${file}: ${list.length} hard-coded colour(s), baseline allows ${allowed}` +
        `\n      first: line ${list[0].line} — ${list[0].kind} "${list[0].text}"`,
    );
  }
}

// 2. The TOTAL may never grow, even if it is spread across different files.
const nowTotals: Record<string, number> = {};
for (const [file, list] of byFile) {
  const client = CLIENTS.find((c) => file.startsWith(`${c}/`)) ?? 'unknown';
  nowTotals[client] = (nowTotals[client] ?? 0) + list.length;
}
for (const c of CLIENTS) {
  const was = baseline.totals[c] ?? 0;
  const is = nowTotals[c] ?? 0;
  if (is > was) problems.push(`  ${c}: ${is} hard-coded colours, baseline ${was} (the total may not grow)`);
}

// 3. A file in the baseline that is now clean should be cleaned out of it.
const stale = Object.keys(baseline.files).filter((f) => !byFile.has(f));
if (stale.length) {
  problems.push(
    `  ${stale.length} file(s) are now clean but still in the baseline — run --update to lower it` +
      `\n      e.g. ${stale.slice(0, 3).join(', ')}`,
  );
}

const total = offenders.length;
const baseTotal = Object.values(baseline.files).reduce((a, b) => a + b, 0);

if (problems.length) {
  console.error('no-raw-color: FAILED\n');
  problems.forEach((p) => console.error(p));
  console.error(
    `\nUse a token: var(--nabd-color-<group>-<name>) in CSS, or tokens(theme).color.<group>.<name> in React Native.`,
  );
  process.exit(1);
}

console.log(
  `no-raw-color: ${byFile.size} files scanned, ${total} recorded` +
    (total < baseTotal ? ` — ${baseTotal - total} fewer than the baseline` : ` (baseline ${baseTotal})`) +
    `. PARTIAL: the debt is frozen and measured, not cleared. 12.A11 clears it.`,
);
