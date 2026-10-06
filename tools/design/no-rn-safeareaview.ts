/**
 * no-rn-safeareaview — handoff §6 and DEVICE_STANDARD §5 (React Native).
 *
 * 1. STRICT: `SafeAreaView` imported from `react-native` is banned. It only pads
 *    on iOS (and only for the notch), so on Android the content runs under the
 *    status bar and the gesture bar. Use the shells (packages/ui-native/src/shells)
 *    or `react-native-safe-area-context`. The three uses found when the gate
 *    landed (patient-app room/[id], provider-app SuccessScreen and
 *    SignatureCanvasModal) were moved in the same change.
 *
 * 2. RATCHET: `Dimensions.get(...)` for layout. It is read once and goes stale on
 *    rotation, split screen and foldables; `useWindowDimensions()` re-renders.
 *    The uses that existed when the gate landed are recorded per file in
 *    `no-rn-safeareaview.baseline.json`; the count may only go down.
 *
 * Not counted: comments, *.test.* / *.spec.* files.
 *
 * Run:  node tools/design/no-rn-safeareaview.ts [--init | --update]
 * Exit: 0 = clean / within the baseline, 1 = a SafeAreaView import, or a new Dimensions.get.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASELINE_PATH = join(HERE, 'no-rn-safeareaview.baseline.json');

const TARGETS = ['patient-app', 'provider-app', 'packages/ui-native'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.expo', 'android', 'ios', 'assets']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(extname(full))) yield full;
  }
}

const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const isTestFile = (file: string) => /\.(test|spec)\.[jt]sx?$/.test(file) || /[\\/]__tests__[\\/]/.test(file);

/** Every `import { … } from 'react-native'` (one line or several) that names SafeAreaView. */
const RN_IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]react-native['"]/g;
const DIMENSIONS_GET = /\bDimensions\.get\s*\(/g;

const banned: string[] = [];
const dims: Record<string, number> = {};
let scanned = 0;

for (const target of TARGETS) {
  const base = join(ROOT, target);
  if (!existsSync(base)) {
    console.error(`no-rn-safeareaview: ${target} does not exist.`);
    process.exit(1);
  }
  for (const file of walk(base)) {
    if (isTestFile(file)) continue;
    scanned += 1;
    const src = stripComments(readFileSync(file, 'utf8'));
    const rel = relative(ROOT, file);
    for (const m of src.matchAll(RN_IMPORT)) {
      if (/\bSafeAreaView\b/.test(m[1])) {
        const line = src.slice(0, m.index).split('\n').length;
        banned.push(`  ${rel}:${line}  SafeAreaView imported from react-native`);
      }
    }
    const n = [...src.matchAll(DIMENSIONS_GET)].length;
    if (n) dims[rel] = n;
  }
}

const total = Object.values(dims).reduce((a, b) => a + b, 0);
const recorded = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : null;
const baseline: Record<string, number> = recorded?.dimensionsGet ?? {};
const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);

const INIT = process.argv.includes('--init');
if (INIT || process.argv.includes('--update')) {
  if (banned.length) {
    console.error(`no-rn-safeareaview: fix the SafeAreaView import(s) first; there is no baseline for them:\n${banned.join('\n')}`);
    process.exit(1);
  }
  if (!INIT && total > baselineTotal) {
    console.error(`no-rn-safeareaview: refusing to raise the Dimensions.get baseline from ${baselineTotal} to ${total}.`);
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.entries(dims).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $comment:
          'Recorded debt for tools/design/no-rn-safeareaview.ts: Dimensions.get() calls, per file, when ' +
          'the gate landed. Each moves to useWindowDimensions() (or a shell) as its screen is rebuilt; ' +
          'this file may only shrink. SafeAreaView from react-native has no baseline: it is banned outright.',
        total,
        dimensionsGet: sorted,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`no-rn-safeareaview: Dimensions.get baseline ${INIT ? 'recorded' : `${baselineTotal} ->`} ${total} in ${Object.keys(sorted).length} file(s).`);
  process.exit(0);
}

const regressions = Object.entries(dims).filter(([file, n]) => n > (baseline[file] ?? 0));
if (banned.length || regressions.length) {
  if (banned.length) {
    console.error(`no-rn-safeareaview FAILED — SafeAreaView from react-native (iOS-only insets):\n${banned.join('\n')}`);
    console.error('Use the shells (<Screen>, <AppHeader>, <StickyFooter>) or react-native-safe-area-context.\n');
  }
  if (regressions.length) {
    console.error(
      `no-rn-safeareaview FAILED — new Dimensions.get() for layout (baseline ${baselineTotal}, now ${total}):\n` +
        regressions.map(([file, n]) => `  ${file}: ${n}, baseline allows ${baseline[file] ?? 0}`).join('\n'),
    );
    console.error('Use useWindowDimensions(), which follows rotation, split screen and foldables.');
  }
  process.exit(1);
}
const cleared = baselineTotal - total;
console.log(
  `no-rn-safeareaview: ${scanned} native files scanned. No SafeAreaView from react-native; ` +
    `Dimensions.get ${total} recorded, none added (baseline ${baselineTotal}${cleared > 0 ? `, ${cleared} cleared — run --update` : ''}).`,
);
