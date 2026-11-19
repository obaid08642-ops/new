/**
 * Migration 20260827 indexes, from the compiled backend (the production image has no `scripts/` folder). Counts only, never a document or an id.
 *   node dist/scripts/pharmacy-expiry-indexes.js          DRY RUN: per index present / missing, rows, and for the unique ones the number of duplicate key groups (must be 0)
 *   node dist/scripts/pharmacy-expiry-indexes.js --apply  creates the missing ones whose pre-flight is clean (unique indexes with duplicates are refused); needs PHARMACY_INDEXES_CONFIRM=<database name>
 * Env: MONGO_URL, DB_NAME (same as the backend). Writes nothing but the indexes; a re-run changes nothing.
 */
import { mongo } from 'mongoose';
import { applyPharmacyIndexes, planPharmacyIndexes } from '../modules/pharmacy/pharmacy-expiry-indexes';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  if (apply && process.env.PHARMACY_INDEXES_CONFIRM !== name) { console.error(`refusing to write: set PHARMACY_INDEXES_CONFIRM=${name}`); process.exit(2); }
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    for (const r of await planPharmacyIndexes(db)) console.log(`pharmacy-indexes: plan ${r.collection}.${r.name} unique=${r.unique} present=${r.present} rows=${r.rows} duplicate_groups=${r.duplicate_groups ?? 'n/a'}`);
    if (apply) for (const r of await applyPharmacyIndexes(db)) console.log(`pharmacy-indexes: ${r.outcome} ${r.name}`);
    else console.log('pharmacy-indexes: dry run only: nothing was written');
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
