#!/usr/bin/env node
// Translation coverage of the catalogue seed data (owner request 2026-10-23).
//
// For each catalogue (medicines, labs, packages, radiology, nursing, specialties, insurance companies) and each of the
// six locales (ar, en, ur, hi, bn, fil) it counts, per user-visible field, the rows that are
//   missing        the field is absent
//   empty          the field is present but blank (or an empty list)
//   english_left   a non-English locale still holds English text (ur/hi/bn: no character of the locale's script;
//                  fil: identical to the English value), unless the row is in tools/catalog/translation-allowlist.json
//                  (brand names, acronyms and loanwords that the target language keeps)
//   placeholder    a machine/placeholder value (TODO, report only, the row code, ...)
//
// Data read (never the database): backend/src/modules/catalogs/seed-data/*.json. Medicines have no seed file
// (SEED_MEDICINES is empty); their gap is read from data/catalogue-input-01/untranslated.csv and reported as such.
//
// Usage: node tools/catalog/translation-coverage.mjs [--json] [--md <file>] [--check]
//   --check exits 1 when any gap is left (CI use). Field names follow the database: name_ur, name_hi, name_bn, name_tl
//   (fil is stored as `tl`), description_<l>, preparation_<l>.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const seedDir = path.join(root, 'backend/src/modules/catalogs/seed-data');
const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const suffix = (l) => (l === 'fil' ? 'tl' : l);
const SCRIPT = {
  ar: /[؀-ۿ]/, ur: /[؀-ۿ]/, hi: /[ऀ-ॿ]/, bn: /[ঀ-৿]/,
};
const allow = JSON.parse(fs.readFileSync(path.join(root, 'tools/catalog/translation-allowlist.json'), 'utf8'));
const read = (f) => JSON.parse(fs.readFileSync(path.join(seedDir, f), 'utf8'));

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9؀-ۿऀ-ॿঀ-৿]+/g, '');
const isBlank = (v) => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.every((x) => !String(x ?? '').trim()));
const flat = (v) => (Array.isArray(v) ? v.join(' | ') : String(v ?? ''));
const PLACEHOLDER = /^(todo|tbd|n\/a|na|\(report only\)|translate|xxx|lorem.*)$/i;

// field -> { get(row, locale) , enOf(row) } per catalogue
const nameOf = (row, l) => {
  if (l === 'ar') return row.name_ar;
  if (l === 'en') return row.name_en;
  return row[`name_${suffix(l)}`];
};
const textOf = (prefix) => (row, l) => row[`${prefix}_${suffix(l)}`];

const CATALOGUES = [
  { key: 'labs', file: 'labs.json', filter: (r) => r.is_package !== true, id: (r) => r.short_code || r.code || r.name_en,
    fields: { name: nameOf, description: textOf('description'), preparation: textOf('preparation') } },
  { key: 'packages', file: 'labs.json', filter: (r) => r.is_package === true, id: (r) => r.short_code || r.name_en,
    fields: { name: nameOf, description: textOf('description'), preparation: textOf('preparation') } },
  { key: 'radiology', file: 'radiology.json', id: (r) => r.short_code || r.name_en,
    fields: { name: nameOf, description: textOf('description'), preparation: textOf('preparation') } },
  { key: 'nursing', file: 'nursing.json', id: (r) => r.code || r.id || r.name_en,
    fields: { name: nameOf, description: textOf('description') } },
  { key: 'specialties', file: 'specialties.json', id: (r) => r.code, fields: { name: nameOf } },
  { key: 'insurance', file: 'insurance.json', id: (r) => r.code,
    fields: {
      name: nameOf, description: textOf('description'),
      // plan (tier) names are shown to patients too
      plan_names: (row, l) => (row.plans || []).map((p) => (l === 'ar' ? p.name_ar : l === 'en' ? p.name_en : p[`name_${suffix(l)}`])),
    } },
];

function check(cat, row, field, locale, value) {
  const id = String(cat.id(row));
  if (value === undefined) return 'missing';
  if (isBlank(value) || (Array.isArray(value) && value.some((x) => !String(x ?? '').trim()))) return 'empty';
  const text = flat(value);
  if (PLACEHOLDER.test(text.trim()) || (field === 'name' && locale !== 'ar' && norm(text) === norm(row.code || row.short_code) && locale !== 'en' && norm(text).length > 0 && /^[a-z0-9_]+$/.test(text.trim()))) return 'placeholder';
  if (locale === 'en' && field === 'name' && row.code && text.trim() === row.code) return 'placeholder';
  const entry = [...(allow[cat.key]?.[id] || []), ...(allow[cat.key]?.[row.name_en] || []), ...(allow[cat.key]?.['*'] || [])];
  const allowed = entry.includes(`${field}.${locale}`) || entry.includes(`${field}.*`);
  if (allowed) return null;
  if (locale === 'ar' && !SCRIPT.ar.test(text)) return 'english_left';
  if (['ur', 'hi', 'bn'].includes(locale) && !SCRIPT[locale].test(text)) return 'english_left';
  if (locale === 'fil') {
    const en = cat.fields[field](row, 'en');
    if (en !== undefined && norm(flat(en)) === norm(text)) return 'english_left';
  }
  return null;
}

const out = { generated_by: 'tools/catalog/translation-coverage.mjs', source: 'backend/src/modules/catalogs/seed-data', catalogues: {}, medicines: {} };
let gaps = 0;
for (const cat of CATALOGUES) {
  const rows = read(cat.file).filter(cat.filter || (() => true));
  const res = { rows: rows.length, locales: {}, examples: [] };
  for (const l of LOCALES) {
    const r = { rows_ok: 0, missing: 0, empty: 0, english_left: 0, placeholder: 0, by_field: {} };
    for (const row of rows) {
      let rowOk = true;
      for (const [field, get] of Object.entries(cat.fields)) {
        // an optional field is checked only where the English (or Arabic) value exists
        const base = get(row, 'en') ?? get(row, 'ar');
        if (field !== 'name' && (base === undefined || isBlank(base))) continue;
        let v = get(row, l);
        if (field === 'plan_names') {
          const vals = Array.isArray(v) ? v : [];
          for (let i = 0; i < vals.length; i++) {
            const st = check(cat, row, field, l, vals[i] === undefined ? undefined : vals[i]);
            if (st) { rowOk = false; r[st]++; r.by_field[field] = (r.by_field[field] || 0) + 1; if (res.examples.length < 400) res.examples.push({ id: String(cat.id(row)), locale: l, field: `${field}[${i}]`, status: st }); }
          }
          continue;
        }
        const st = check(cat, row, field, l, v);
        if (st) { rowOk = false; r[st]++; r.by_field[field] = (r.by_field[field] || 0) + 1; if (res.examples.length < 400) res.examples.push({ id: String(cat.id(row)), locale: l, field, status: st }); }
      }
      if (rowOk) r.rows_ok++;
    }
    gaps += r.missing + r.empty + r.english_left + r.placeholder;
    res.locales[l] = r;
  }
  out.catalogues[cat.key] = res;
}

// Medicines: no seed file. The reviewed untranslated list is the evidence.
const csv = path.join(root, 'data/catalogue-input-01/untranslated.csv');
out.medicines = { seed_file: null, note: 'No medicines seed file exists (SEED_MEDICINES is empty); the catalogue is production data. Coverage cannot be computed on seed data; the reviewed gap list is data/catalogue-input-01/untranslated.csv.', untranslated_csv: {} };
if (fs.existsSync(csv)) {
  const lines = fs.readFileSync(csv, 'utf8').trim().split('\n').slice(1);
  for (const line of lines) {
    const m = line.match(/,(names\.(\w+)\.(name|official_name)),/);
    if (m) { const k = `${m[2]}.${m[3]}`; out.medicines.untranslated_csv[k] = (out.medicines.untranslated_csv[k] || 0) + 1; }
  }
}
out.total_gaps = gaps;

const args = process.argv.slice(2);
function markdown() {
  const L = [];
  L.push('# Catalogue translation coverage', '', `Generated by \`node tools/catalog/translation-coverage.mjs\` from \`${out.source}\`. Total gaps on seed data: **${gaps}**.`, '',
    'Statuses: `missing` field absent, `empty` blank, `english_left` English text in a non-English locale (brand names and acronyms are listed in `tools/catalog/translation-allowlist.json`), `placeholder` machine/placeholder value. A row is "ok" when none of its checked fields has a gap in that locale.', '');
  for (const [k, c] of Object.entries(out.catalogues)) {
    L.push(`## ${k} (${c.rows} rows)`, '', '| locale | rows ok | missing | empty | english_left | placeholder |', '|---|---|---|---|---|---|');
    for (const l of LOCALES) { const r = c.locales[l]; L.push(`| ${l} | ${r.rows_ok}/${c.rows} | ${r.missing} | ${r.empty} | ${r.english_left} | ${r.placeholder} |`); }
    L.push('');
  }
  L.push('## medicines', '', out.medicines.note, '');
  const u = out.medicines.untranslated_csv;
  if (Object.keys(u).length) { L.push('| field | rows still untranslated |', '|---|---|'); for (const [k, n] of Object.entries(u)) L.push(`| ${k} | ${n} |`); L.push(''); }
  return L.join('\n');
}
if (args.includes('--md')) fs.writeFileSync(path.resolve(args[args.indexOf('--md') + 1]), markdown());
if (args.includes('--json')) console.log(JSON.stringify(out, null, 2));
else if (!args.includes('--md')) console.log(markdown());
if (args.includes('--check') && gaps > 0) { console.error(`translation coverage: ${gaps} gaps`); process.exit(1); }
