/*
 * P5.1: migrate static catalog JSONs into canonical DB collections (insert-only).
 * Source: backend/src/modules/catalogs/seed-data/{labs,radiology,nursing,insurance}.json
 * Targets: labservices (key test_code), radiologyservices (key short_code),
 *          nursing_catalog (key id), insurancecompanies (key code) +
 *          insurance_networks (per plan tier).
 * Items missing a natural key get a slug from name_en (logged).
 * Never overwrites admin edits ($setOnInsert only).
 *
 * DEFAULT IS DRY-RUN. Apply: node scripts/migrations/2026-09-catalog-json-to-db.ts --apply
 * Requires MONGODB_URI.
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DRY = !process.argv.includes('--apply');
const DIR = path.join(__dirname, '../../src/modules/catalogs/seed-data');
const load = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'item';

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const report = {};

  // labs
  {
    // backfill test_code on legacy seed docs (they carry short_code only) so
    // the upserts below match instead of duplicating.
    if (!DRY) {
      const olds = await db.collection('labservices').find({ test_code: { $exists: false }, short_code: { $exists: true } }).toArray();
      for (const o of olds) {
        await db.collection('labservices').updateOne({ _id: o._id }, { $set: { test_code: o.short_code } });
      }
      if (olds.length) console.log(JSON.stringify({ backfilled_test_code: olds.length }));
    }
    const items = load('labs.json');
    let ins = 0, skip = 0;
    for (const x of items) {
      const code = x.short_code || slug(x.name_en);
      const doc = { ...x, test_code: code, id: x.id || code };
      const r = DRY ? null : await db.collection('labservices').updateOne({ test_code: code }, { $setOnInsert: doc }, { upsert: true });
      if (!DRY && (r.upsertedCount || r.upsertedId)) ins++; else if (DRY) skip++;
    }
    report.labs = { json: items.length, inserted: DRY ? '(dry)' : ins };
  }
  // radiology
  {
    const items = load('radiology.json');
    let ins = 0;
    for (const x of items) {
      const code = x.short_code || slug(x.name_en);
      const doc = { ...x, id: x.id || code };
      const r = DRY ? null : await db.collection('radiologyservices').updateOne({ short_code: code }, { $setOnInsert: doc }, { upsert: true });
      if (!DRY && (r.upsertedCount || r.upsertedId)) ins++;
    }
    report.radiology = { json: items.length, inserted: DRY ? '(dry)' : ins };
  }
  // nursing
  {
    const items = load('nursing.json');
    let ins = 0;
    for (const x of items) {
      const id = x.id || slug(x.name_en);
      const doc = { ...x, id, code: x.code || id };
      const r = DRY ? null : await db.collection('nursing_catalog').updateOne({ id }, { $setOnInsert: doc }, { upsert: true });
      if (!DRY && (r.upsertedCount || r.upsertedId)) ins++;
    }
    report.nursing = { json: items.length, inserted: DRY ? '(dry)' : ins };
  }
  // insurance companies + networks from tiers
  {
    const items = load('insurance.json');
    let cins = 0, nins = 0;
const { v4: uuid } = require('uuid');
    for (const x of items) {
      const code = x.code;
      let co = await db.collection('insurancecompanies').findOne({ code });
      if (!co && !DRY) {
        const cdoc = { id: uuid(), code, name_ar: x.name_ar, name_en: x.name_en, logo_url: x.image_url, is_active: x.is_active !== false, catalog_status: 'pending_review', provenance: 'json-migration' };
        const r = await db.collection('insurancecompanies').updateOne({ code }, { $setOnInsert: cdoc }, { upsert: true });
        if (r.upsertedCount || r.upsertedId) cins++;
        co = await db.collection('insurancecompanies').findOne({ code });
      }
      for (const t of x.plans || []) {
        const nid = `${code}-tier-${t.tier_level}`;
        const ndoc = { id: uuid(), company_id: co?.id || code, code: `tier-${t.tier_level}`, name_ar: t.name_ar, name_en: t.name_en, tier_level: t.tier_level, catalog_status: 'pending_review', provenance: 'json-migration' };
        if (!DRY) {
          const r = await db.collection('insurance_networks').updateOne({ company_id: ndoc.company_id, code: ndoc.code }, { $setOnInsert: ndoc }, { upsert: true });
          if (r.upsertedCount || r.upsertedId) nins++;
        }
      }
    }
    report.insurance = { json: items.length, companies_inserted: DRY ? '(dry)' : cins, networks_inserted: DRY ? '(dry)' : nins };
  }
  console.log(JSON.stringify({ dry_run: DRY, ...report }, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
