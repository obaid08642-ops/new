/**
 * Migration: populate sfda_price fields from catalogue price
 * Dry-run by default; --apply writes changes.
 * Usage: MONGODB_URI=... DB_NAME=... npx ts-node scripts/migrations/2026-10-sfda-price-from-catalogue.ts [--apply]
 */
import { connect, Connection, Model } from 'mongoose';
import { Medicine, MedicineSchema } from '../src/schemas/medicine.schema';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'nabd';
  
  await connect(uri, { dbName });
  
  const db = (await import('mongoose')).default.connection.db;
  const medicines = db.collection('medicines');
  
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
  
  await import('mongoose').then(m => m.default.connection.close());
}

main().catch((err) => {
  console.error('[migration] Error:', err);
  process.exit(1);
});
