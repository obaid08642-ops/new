// Live-gate test data for j_web_map_links (issue 1550): one public lab and one public doctor on the facilities map, each with both
// names, a city, a district and a point. The journey used to find them only if an earlier journey of the SAME shard had published
// such a lab and doctor, so it passed or failed with the shard split; it now stands on this seed.
// Idempotent (upserts by a fixed id), TEST DATABASE ONLY: refuses any DB_NAME without "test" or "live".
//   node tools/live/seed_map_facilities.js   (uses backend/node_modules; MONGO_URL, DB_NAME like the app)
const path = require('path');
const req = (m) => require(path.resolve(__dirname, '../../backend/node_modules', m));
const mongoose = req('mongoose');
(async () => {
  const dbName = process.env.DB_NAME || 'nabd_live';
  if (!/test|live/i.test(dbName)) throw new Error(`refused: DB_NAME "${dbName}" is not a test database`);
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true', { dbName });
  const db = mongoose.connection.db;
  const now = new Date();
  const common = {
    status: 'active', public_eligibility: true, medical_review_status: 'approved', license_verified: true,
    license_expiry_date: new Date('2035-01-01'), city: 'الرياض', district: 'العليا', location: { lat: 24.7136, lng: 46.6753 }, updatedAt: now,
  };
  const labId = '00000000-0000-4000-8000-0000000c0a01';
  const doctorId = '00000000-0000-4000-8000-0000000c0a02';
  await db.collection('provider_profiles').updateOne({ id: labId }, { $set: {
    ...common, id: labId, user_id: labId, account_id: labId, type: 'lab', name_ar: 'مختبر خريطة البوابة', name_en: 'Gate Map Lab', display_name_ar: 'مختبر خريطة البوابة', display_name_en: 'Gate Map Lab',
  }, $setOnInsert: { createdAt: now } }, { upsert: true });
  await db.collection('provider_profiles').updateOne({ id: doctorId }, { $set: {
    ...common, id: doctorId, user_id: doctorId, account_id: doctorId, type: 'doctor', specialty: 'cardiology', consultation_modes: ['clinic'], price_clinic: 100,
    name_ar: 'د. خريطة البوابة', name_en: 'Dr. Gate Map', display_name_ar: 'د. خريطة البوابة', display_name_en: 'Dr. Gate Map',
  }, $setOnInsert: { createdAt: now } }, { upsert: true });
  console.log('map lab + doctor ready:', labId, doctorId);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
