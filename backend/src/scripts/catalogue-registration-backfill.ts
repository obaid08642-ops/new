/**
 * Registers the existing global catalogue concepts in the launch market (blueprint step 6). Dry run by default.
 *   node dist/scripts/catalogue-registration-backfill.js            counts only
 *   node dist/scripts/catalogue-registration-backfill.js --apply    writes catalogue_registrations (take a backup first)
 * env: MONGO_URL, DB_NAME. Counts only: no concept name or id is printed.
 */
import { mongo } from 'mongoose';
import { applyRegistrationBackfill, planRegistrationBackfill } from '../modules/markets/catalogue/catalogue-backfill';
import { SA_MARKET_ID } from '../modules/markets/sa-market.seed';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    const plan = await planRegistrationBackfill(db, SA_MARKET_ID);
    for (const r of plan) console.log(`${r.kind}: ${r.concepts} concepts, ${r.missing} not registered in ${SA_MARKET_ID}`);
    if (!process.argv.includes('--apply')) { console.log('catalogue-registration-backfill: dry run (pass --apply to write)'); return; }
    console.log(`catalogue-registration-backfill: wrote ${(await applyRegistrationBackfill(db, SA_MARKET_ID)).written}`);
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
