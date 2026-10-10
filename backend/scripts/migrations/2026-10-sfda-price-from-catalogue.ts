import { spawnSync } from 'child_process';
import * as path from 'path';

/**
 * Migration: 2026-10-sfda-price-from-catalogue
 * Fills sfda_price, sfda_price_source, sfda_price_updated_at from the catalogue `price` field.
 * Dry-run by default. Use --apply to write changes.
 * 
 * Usage:
 *   npx ts-node scripts/migrations/2026-10-sfda-price-from-catalogue.ts [--apply]
 * 
 * Environment variables:
 *   MONGODB_URI - MongoDB connection string (required)
 *   DB_NAME - Database name (default: nabd)
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'nabd';
const DRY_RUN = !process.argv.includes('--apply');

interface Medicine {
  id: string;
  price: number;
  sfda_price?: number;
  sfda_price_source?: string;
  sfda_price_updated_at?: Date;
}

async function run() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const medicines = db.collection<Medicine>('medicines');
    
    console.log(`[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] Starting migration...`);
    console.log(`Database: ${DB_NAME}`);
    console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
    
    // Find all medicines that have a price but no sfda_price
    const filter = {
      price: { $exists: true, $gt: 0 },
      $or: [
        { sfda_price: { $exists: false } },
        { sfda_price: null },
      ],
    };
    
    const total = await medicines.countDocuments(filter);
    console.log(`Found ${total} medicines to update`);
    
    if (total === 0) {
      console.log('No medicines need updating');
      return;
    }
    
    const cursor = medicines.find(filter);
    let updated = 0;
    let errors = 0;
    
    for await (const doc of cursor) {
      try {
        const update = {
          $set: {
            sfda_price: doc.price,
            sfda_price_source: 'catalogue',
            sfda_price_updated_at: new Date(),
          },
        };
        
        if (!DRY_RUN) {
          await medicines.updateOne({ id: doc.id }, update);
        }
        
        updated++;
        if (updated % 100 === 0) {
          console.log(`  Processed ${updated}/${total}...`);
        }
      } catch (err) {
        errors++;
        console.error(`  Error updating ${doc.id}:`, err);
      }
    }
    
    console.log(`\n[${DRY_RUN ? 'DRY-RUN' : 'APPLY'}] Complete:`);
    console.log(`  Total matched: ${total}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Errors: ${errors}`);
    
    if (DRY_RUN) {
      console.log('\nRun with --apply to write changes');
    }
    
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
