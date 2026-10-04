#!/usr/bin/env node
/**
 * 12.A11 — replace raw colour literals with the token that owns them.
 *
 * REPAIRED, and **not to be run on screens.** It exists for the future, and every
 * default is refusal.
 *
 * What went wrong the first time, because the first version is the reason this
 * header is long:
 *
 *   1. It invented variable names. The generator is the only authority —
 *      `cssVarName(path) => \`--${PREFIX}${path.replace(/\./g, '-')}\`` — and the
 *      first version wrote `--nabd-bg.surface-light`: no `color-` prefix, dots left
 *      in, and a light/dark suffix that does not exist. 1,125 references shipped to
 *      that, including React Native files where a CSS custom property is not a
 *      colour. Every one resolved to nothing, so each colour fell back to whatever
 *      it inherited, and nothing errored.
 *   2. It mapped by VALUE. `#FFFFFF` became whichever token happened to hold white
 *      first — `bg.surface` — so white button text was rewritten as a *surface*.
 *      A colour is not a role. `#FFFFFF` on a button label is `action.fg`; the same
 *      hex on a card is `bg.surface`. Only the call site knows which.
 *   3. It committed "zero visual change" without a way to check that, which is how
 *      a 242-file commit passed 430/430 and broke every colour on the site.
 *
 * So this version refuses on three axes instead of guessing on any of them:
 *
 *   - **Names** come from the generator, read out of the built CSS. Never composed.
 *   - **Roles** must be declared. With no role, a value is left alone even when it
 *     matches exactly, because an exact match proves the colour is shared, not that
 *     the role is.
 *   - **Platform** is checked: React Native gets the TS token module, because a
 *     `var(--nabd-…)` string is not a colour there.
 *
 * Usage, once a caller has decided the roles for a specific site:
 *
 *   node tools/design/migrate-colors.mjs --role button-primary-bg=<file>:<line>
 *
 * `--list` prints the raw literals in a file with their nearest token and distance,
 * which is the useful output today and the only output this script should produce
 * until someone decides the roles.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const LIST = argv.includes('--list');

if (!LIST && argv.length === 0) {
  console.error(
    'migrate-colors: refusing to run.\n' +
      '  This tool damaged 1,125 references the first time it ran unattended. It now\n' +
      '  requires an explicit --role per site, because a colour does not know its own\n' +
      '  role and a value match is not a role.\n\n' +
      '  Use `--list <file>` to see the literals and their nearest tokens.\n' +
      '  Use `--role <token-path>=<file>:<line>` for a site whose role you have decided.\n' +
      '  Never with `--all`.',
  );
  process.exit(2);
}

const tokens = JSON.parse(readFileSync(join(REPO, 'packages/design-tokens/tokens.json'), 'utf8'));
const BUILT = join(REPO, 'packages/design-tokens/dist/css/tokens.css');

/** The generator's own name for a token path. Composed, never guessed. */
const cssVarName = (path) => {
  const built = existsSync(BUILT) ? readFileSync(BUILT, 'utf8') : '';
  const name = `--nabd-${path.replace(/\./g, '-')}`;
  if (built && !built.includes(`${name}:`)) {
    throw new Error(
      `migrate-colors: "${name}" is not in the built token CSS.\n` +
        `  The generator emitted "--nabd-color-${path.replace(/\./g, '-')}" or a\n` +
        `  light/dark pair chosen by the theme selector. Check cssVarName() in build.mjs\n` +
        `  and the actual name in dist/css/tokens.css rather than composing one here.`,
    );
  }
  return name;
};

const isNative = (f) => /\/(patient-app|provider-app)\//.test(f);

const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const norm = (h) => (h.length === 3 ? h.replace(/./g, (c) => c + c) : h).toLowerCase();

const hexOf = (v) => {
  if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (v && typeof v === 'object' && 'light' in v && /^#[0-9a-f]{6}$/i.test(String(v.light)))
    return String(v.light).toLowerCase();
  return null;
};

function walk(o, p = '') {
  const out = [];
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    const key = p ? `${p}.${k}` : k;
    // A `{ light, dark }` pair is ONE token with two values, not a container of two
    // tokens. Descending into it produced paths like `bg.surface.light`, so the
    // token a caller actually wants — `bg.surface` — did not exist and every role
    // was rejected. The theme selector chooses the mode; the name does not change.
    if (v && typeof v === 'object' && !('light' in v)) out.push(...walk(v, key));
    else out.push([key, v]);
  }
  return out;
}

const candidates = walk(tokens.color)
  .map(([path, v]) => [path, hexOf(v)])
  .filter(([, hex]) => hex);

const distance = (a, b) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return Math.round(Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2));
};

if (LIST) {
  const file = resolve(REPO, argv[argv.indexOf('--list') + 1]);
  const src = readFileSync(file, 'utf8');
  console.log(`${relative(REPO, file)} — ${isNative(file) ? 'React Native: needs the TS token module, not a CSS var' : 'web'}`);
  const seen = new Set();
  for (const m of src.matchAll(HEX)) {
    const hex = `#${norm(m[1])}`;
    if (seen.has(hex)) continue;
    seen.add(hex);
    const near = candidates
      .map(([path, h]) => [path, distance(h, hex)])
      .sort((a, b) => a[1] - b[1])[0];
    console.log(
      `  ${hex}  x${(src.match(new RegExp(hex, 'gi')) || []).length}  ` +
        (near && near[1] === 0
          ? `EXACT match to color.${near[0]} — role unknown, decide it before writing`
          : `nearest color.${near[0]} (d=${near[1]}) — a design decision, not an edit`),
    );
  }
  process.exit(0);
}

// --role <token-path>=<file>:<line>
// `--role <path>=<file>:<line>` and `--role=<path>=<file>:<line>` are both accepted.
// The first version only handled the second form and crashed on the first, which
// is the form printed in the header above it.
const roleArgs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--role' && argv[i + 1]) roleArgs.push(argv[++i]);
  else if (argv[i].startsWith('--role=')) roleArgs.push(argv[i].replace(/^--role=/, ''));
}

const sites = roleArgs
  .filter(Boolean)
  .map((spec) => {
    const [tokenPath, loc] = spec.split('=');
    const [file, line] = loc.split(':');
    return { raw: spec, tokenPath, file, line: Number(line) };
  });

for (const site of sites) {
  if (!site.tokenPath || !site.file || !Number.isFinite(site.line)) {
    console.error(`migrate-colors: cannot read --role "${site.raw}". Expected <token-path>=<file>:<line>`);
    process.exit(2);
  }
}

if (!sites.length) {
  console.error('migrate-colors: no --role given, so nothing was written.');
  process.exit(2);
}

let written = 0;
for (const site of sites) {
  const abs = resolve(REPO, site.file);
  const lines = readFileSync(abs, 'utf8').split('\n');
  const idx = site.line - 1;
  if (idx < 0 || idx >= lines.length) {
    console.error(`migrate-colors: ${site.file}:${site.line} is out of range.`);
    process.exit(1);
  }
  const tokenValue = candidates.find(([p]) => p === site.tokenPath);
  if (!tokenValue) {
    console.error(`migrate-colors: no such token: color.${site.tokenPath}`);
    process.exit(1);
  }
  const hex = tokenValue[1];
  const line = lines[idx];
  if (!new RegExp(HEX.source, 'i').test(line)) {
    console.error(
      `migrate-colors: ${site.file}:${site.line} has no literal, so color.${site.tokenPath} was not what you meant.`,
    );
    process.exit(1);
  }
  const replacement = isNative(abs)
    ? `tokens.color.${site.tokenPath.replace(/\./g, '')}`
    : `var(${cssVarName(`color.${site.tokenPath}`)})`;
  lines[idx] = line.replace(HEX, replacement);
  writeFileSync(abs, lines.join('\n'), 'utf8');
  written++;
  console.log(
    `  ${site.file}:${site.line}  #${hex.slice(1)} -> color.${site.tokenPath}  (${
      isNative(abs) ? 'TS token' : 'CSS var'
    })`,
  );
}

console.log(
  `migrate-colors: ${written} declared site(s). Every one named its role; nothing was inferred.`,
);