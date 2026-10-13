// Migration: fill sfda_price, sfda_price_source, sfda_price_updated_at from catalogue price
// Usage: npx ts-node --transpile-only scripts/migrations/2026-10-sfda-price-from-catalogue.ts [--apply]
import { MongoClient } from 'mongodb';
import { buildSlug } from '../common/slug.util';

const DRY_RUN = !process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'nabd';

async function run() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const meds = db.collection('medicines');

  const cursor = meds.find({ sfda_price: { $exists: false } }, { projection: { _id: 1, id: 1, price: 1, name_ar: 1, name_en: 1 } });
  let count = 0;
  for await (const med of cursor) {
    const price = Number(med.price || 0);
    if (price > 0) {
      if (!DRY_RUN) {
        await meds.updateOne(
          { id: med.id },
          {
            $set: {
              sfda_price: price,
              sfda_price_source: 'catalogue',
              sfda_price_updated_at: new Date(),
              updatedAt: new Date(),
            },
          },
        );
      }
      count++;
      console.log(`[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] ${med.id} ${med.name_ar || med.name_en || ''} -> sfda_price=${price}`);
    }
  }
  console.log(`Total ${count} medicines ${DRY_RUN ? 'would be' : 'were'} updated.`);
  await client.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
