/**
 * READ-ONLY (ops task 96j): how many (ref_type, ref_id) pairs have more than one provider_earning row in the ledger, how many rows are extra, and whether the
 * unique index is already there. Counts only: never a document, an id or a value. Nothing is written.
 *   node dist/scripts/ledger-earning-duplicates.js          env: MONGO_URL, DB_NAME (same as the backend)
 */
import { mongo } from 'mongoose';
import { countEarningDuplicates, earningIndexPresent } from '../modules/finance-engine/earning-key';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    const dup = await countEarningDuplicates(db);
    console.log(`ledger-duplicates: provider_earning groups=${dup.groups} extra_rows=${dup.extra_rows} unique_index=${(await earningIndexPresent(db)) ? 'present' : 'absent'}`);
    console.log('ledger-duplicates: done (read-only)');
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
