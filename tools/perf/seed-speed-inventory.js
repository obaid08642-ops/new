// Speed inventory (docs/perf/SPEED_INVENTORY.md): the TEST data the catalogue-less boot does not create, so the public pages
// and endpoints are measured with rows on them: doctors, a facility, home-care nurses, articles.
// Test database only: refuses any DB_NAME without "perf", "live" or "test", and any Mongo that is not on this machine.
//   DB_NAME=nabd_perf node tools/perf/seed-speed-inventory.js [doctors=120] [nurses=24] [articles=40]
// Every row carries provenance "perf-test-data"; re-running replaces the earlier ones.
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../../backend/node_modules/mongoose'));
const URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';
const DB = process.env.DB_NAME || 'nabd_perf';
const host = (/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^:/,?]+)/.exec(URL) || [])[1];
if (!['127.0.0.1', 'localhost'].includes(host)) { console.error(`refused: ${host} is not a local Mongo`); process.exit(2); }
if (!/perf|live|test/.test(DB)) { console.error(`refused: DB_NAME ${DB} does not look like a test database`); process.exit(2); }
const DOCTORS = Number(process.argv[2] || 120), NURSES = Number(process.argv[3] || 24), ARTICLES = Number(process.argv[4] || 40);
const TAG = 'perf-test-data';
const SPECIALTIES = ['cardiology', 'dermatology', 'pediatrics', 'orthopedics', 'neurology', 'gynecology', 'ophthalmology', 'ent', 'psychiatry', 'urology'];
const CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'];
const DEGREES = ['consultant', 'specialist', 'senior_specialist', 'general_practitioner'];
(async () => {
  await mongoose.connect(URL, { dbName: DB });
  const db = mongoose.connection.db;
  const now = new Date();
  const facilityId = 'perf-facility-0001';
  await db.collection('facilities').deleteMany({ provenance: TAG });
  await db.collection('facilities').insertOne({ id: facilityId, slug: 'perf-hospital', name_ar: 'مستشفى الاختبار', name_en: 'Perf Hospital', type: 'hospital', city: 'الرياض', is_active: true, public_eligibility: true, medical_review_status: 'approved', provenance: TAG, createdAt: now, updatedAt: now });
  await db.collection('provider_profiles').deleteMany({ provenance: TAG });
  const docs = Array.from({ length: DOCTORS }, (_, i) => ({
    id: `perf-doc-${String(i).padStart(4, '0')}`, user_id: `perf-doc-${String(i).padStart(4, '0')}`, account_id: `perf-doc-${String(i).padStart(4, '0')}`,
    type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', license_verified: true, license_expiry_date: new Date('2035-01-01'),
    specialty: SPECIALTIES[i % SPECIALTIES.length], sub_specialties: ['sub-' + (i % 5)], academic_degree: DEGREES[i % DEGREES.length], gender: i % 2 ? 'female' : 'male',
    consultation_modes: ['clinic', 'video', ...(i % 4 === 0 ? ['home'] : [])], price_clinic: 100 + (i % 9) * 25, price_online: 80 + (i % 7) * 20, price_home: 250,
    years_experience: 3 + (i % 25), rating_avg: 3.5 + (i % 15) / 10, rating_count: 5 + (i % 200), languages: ['ar', 'en'], city: CITIES[i % CITIES.length],
    display_name_ar: `د. اختبار ${i}`, display_name_en: `Dr. Perf ${i}`, hospital: 'مستشفى الاختبار', facility_id: i % 3 === 0 ? facilityId : undefined,
    bio_ar: 'سيرة مختصرة لطبيب اختبار '.repeat(6), bio_en: 'A short biography of a test doctor. '.repeat(6), license_number: `SCFHS-${100000 + i}`,
    provenance: TAG, createdAt: now, updatedAt: now,
  }));
  const nurses = Array.from({ length: NURSES }, (_, i) => ({
    id: `perf-nurse-${String(i).padStart(4, '0')}`, user_id: `perf-nurse-${i}`, account_id: `perf-nurse-${String(i).padStart(4, '0')}`, type: 'home_care', status: 'active',
    public_eligibility: true, medical_review_status: 'approved', name_ar: `ممرض اختبار ${i}`, name_en: `Perf Nurse ${i}`, full_name: `Perf Nurse ${i}`, gender: i % 2 ? 'female' : 'male',
    nationality: 'Saudi', qualification: 'Bachelor of Nursing', rating_avg: 4 + (i % 10) / 10, rating_count: 10 + i, nursing_services: [{ key: 'wound_care' }], availability: { accepting: true },
    location: { lat: 24.7 + i / 1000, lng: 46.7 + i / 1000 }, provenance: TAG, createdAt: now, updatedAt: now,
  }));
  await db.collection('provider_profiles').insertMany([...docs, ...nurses]);
  await db.collection('articles').deleteMany({ provenance: TAG });
  const body = '<p>' + 'Health article paragraph for the speed inventory. '.repeat(40) + '</p>';
  await db.collection('articles').insertMany(Array.from({ length: ARTICLES }, (_, i) => ({
    id: `perf-art-${i}`, slug: `perf-article-${i}`, title: `Perf article ${i}`, title_ar: `مقال اختبار ${i}`, summary: 'A short summary of a test article.', category: ['nutrition', 'sleep', 'heart'][i % 3],
    content: body, body, status: 'PUBLISHED', published_at: new Date(Date.now() - i * 3600e3), is_deleted: false, provenance: TAG, createdAt: now, updatedAt: now,
  })));
  console.log(`doctors ${DOCTORS}, nurses ${NURSES}, articles ${ARTICLES}, 1 facility (test data) in ${DB}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
