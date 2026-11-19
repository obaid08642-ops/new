/**
 * Stamps market_id / operator_id = SA on existing documents (blueprint step 3). Dry run by default.
 *   node dist/scripts/market-backfill.js            counts only (read-only)
 *   node dist/scripts/market-backfill.js --apply    writes (take a backup first)
 * env: MONGO_URL, DB_NAME (same as the backend). Counts only: no document, id or value is printed.
 */
import { mongo } from 'mongoose';
import { applyMarketBackfill, planMarketBackfill } from '../modules/markets/market-backfill';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    const plan = await planMarketBackfill(db);
    for (const r of plan) if (r.missing > 0) console.log(`${r.collection}: ${r.missing} without market_id`);
    console.log(`market-backfill: ${plan.reduce((a, r) => a + r.missing, 0)} documents to stamp in ${plan.filter((r) => r.missing > 0).length} collections`);
    if (!apply) { console.log('market-backfill: dry run (pass --apply to write)'); return; }
    const res = await applyMarketBackfill(db);
    console.log(`market-backfill: wrote ${res.written}`);
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
