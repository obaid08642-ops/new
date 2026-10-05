/**
 * no-large-raster — QUALITY_STANDARDS §1 (owner, 2026-10-05): a raster asset in the apps or in
 * patient-web/public may not exceed 200 KB. Photos and illustrations ship as WebP (AVIF on the
 * web); remote images go through the CDN at the displayed size.
 *
 * A RATCHET, like the other design gates: the files that were already over the limit when the
 * gate landed are recorded in no-large-raster.baseline.json and may only shrink or go away. A new
 * file over 200 KB, or a recorded one that grows, fails. `--update` rewrites the baseline and is
 * only correct when the list got shorter or smaller.
 *
 * Run:  node --experimental-strip-types tools/design/no-large-raster.ts [--update]
 * Exit: 0 = within the baseline, 1 = a new or larger raster asset.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BASELINE = join(HERE, 'no-large-raster.baseline.json');
const LIMIT = 200 * 1024;
const TARGETS = ['patient-app', 'provider-app', 'patient-web/public', 'admin/public'];
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif']);
const SKIP = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.expo', 'ios', 'android', '.turbo']);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (RASTER.has(extname(full).toLowerCase())) yield full;
  }
}

const found: Record<string, number> = {};
for (const target of TARGETS) {
  const base = join(ROOT, target);
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    const size = statSync(file).size;
    if (size > LIMIT) found[relative(ROOT, file)] = size;
  }
}

const baseline: Record<string, number> = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(Object.fromEntries(Object.entries(found).sort()), null, 2) + '\n');
  console.log(`no-large-raster: baseline written, ${Object.keys(found).length} file(s) over ${LIMIT / 1024} KB.`);
  process.exit(0);
}

const problems: string[] = [];
for (const [file, size] of Object.entries(found)) {
  const allowed = baseline[file];
  if (allowed === undefined) problems.push(`  ${file}: ${(size / 1024).toFixed(0)} KB — a new raster over ${LIMIT / 1024} KB`);
  else if (size > allowed) problems.push(`  ${file}: grew from ${(allowed / 1024).toFixed(0)} KB to ${(size / 1024).toFixed(0)} KB`);
}
const cleared = Object.keys(baseline).filter((f) => !(f in found)).length;

if (problems.length) {
  console.error(`no-large-raster FAILED:\n${problems.join('\n')}\n\nConvert photos and illustrations to WebP (AVIF on the web) at the displayed size, or serve them from the CDN.`);
  process.exit(1);
}
console.log(`no-large-raster: ${Object.keys(found).length} recorded over ${LIMIT / 1024} KB, none added${cleared ? ` (${cleared} cleared — run --update)` : ''}.`);
