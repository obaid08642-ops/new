// P14.27 capacity runs: production-sized TEST DATA in a local, throwaway database (never staging or production).
//   DB_NAME=nabd_perf node tools/perf/k6/seed-perf-data.js [medicines=21000] [patients=20000]
// - medicines: public, approved catalogue rows in the canonical `medicines` collection, translated into the six
//   site languages (the size production had on 2026-10-15), so search / product / sitemap reads scan a real-sized set.
// - users: patient accounts with no password and no contact details, only so the campaign fan-out measurement
//   (fanout.py) has a production-sized audience.
// Every row carries provenance "perf-test-data"; re-running replaces the earlier rows. Refuses any Mongo that is not
// on this machine, and any DB name without "perf", "live" or "test" in it.
const path = require('path');
const req = (m) => require(path.resolve(__dirname, '../../../backend/node_modules', m));
const mongoose = req('mongoose');

const URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';
const DB = process.env.DB_NAME || 'nabd_perf';
const MEDICINES = Number(process.argv[2] || 21000);
const PATIENTS = Number(process.argv[3] || 20000);
const TAG = 'perf-test-data';

const host = (/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^:/,?]+)/.exec(URL) || [])[1];
if (!['127.0.0.1', 'localhost'].includes(host)) { console.error(`refused: ${host} is not a local Mongo`); process.exit(2); }
if (!/perf|live|test/.test(DB)) { console.error(`refused: DB_NAME ${DB} does not look like a test database`); process.exit(2); }

// real active ingredients and forms, so the regex search terms of capacity.js match a realistic share of rows
const INGREDIENTS = [
  ['Paracetamol', 'باراسيتامول', 'panadol', 'بنادول'], ['Ibuprofen', 'ايبوبروفين', 'brufen', 'بروفين'],
  ['Amoxicillin', 'اموكسيسيلين', 'augmentin', 'اوجمنتين'], ['Insulin glargine', 'انسولين جلارجين', 'insulin', 'انسولين'],
  ['Vitamin D3', 'فيتامين د3', 'vitamin', 'فيتامين'], ['Omeprazole', 'اوميبرازول', 'losec', 'لوسك'],
  ['Metformin', 'ميتفورمين', 'glucophage', 'جلوكوفاج'], ['Atorvastatin', 'اتورفاستاتين', 'lipitor', 'ليبيتور'],
  ['Cetirizine', 'سيتريزين', 'zyrtec', 'زيرتك'], ['Salbutamol', 'سالبيوتامول', 'ventolin', 'فنتولين'],
];
const FORMS = [['Tablets', 'أقراص'], ['Syrup', 'شراب'], ['Capsules', 'كبسولات'], ['Cream', 'كريم'], ['Injection', 'حقن']];
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'];

function medicine(i) {
  const [en, ar, brandEn, brandAr] = INGREDIENTS[i % INGREDIENTS.length];
  const [formEn, formAr] = FORMS[i % FORMS.length];
  const strength = [5, 10, 20, 50, 100, 250, 500][i % 7];
  const nameEn = `${brandEn[0].toUpperCase()}${brandEn.slice(1)} ${strength} mg ${formEn} ${i}`;
  const nameAr = `${brandAr} ${strength} مجم ${formAr} ${i}`;
  const slug = `${brandEn}-${strength}mg-${formEn.toLowerCase()}-${i}`;
  const translations = {};
  for (const l of LANGS) {
    translations[l] = { name: l === 'ar' ? nameAr : nameEn, slug: l === 'ar' ? `${brandAr}-${strength}-${i}` : `${slug}-${l}`, search_aliases: [brandEn, brandAr] };
  }
  return {
    id: `perf-med-${String(i).padStart(6, '0')}`, sku: 900000000 + i, slug,
    name_en: nameEn, name_ar: nameAr, active_ingredient: en, active_ingredient_ar: ar,
    price: 5 + (i % 400) + 0.5, currency: 'SAR', requires_prescription: i % 4 === 0,
    public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved', is_deleted: false,
    usage_count: (i * 7919) % 5000, translations, provenance: TAG, createdAt: new Date(), updatedAt: new Date(),
  };
}

function patient(i) {
  return { id: `perf-pat-${String(i).padStart(6, '0')}`, full_name: `Perf patient ${i}`, role: 'patient', active: true,
    is_verified: true, token_version: 0, provenance: TAG, createdAt: new Date(), updatedAt: new Date() };
}

async function refill(col, n, make) {
  await col.deleteMany({ provenance: TAG });
  for (let i = 0; i < n; i += 2000) {
    await col.insertMany(Array.from({ length: Math.min(2000, n - i) }, (_, k) => make(i + k)), { ordered: false });
  }
  return col.countDocuments({ provenance: TAG });
}

(async () => {
  await mongoose.connect(URL, { dbName: DB });
  const db = mongoose.connection.db;
  console.log(`medicines (test data): ${await refill(db.collection('medicines'), MEDICINES, medicine)}`);
  console.log(`patients (test data): ${await refill(db.collection('users'), PATIENTS, patient)}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
