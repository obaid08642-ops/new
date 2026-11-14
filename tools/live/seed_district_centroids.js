// Test data for the reverse geocoder: approximate centroids on a few seeded Riyadh districts and the Riyadh city point, so
// GET /geo/reverse can be tried on the local stack. The points are APPROXIMATE and marked source "test-data"; the real centroids
// come from the official lists / OpenStreetMap through backend/scripts/migrations/2026-10-districts-import.ts.
// Idempotent, TEST DATABASE ONLY (DB_NAME must contain test, live or perf; Mongo must be local).
//   node tools/live/seed_district_centroids.js   (uses backend/node_modules; MONGO_URL, DB_NAME like the app)
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../../backend/node_modules/mongoose'));

const POINTS = {
  'sa-riyadh': { lat: 24.7136, lng: 46.6753 },
  'sa-riyadh-001': { lat: 24.8130, lng: 46.6240 }, // Al Malqa
  'sa-riyadh-002': { lat: 24.8230, lng: 46.6570 }, // Al Yasmin
  'sa-riyadh-003': { lat: 24.8030, lng: 46.6350 }, // Al Sahafa
  'sa-riyadh-004': { lat: 24.7580, lng: 46.5960 }, // Hittin
  'sa-riyadh-005': { lat: 24.8480, lng: 46.6500 }, // An Narjis
};

(async () => {
  const dbName = process.env.DB_NAME || 'nabd_live';
  if (!/test|live|perf/i.test(dbName)) throw new Error(`refused: DB_NAME "${dbName}" is not a test database`);
  const url = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true';
  if (!/(127\.0\.0\.1|localhost)/.test(url)) throw new Error('refused: MONGO_URL is not local');
  await mongoose.connect(url, { dbName });
  const col = mongoose.connection.db.collection('locations');
  let n = 0;
  for (const [code, p] of Object.entries(POINTS)) {
    const r = await col.updateOne({ code }, { $set: { coordinates: p, source: 'test-data', source_verified_at: new Date() } });
    n += r.matchedCount;
  }
  console.log(`centroids set on ${n} of ${Object.keys(POINTS).length} rows (test data)`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
