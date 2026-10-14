// D-12 (owner O-1, 2026-10-06): the catalogue price in the server DB is the reference price.
// Fills sfda_price, sfda_price_source and sfda_price_updated_at from `price` on items that have
// no sfda_price yet (an admin-corrected value is never overwritten). Items without a price stay
// unset and their offer lines read "not verified".
// Usage: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-sfda-price-from-catalogue.ts [--apply]
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'nabd';
const SOURCE = 'catalogue (owner 2026-10-06)';

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const meds = mongoose.connection.collection('medicines');
  const filter = { sfda_price: { $exists: false }, price: { $gt: 0 } };
  const pending = await meds.countDocuments(filter);
  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry-run', would_update: pending }));
    return;
  }
  // One server-side update: sfda_price = price for every unset row.
  const res = await meds.updateMany(filter, [
    { $set: { sfda_price: '$price', sfda_price_source: SOURCE, sfda_price_updated_at: '$$NOW' } },
  ]);
  console.log(JSON.stringify({ mode: 'apply', updated: res.modifiedCount }));
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => null);
    process.exit(1);
  });
