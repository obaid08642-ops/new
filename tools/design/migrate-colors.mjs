#!/usr/bin/env node
/**
 * 12.A11 — replace raw colour literals with the token that already defines them.
 *
 * 4,404 raw colours remain across 556 files. This clears the subset where a screen
 * re-typed a value the token layer already owns, and refuses everything else.
 *
 * The distinction is the whole design. An EXACT match is not a judgement: the
 * value is already in `tokens.json`, the screen simply restated it, and replacing
 * one with the other changes nothing visible while making the number auditable. A
 * NEAR match is a design decision — `#B8E030` is not `accent.lime` (`#D7FF00`),
 * they are the same hue family from two different generations, and quietly
 * swapping one for the other would be exactly the kind of change nobody asked for
 * and nobody reviews.
 *
 * So: exact only. Everything within a small distance is listed and left alone, and
 * the list is the A11 worklist.
 *
 *   node tools/design/migrate-colors.mjs [pathPrefix ...]   # migrate
 *   node tools/design/migrate-colors.mjs --dry              # report only
 *   node tools/design/migrate-colors.mjs --all              # every client
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const ALL = argv.includes('--all');
const PREFIXES = argv.filter((a) => !a.startsWith('--'));

const tokens = JSON.parse(readFileSync(join(REPO, 'packages/design-tokens/tokens.json'), 'utf8'));

/** hex -> the CSS custom property the generator emits for it. */
const EXACT = new Map();
const walk = (o, p = '') => {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue;
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && 'light' in v) {
      for (const mode of ['light', 'dark']) {
        const hex = String(v[mode]).toLowerCase();
        // First writer wins: the token layer is authored light-first, so a value
        // shared by two paths resolves to the more general one.
        if (!EXACT.has(hex)) EXACT.set(hex, `--nabd-${key}-${mode}`);
      }
    } else if (v && typeof v === 'object') {
      walk(v, key);
    }
  }
};
walk(tokens.color);

const CLIENTS = ['patient-web/app', 'patient-app', 'admin/src', 'provider-app/src'];
const files = [];
const collect = (dir) => {
  if (!dir) return;
  const abs = join(REPO, dir);
  const rec = (d) => {
    for (const e of readdirSync(d)) {
      // Generated mirrors are a copy of packages/ui; editing them here would be
      // overwritten by the next sync and would make the mirror's staleness check
      // report a difference that was never made in the source.
      if (e === 'node_modules' || e === 'dist' || e === '.next' || e === 'ui-generated') continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) rec(p);
      else if (/\.(tsx|ts)$/.test(p)) files.push(p);
    }
  };
  rec(abs);
};
if (ALL) CLIENTS.forEach(collect);
else PREFIXES.forEach(collect);

const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const norm = (h) => (h.length === 3 ? h.replace(/./g, (c) => c + c) : h).toLowerCase();

let filesTouched = 0;
let literalsReplaced = 0;
const nearMisses = [];

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(REPO, file);
  let changed = 0;

  const out = src.replace(HEX, (whole) => {
    const h = norm(whole.slice(1));
    const varName = EXACT.get(`#${h}`);
    if (varName) {
      changed++;
      return `var(${varName})`;
    }
    return whole;
  });

  if (changed) {
    literalsReplaced += changed;
    filesTouched++;
    if (!DRY) writeFileSync(file, out, 'utf8');
  }

  // Everything still raw, for the worklist. Grouped so the report is a plan.
  for (const m of out.matchAll(HEX)) nearMisses.push(`${rel} ${m[0]}`);
}

console.log(
  `${DRY ? '[dry] would replace' : 'replaced'}: ${literalsReplaced} literal(s) across ` +
    `${filesTouched} file(s).`,
);
console.log(`still raw (the A11 worklist): ${nearMisses.length}`);
if (nearMisses.length) {
  const byHex = new Map();
  for (const line of nearMisses) {
    const hex = line.slice(line.lastIndexOf(' ') + 1).toLowerCase();
    byHex.set(hex, (byHex.get(hex) || 0) + 1);
  }
  const top = [...byHex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log('  most common un-tokened values:');
  for (const [hex, n] of top) {
    const near = [...EXACT.keys()]
      .map((t) => [t, rgbDistance(t, hex)])
      .sort((a, b) => a[1] - b[1])[0];
    console.log(
      `    ${hex} x${n}` + (near && near[1] < 60 ? `   (near ${near[0]}, d=${near[1]})` : ''),
    );
  }
}

function rgbDistance(a, b) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return Math.round(Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2));
}
