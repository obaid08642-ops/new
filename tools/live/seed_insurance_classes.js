// Test data for the insurance card flow: three classes (name ar/en, copay %, cap) under every active insurer, so the
// add-card screens can offer a class and prefill the card's copay figures. No class or figure is published officially
// (see backend/scripts/migrations/2026-10-insurance-official.ts), so production gets none from here.
// Idempotent (upserts by a fixed id per insurer and code), TEST DATABASE ONLY: refuses any DB_NAME without "test", "live" or "perf".
//   node tools/live/seed_insurance_classes.js   (uses backend/node_modules; MONGO_URL, DB_NAME like the app)
const path = require('path');
const crypto = require('crypto');
const req = (m) => require(path.resolve(__dirname, '../../backend/node_modules', m));
const mongoose = req('mongoose');

const CLASSES = [
  { code: 'class-a', tier_level: 1, name_ar: 'الفئة أ', name_en: 'Class A', copay_percent: 0, copay_cap_sar: 0 },
  { code: 'class-b', tier_level: 2, name_ar: 'الفئة ب', name_en: 'Class B', copay_percent: 10, copay_cap_sar: 200 },
  { code: 'class-c', tier_level: 3, name_ar: 'الفئة ج', name_en: 'Class C', copay_percent: 20, copay_cap_sar: 100 },
];
const idOf = (companyId, code) => {
  const h = crypto.createHash('sha1').update(`test-insurance-class:${companyId}:${code}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

(async () => {
  const dbName = process.env.DB_NAME || 'nabd_live';
  if (!/test|live|perf/i.test(dbName)) throw new Error(`refused: DB_NAME "${dbName}" is not a test database`);
  const url = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';
  if (!/(127\.0\.0\.1|localhost)/.test(url)) throw new Error('refused: MONGO_URL is not local');
  await mongoose.connect(url, { dbName });
  const db = mongoose.connection.db;
  const companies = await db.collection('insurance_companies').find({ is_active: true }, { projection: { id: 1, code: 1 } }).toArray();
  const now = new Date();
  let written = 0;
  for (const company of companies) {
    if (!company.id) continue;
    for (const klass of CLASSES) {
      await db.collection('insurance_networks').updateOne(
        { id: idOf(company.id, klass.code) },
        { $set: { ...klass, id: idOf(company.id, klass.code), company_id: company.id, catalog_status: 'pending_review', provenance: 'test-data', updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
      written += 1;
    }
  }
  console.log(`insurance classes ready: ${companies.length} insurers, ${written} classes (test data)`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
