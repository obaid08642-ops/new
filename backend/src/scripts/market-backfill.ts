/**
 * Stamps market_id / operator_id = SA on existing documents (blueprint step 3). Dry run by default. ONE collection per --apply run (the ops task enforces it).
 *   node dist/scripts/market-backfill.js                              dry run: PLAN counts, writes nothing
 *   node dist/scripts/market-backfill.js --collection=<name>          dry run for one collection
 *   MARKET_BACKFILL_CONFIRM=<db> node dist/scripts/market-backfill.js --collection=<name> --apply   writes; prints `RUN_ID <uuid>`
 *   node dist/scripts/market-backfill.js --rollback=<run id>          dry run: counts what that run stamped
 *   MARKET_BACKFILL_CONFIRM=<db> node dist/scripts/market-backfill.js --rollback=<run id> --apply   unsets exactly what that run wrote
 * env: MONGO_URL, DB_NAME (same as the backend). Counts only: no document, id or value is printed.
 */
import { mongo } from 'mongoose';
import { randomUUID } from 'crypto';
import { applyMarketBackfill, MARKET_BACKFILL_COLLECTIONS, planMarketBackfill, rollbackMarketBackfill } from '../modules/markets/market-backfill';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  if (apply && process.env.MARKET_BACKFILL_CONFIRM !== name) { console.error(`refusing to write: set MARKET_BACKFILL_CONFIRM=${name}`); process.exit(2); }
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    const rollback = arg('rollback');
    if (rollback) {
      console.log('ROLLBACK', JSON.stringify((await rollbackMarketBackfill(db, rollback, { apply })).filter((r) => r.stamped > 0)));
      if (!apply) console.log('dry run only: nothing was changed');
      return;
    }
    const only = arg('collection');
    if (only && !MARKET_BACKFILL_COLLECTIONS.includes(only)) { console.error(`failed: unknown collection ${only}`); process.exit(2); }
    const collections = only ? [only] : MARKET_BACKFILL_COLLECTIONS;
    console.log('PLAN', JSON.stringify((await planMarketBackfill(db, collections)).filter((r) => r.missing > 0)));
    if (!apply) { console.log('dry run only: nothing was written'); return; }
    const runId = randomUUID();
    console.log('RUN_ID', runId);
    const res = await applyMarketBackfill(db, { collections, runId });
    console.log('APPLIED', JSON.stringify({ written: res.written }));
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
