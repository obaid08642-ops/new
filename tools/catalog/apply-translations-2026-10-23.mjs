#!/usr/bin/env node
// One-off, idempotent (2026-10-23): applies tools/catalog/translations-2026-10-23.json to the seed-data files and to
// services-content.v1.json (so the services-content migration carries the same Filipino names), and writes the
// insurance translations. Run after merge-content-into-seed.mjs. Usage: node tools/catalog/apply-translations-2026-10-23.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'backend/src/modules/catalogs');
const T = JSON.parse(fs.readFileSync(path.join(root, 'tools/catalog/translations-2026-10-23.json'), 'utf8'));
const load = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const save = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
const stat = {};

for (const f of ['labs', 'radiology', 'nursing', 'specialties']) {
  const p = path.join(dir, 'seed-data', `${f}.json`);
  const rows = load(p); let n = 0;
  for (const r of rows) {
    if (T.fil_names[r.name_en]) { r.name_tl = T.fil_names[r.name_en]; n++; }
    if (T.ar_names[r.name_en]) r.name_ar = T.ar_names[r.name_en];
    if (T.en_names[r.name_en]) r.name_en = T.en_names[r.name_en];
  }
  save(p, rows); stat[f] = n;
}

const cp = path.join(dir, 'content/services-content.v1.json');
const c = load(cp); let cn = 0;
for (const key of ['lab_services', 'radiology_services', 'nursing_services']) {
  for (const it of c[key]) {
    const en = it.match.names_en[0];
    if (T.fil_names[en]) { it.names.fil = T.fil_names[en]; cn++; }
    if (T.en_names[en]) it.match.names_en = [...new Set([...it.match.names_en, T.en_names[en]])];
  }
}
for (const it of c.specialties) if (T.fil_names[it.names.en]) { it.names.fil = T.fil_names[it.names.en]; cn++; }
save(cp, c); stat.content = cn;

const ip = path.join(dir, 'seed-data/insurance.json');
const ins = load(ip);
for (const x of ins) {
  const d = T.insurance.description[x.kind === 'tpa' ? 'tpa' : 'insurer'];
  if (x.kind === 'tpa') { x.description_ar = d.ar; x.description_en = d.en; }
  for (const l of ['ur', 'hi', 'bn', 'tl']) { x[`name_${l}`] = x.name_en; x[`description_${l}`] = d[l]; }
  for (const p of x.plans) {
    if (p.name_ar === 'VIP') p.name_ar = 'فئة VIP';
    const t = T.insurance.plans[p.name_en];
    if (!t) throw new Error(`no plan translation for ${p.name_en}`);
    for (const l of ['ur', 'hi', 'bn', 'tl']) p[`name_${l}`] = t[l];
  }
}
save(ip, ins); stat.insurance = ins.length;
console.log(JSON.stringify(stat));
