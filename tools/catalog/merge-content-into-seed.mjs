#!/usr/bin/env node
// One-off, idempotent: copies the published six-language content (services-content.v1.json) into the seed-data
// files as flat fields (name_ur/hi/bn/tl, description_<l>, preparation_<l>), the same fields the
// 2026-10-services-content migration writes to the database, so a fresh database seeded from seed-data is complete.
// Existing seed values (ar/en) are never overwritten. Usage: node tools/catalog/merge-content-into-seed.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'backend/src/modules/catalogs');
const content = JSON.parse(fs.readFileSync(path.join(dir, 'content/services-content.v1.json'), 'utf8'));
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const suffix = (l) => (l === 'fil' ? 'tl' : l);
const NEW = ['ur', 'hi', 'bn', 'fil'];

const matches = (row, item) => {
  const codes = new Set(item.match.codes);
  for (const k of ['short_code', 'test_code', 'code', 'id']) if (typeof row[k] === 'string' && codes.has(row[k])) return true;
  return item.match.names_en.map(norm).includes(norm(row.name_en));
};

const stats = {};
for (const [file, key] of [['labs.json', 'lab_services'], ['radiology.json', 'radiology_services'], ['nursing.json', 'nursing_services']]) {
  const p = path.join(dir, 'seed-data', file);
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  let touched = 0; const without = [];
  for (const row of rows) {
    const item = content[key].find((i) => matches(row, i));
    if (!item) { without.push(row.name_en); continue; }
    for (const l of NEW) row[`name_${suffix(l)}`] = item.names[l];
    for (const l of content.languages) {
      const s = suffix(l);
      if (row[`description_${s}`] === undefined || (l !== 'ar' && l !== 'en')) row[`description_${s}`] = item.description[l];
      if ((item.preparation[l] || []).length && (row[`preparation_${s}`] === undefined || (l !== 'ar' && l !== 'en'))) row[`preparation_${s}`] = item.preparation[l];
    }
    touched++;
  }
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n');
  stats[file] = { rows: rows.length, merged: touched, without_content: without };
}
{
  const p = path.join(dir, 'seed-data/specialties.json');
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  let touched = 0;
  for (const row of rows) {
    const it = content.specialties.find((s) => s.code === row.code);
    if (!it) continue;
    row.name_en = it.names.en; // the stored English name was only the code
    for (const l of NEW) row[`name_${suffix(l)}`] = it.names[l];
    touched++;
  }
  const have = new Set(rows.map((r) => r.code));
  const added = [];
  let sort = rows.reduce((m, r) => Math.max(m, r.sort || 0), 0);
  for (const it of content.specialties) {
    if (have.has(it.code) || !it.add) continue;
    const row = { id: `spec-${it.code}`, code: it.code, name_ar: it.names.ar, name_en: it.names.en, sort: ++sort, active: true };
    for (const l of NEW) row[`name_${suffix(l)}`] = it.names[l];
    rows.push(row); added.push(it.code);
  }
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n');
  stats['specialties.json'] = { rows: rows.length, merged: touched, added };
}
console.log(JSON.stringify(stats, null, 1));
