#!/usr/bin/env node
/**
 * Translation coverage gate (12.A4).
 *
 * A missing key is not a crash in next-intl. It renders the KEY ITSELF. The
 * runtime contrast audit found `NursingCatalog.emptyBody` sitting on a public
 * page at 4.42:1, in plain text, on the nursing catalogue — a namespace that
 * had `empty` and `unavailableBody` but not `emptyBody`.
 *
 * That is the whole failure mode of this class: nothing throws, nothing warns,
 * and the user reads "NursingCatalog.emptyBody". So it is checked here instead.
 *
 * `en.json` is the reference: every namespace and key that exists there must
 * exist in every other locale. Extra keys in a translation are reported too,
 * because an orphan usually means a key was renamed on one side only.
 *
 * Usage: node tools/design/i18n-coverage.mjs [--dir patient-web/messages]
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const argv = process.argv.slice(2);
const argOf = (n, d) => {
  const i = argv.indexOf(n);
  return i === -1 ? d : argv[i + 1];
};
const DIR = resolve(REPO, argOf('--dir', 'patient-web/messages'));
const REFERENCE = argOf('--reference', 'en');

/** Flatten {a:{b:"x"}} to {"a.b":"x"}. */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

if (!existsSync(DIR)) {
  console.error(`i18n-coverage: ${DIR} does not exist.`);
  process.exit(2);
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
if (!files.length) {
  console.error(`i18n-coverage: no locale files in ${DIR}.`);
  process.exit(2);
}

const refFile = `${REFERENCE}.json`;
if (!files.includes(refFile)) {
  console.error(`i18n-coverage: reference locale ${refFile} is missing.`);
  process.exit(2);
}

const reference = flatten(JSON.parse(readFileSync(join(DIR, refFile), 'utf8')));
const refKeys = Object.keys(reference).sort();
console.log(`i18n-coverage: reference ${refFile} has ${refKeys.length} keys.`);

let failed = 0;
const rows = [];

for (const file of files) {
  if (file === refFile) continue;
  const locale = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const flat = flatten(locale);

  const missing = refKeys.filter((k) => !(k in flat));
  // A key present but empty string is just as broken as an absent one.
  const empty = refKeys.filter((k) => k in flat && flat[k] === '');
  const extra = Object.keys(flat).filter((k) => !(k in reference));

  rows.push({ locale: file.replace(/\.json$/, ''), total: Object.keys(flat).length, missing, empty, extra });

  if (missing.length || empty.length) {
    failed++;
    console.error(`\n${file}:`);
    if (missing.length) {
      console.error(`  ${missing.length} MISSING key(s) — these render as the raw key:`);
      missing.slice(0, 12).forEach((k) => console.error(`    ${k}`));
      if (missing.length > 12) console.error(`    ... +${missing.length - 12} more`);
    }
    if (empty.length) {
      console.error(`  ${empty.length} EMPTY value(s):`);
      empty.slice(0, 8).forEach((k) => console.error(`    ${k}`));
      if (empty.length > 8) console.error(`    ... +${empty.length - 8} more`);
    }
  }
  if (extra.length) {
    console.error(`  note: ${file} has ${extra.length} key(s) not in ${refFile} (orphans):`);
    extra.slice(0, 6).forEach((k) => console.error(`    ${k}`));
    if (extra.length > 6) console.error(`    ... +${extra.length - 6} more`);
  }
}

console.log('');
for (const r of rows) {
  const pct = ((1 - r.missing.length / refKeys.length) * 100).toFixed(2);
  const mark = r.missing.length || r.empty.length ? 'FAIL' : 'ok  ';
  console.log(`  ${mark} ${r.locale.padEnd(4)} ${String(r.total).padStart(5)} keys  ${pct}% coverage`);
}

if (failed) {
  console.error(`\ni18n-coverage: ${failed} locale(s) are incomplete. A missing key renders as the key itself.`);
  process.exit(1);
}
console.log('i18n-coverage: every locale covers every key.');
