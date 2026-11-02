/**
 * node dist/scripts/money-halala-backfill.js              dry run: prints the plan, writes nothing
 * node dist/scripts/money-halala-backfill.js --apply      writes the shadow fields; needs MONEY_BACKFILL_CONFIRM=<the database name>
 *   --include-ledger   also fills platformledgerentries (append-only by convention; only adds derived fields)
 * Env: MONGO_URL, DB_NAME (same as the backend). Prints counts only, never a document.
 */
import { mongo } from 'mongoose';
import { applyBackfill, planBackfill } from '../modules/finance-integrity/halala-backfill';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  if (apply && process.env.MONEY_BACKFILL_CONFIRM !== name) { console.error(`refusing to write: set MONEY_BACKFILL_CONFIRM=${name}`); process.exit(2); }
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    console.log('PLAN', JSON.stringify(await planBackfill(db), null, 1));
    if (apply) console.log('APPLIED', JSON.stringify(await applyBackfill(db, { includeLedger: process.argv.includes('--include-ledger') })));
    else console.log('dry run only: nothing was written');
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
