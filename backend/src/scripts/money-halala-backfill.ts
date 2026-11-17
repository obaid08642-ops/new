/**
 * node dist/scripts/money-halala-backfill.js              dry run: prints the plan, writes nothing
 * node dist/scripts/money-halala-backfill.js --apply      writes the shadow fields; needs MONEY_BACKFILL_CONFIRM=<the database name>
 *   --include-ledger   also fills platformledgerentries (append-only by convention; only adds derived fields)
 *   --collection=<name>[,<name>]   only these collections (the runbook backfills ONE collection per run)
 * Every --apply run logs the ids it fills (ids only) under a run id it prints (`RUN_ID ...`); to undo that run before the doubles are dropped:
 *   node dist/scripts/money-halala-backfill.js --rollback=<run id>            dry run: counts what would be unset
 *   MONEY_BACKFILL_CONFIRM=<db> node dist/scripts/money-halala-backfill.js --rollback=<run id> --apply   removes exactly the shadow fields that run wrote (only where the double is still there)
 * Env: MONGO_URL, DB_NAME (same as the backend). Prints counts only, never a document.
 */
import { mongo } from 'mongoose';
import { randomUUID } from 'crypto';
import { applyBackfill, planBackfill, rollbackBackfill } from '../modules/finance-integrity/halala-backfill';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  if (apply && process.env.MONEY_BACKFILL_CONFIRM !== name) { console.error(`refusing to write: set MONEY_BACKFILL_CONFIRM=${name}`); process.exit(2); }
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
    const rollback = arg('rollback');
    if (rollback) {
      console.log('ROLLBACK', JSON.stringify(await rollbackBackfill(db, rollback, { apply })));
      if (!apply) console.log('dry run only: nothing was changed');
      return;
    }
    const only = arg('collection')?.split(',').map((x) => x.trim()).filter(Boolean);
    console.log('PLAN', JSON.stringify((await planBackfill(db)).filter((p) => !only?.length || only.includes(p.collection)), null, 1));
    if (apply) {
      const runId = randomUUID();
      console.log('RUN_ID', runId);
      console.log('APPLIED', JSON.stringify(await applyBackfill(db, { includeLedger: process.argv.includes('--include-ledger'), runId, only })));
    } else console.log('dry run only: nothing was written');
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
