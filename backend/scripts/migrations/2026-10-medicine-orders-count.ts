// "Most ordered" (pharmacy listing): fills medicines.orders_count with the number of DELIVERED orders that contain each product.
// New deliveries add 1 themselves (orders.service -> countDeliveredOrder); this recounts the history. Expand-only: it only $sets the new field.
// Idempotent: a second run writes the same numbers. A delivery that lands while it runs is counted by the delivery and may be overwritten by
// the recount of a moment before; run it again afterwards, or when deliveries are quiet, to settle it.
// Usage: MONGODB_URI=... DB_NAME=... npx ts-node --transpile-only scripts/migrations/2026-10-medicine-orders-count.ts [--apply]
import mongoose from 'mongoose';
import { DELIVERED_COUNT_PIPELINE } from '../../src/modules/orders/ordered-count';

const APPLY = process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'nabd';

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
  const counts = await mongoose.connection.collection('orders').aggregate(DELIVERED_COUNT_PIPELINE as any, { allowDiskUse: true }).toArray();
  const meds = mongoose.connection.collection('medicines');
  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'dry-run', products_with_delivered_orders: counts.length, top: counts.sort((a, b) => b.orders - a.orders).slice(0, 5) }));
    return;
  }
  let modified = 0;
  for (let i = 0; i < counts.length; i += 500) {
    const batch = counts.slice(i, i + 500);
    const res = await meds.bulkWrite(batch.map((c: any) => ({ updateOne: { filter: { id: c._id }, update: { $set: { orders_count: c.orders } } } })), { ordered: false });
    modified += res.modifiedCount;
  }
  console.log(JSON.stringify({ mode: 'apply', products: counts.length, modified }));
}

run()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => null);
    process.exit(1);
  });
