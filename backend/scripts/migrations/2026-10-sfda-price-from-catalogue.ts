/**
 * Migration: populate sfda_price fields from catalogue price
 * Dry-run by default; --apply writes changes.
 * Usage: MONGODB_URI=... DB_NAME=... npx ts-node scripts/migrations/2026-10-sfda-price-from-catalogue.ts [--apply]
 */
import { MongoClient, Db, Collection } from 'mongodb';

interface Medicine {
  id: string;
  sku?: number;
  price?: number;
  sfda_price?: number;
  sfda_price_source?: string;
  sfda_price_updated_at?: Date;
  updated_by?: string;
  updatedAt?: Date;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'nabd';
  
  const client = new MongoClient(uri);
  await client.connect();
  
  const db = client.db(dbName);
  const medicines: Collection<Medicine> = db.collection('medicines');
  
  console.log(`[migration] Connected to ${dbName}. Apply mode: ${apply}`);
  
  const cursor = medicines.find({ price: { $exists: true, $ne: null } });
  
  let count = 0;
  let updated = 0;
  
  for await (const med of cursor) {
    count++;
    const price = Number(med.price || 0);
    
    if (!med.sfda_price || med.sfda_price !== price) {
      const update = {
        $set: {
          sfda_price: price,
          sfda_price_source: 'catalogue',
          sfda_price_updated_at: new Date(),
          updated_by: 'migration:2026-10-sfda-price-from-catalogue',
          updatedAt: new Date(),
        },
      };
      
      if (apply) {
        await medicines.updateOne({ id: med.id }, update);
        updated++;
        console.log(`  Updated ${med.id} (sku: ${med.sku}): sfda_price = ${price}`);
      } else {
        console.log(`  [dry-run] Would update ${med.id} (sku: ${med.sku}): sfda_price = ${price}`);
      }
    }
  }
  
  console.log(`[migration] Scanned ${count} medicines. ${apply ? 'Updated' : 'Would update'} ${updated} documents.`);
  
  await client.close();
}

main().catch((err) => {
  console.error('[migration] Error:', err);
  process.exit(1);
});
