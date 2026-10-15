/*
 * P5.1: migrate static catalog JSONs into canonical DB collections (insert-only).
 * Source: backend/src/modules/catalogs/seed-data/{labs,radiology,nursing,insurance}.json
 * Targets: labservices (key test_code), radiologyservices (key short_code),
 *          nursing_catalog (key id), insurancecompanies (key code) +
 *          insurance_networks (per plan tier).
 * Items missing a natural key get a slug from name_en (logged).
 * Never overwrites admin edits ($setOnInsert only). An item matches an existing document by ANY of its natural
 * keys (labs: test_code, short_code or JSON id; radiology: short_code or JSON id), so a seed doc carrying the JSON id but another
 * code is left alone instead of failing the insert. Inserts that would repeat a unique value are skipped and counted
 * as `conflict` (the dry-run reports them too); the run never fails on E11000.
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

// Unique single-field indexes of a collection (besides _id): an insert that repeats one of these values fails with
// E11000, so every insert is checked against them first (production 2026-10-15: labservices already held seed docs
// with the JSON's `id` but no short_code/test_code, the upsert by test_code missed them and the insert hit id_1).
async function uniqueKeys(coll) {
  try {
    return (await coll.indexes()).filter((i) => i.unique && Object.keys(i.key).length === 1 && !i.key._id).map((i) => Object.keys(i.key)[0]);
  } catch {
    return []; // collection does not exist yet
  }
}

// Insert-only upsert of one JSON item. `keys` are the natural keys that identify the item ([field, value] pairs):
// a document matching ANY of them is the same item and is left untouched ($setOnInsert). Returns
// 'existing' | 'inserted' | 'would_insert' (dry-run) | 'conflict' (a unique value is taken by another document).
async function upsertOne(coll, uniques, keys, doc, seen) {
  const filter = { $or: keys.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => ({ [k]: v })) };
  const sig = JSON.stringify(filter);
  if (DRY && seen.has(sig)) return 'existing'; // a JSON duplicate of an item this run would already insert
  seen.add(sig);
  if (await coll.findOne(filter, { projection: { _id: 1 } })) return 'existing';
  for (const k of uniques) {
    if (doc[k] === undefined || doc[k] === null) continue;
    if (await coll.findOne({ [k]: doc[k] }, { projection: { _id: 1 } })) {
      console.log(JSON.stringify({ conflict: coll.collectionName, unique_key: k }));
      return 'conflict';
    }
  }
  if (DRY) return 'would_insert';
  const r = await coll.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
  return r.upsertedCount || r.upsertedId ? 'inserted' : 'existing';
}

function tally() {
  const t = { existing: 0, inserted: 0, would_insert: 0, conflict: 0 };
  return { t, add: (r) => { t[r] += 1; } };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const report = {};

  // labs: an item is the same as a document with its test_code, its short_code (legacy, before the backfill) OR its JSON id
  {
    const coll = db.collection('labservices');
    // backfill test_code on legacy seed docs (they carry short_code only) so they match by test_code
    const olds = await coll.countDocuments({ test_code: { $exists: false }, short_code: { $exists: true } });
    if (!DRY && olds) {
      const r = await coll.updateMany({ test_code: { $exists: false }, short_code: { $exists: true } }, [{ $set: { test_code: '$short_code' } }]);
      console.log(JSON.stringify({ backfilled_test_code: r.modifiedCount }));
    }
    const uniques = await uniqueKeys(coll);
    const items = load('labs.json');
    const { t, add } = tally();
    const seen = new Set();
    for (const x of items) {
      const code = x.short_code || slug(x.name_en);
      const doc = { ...x, test_code: code, id: x.id || code };
      add(await upsertOne(coll, uniques, [['test_code', code], ['short_code', code], ['id', doc.id]], doc, seen));
    }
    report.labs = { json: items.length, [DRY ? 'would_backfill_test_code' : 'backfilled_test_code']: olds, ...t };
  }
  // radiology: same item = same short_code OR same JSON id
  {
    const coll = db.collection('radiologyservices');
    const uniques = await uniqueKeys(coll);
    const items = load('radiology.json');
    const { t, add } = tally();
    const seen = new Set();
    for (const x of items) {
      const code = x.short_code || slug(x.name_en);
      const doc = { ...x, id: x.id || code };
      add(await upsertOne(coll, uniques, [['short_code', code], ['id', doc.id]], doc, seen));
    }
    report.radiology = { json: items.length, ...t };
  }
  // nursing: key id
  {
    const coll = db.collection('nursing_catalog');
    const uniques = await uniqueKeys(coll);
    const items = load('nursing.json');
    const { t, add } = tally();
    const seen = new Set();
    for (const x of items) {
      const id = x.id || slug(x.name_en);
      const doc = { ...x, id, code: x.code || id };
      add(await upsertOne(coll, uniques, [['id', id]], doc, seen));
    }
    report.nursing = { json: items.length, ...t };
  }
  // insurance companies (key code) + networks from tiers (key company_id + code)
  {
    const { v4: uuid } = require('uuid');
    const companies = db.collection('insurancecompanies');
    const networks = db.collection('insurance_networks');
    const cuniq = await uniqueKeys(companies);
    const items = load('insurance.json');
    const c = tally();
    let nins = 0, nexist = 0, nwould = 0;
    for (const x of items) {
      const code = x.code;
      let co = await companies.findOne({ code });
      if (co) c.add('existing');
      else {
        const cdoc = { id: uuid(), code, name_ar: x.name_ar, name_en: x.name_en, logo_url: x.image_url, is_active: x.is_active !== false, catalog_status: 'pending_review', provenance: 'json-migration' };
        c.add(await upsertOne(companies, cuniq, [['code', code]], cdoc, new Set()));
        co = await companies.findOne({ code });
      }
      for (const tr of x.plans || []) {
        const ndoc = { id: uuid(), company_id: co?.id || code, code: `tier-${tr.tier_level}`, name_ar: tr.name_ar, name_en: tr.name_en, tier_level: tr.tier_level, catalog_status: 'pending_review', provenance: 'json-migration' };
        if (await networks.findOne({ company_id: ndoc.company_id, code: ndoc.code }, { projection: { _id: 1 } })) nexist++;
        else if (DRY) nwould++;
        else {
          const r = await networks.updateOne({ company_id: ndoc.company_id, code: ndoc.code }, { $setOnInsert: ndoc }, { upsert: true });
          if (r.upsertedCount || r.upsertedId) nins++; else nexist++;
        }
      }
    }
    report.insurance = { json: items.length, companies: c.t, networks: { existing: nexist, inserted: nins, would_insert: nwould } };
  }
  const conflicts = ['labs', 'radiology', 'nursing'].reduce((n, k) => n + report[k].conflict, 0) + report.insurance.companies.conflict;
  // one line: the deploy log keeps the last lines of the output and its public log shows one-line JSON counts
  console.log(JSON.stringify({ dry_run: DRY, conflicts, ...report }));
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
