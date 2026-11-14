// Live-gate test data for j_web_consult_locales (issue 1550): one public facility and one published doctor who works in it.
// The doctors list names the facility in the page's language (facility_name_ar / facility_name_en), which needs a doctor whose
// facility_id points at an active, publicly eligible facility; a stack with no seeded test doctors has none.
// Idempotent (upserts by a fixed id), TEST DATABASE ONLY: refuses any DB_NAME without "test" or "live".
//   node tools/live/seed_consult_facility.js   (uses backend/node_modules; MONGO_URL, DB_NAME like the app)
const path = require('path');
const req = (m) => require(path.resolve(__dirname, '../../backend/node_modules', m));
const mongoose = req('mongoose');
(async () => {
  const dbName = process.env.DB_NAME || 'nabd_live';
  if (!/test|live/i.test(dbName)) throw new Error(`refused: DB_NAME "${dbName}" is not a test database`);
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true', { dbName });
  const db = mongoose.connection.db;
  const now = new Date();
  const facilityId = '00000000-0000-4000-8000-0000000c0f01';
  const doctorId = '00000000-0000-4000-8000-0000000c0d01';
  await db.collection('facilities').updateOne({ id: facilityId }, { $set: {
    id: facilityId, slug: 'live-gate-consult-hospital', name_ar: 'مستشفى بوابة الاختبار', name_en: 'Live Gate Hospital', type: 'hospital',
    city: 'الرياض', is_active: true, public_eligibility: true, medical_review_status: 'approved', updatedAt: now,
  }, $setOnInsert: { createdAt: now } }, { upsert: true });
  await db.collection('provider_profiles').updateOne({ id: doctorId }, { $set: {
    id: doctorId, user_id: doctorId, type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved',
    license_verified: true, license_expiry_date: new Date('2035-01-01'), specialty: 'cardiology', consultation_modes: ['clinic'],
    display_name_ar: 'د. اختبار البوابة', display_name_en: 'Dr. Live Gate', hospital: 'مستشفى بوابة الاختبار', facility_id: facilityId,
    city: 'الرياض', price_clinic: 100, updatedAt: now,
  }, $setOnInsert: { createdAt: now } }, { upsert: true });
  console.log('consult facility + doctor ready:', facilityId, doctorId);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
