/**
 * Registers the existing global catalogue concepts in the launch market (blueprint step 6). Dry run by default. ONE kind per --apply run (the ops task enforces it).
 *   node dist/scripts/catalogue-registration-backfill.js                        dry run: PLAN counts per kind, writes nothing
 *   node dist/scripts/catalogue-registration-backfill.js --kind=<kind>          dry run for one kind (medicine|lab_test|radiology_service|nursing_service|specialty)
 *   CATALOGUE_BACKFILL_CONFIRM=<db> node dist/scripts/catalogue-registration-backfill.js --kind=<kind> --apply     writes catalogue_registrations; prints `RUN_ID <uuid>`
 *   node dist/scripts/catalogue-registration-backfill.js --rollback=<run id>    dry run: counts the rows that run created
 *   CATALOGUE_BACKFILL_CONFIRM=<db> node dist/scripts/catalogue-registration-backfill.js --rollback=<run id> --apply   deletes exactly those rows
 * env: MONGO_URL, DB_NAME. Counts only: no concept name or id is printed.
 */
import { mongo } from 'mongoose';
import { randomUUID } from 'crypto';
import { applyRegistrationBackfill, CATALOGUE_SOURCES, planRegistrationBackfill, rollbackRegistrationBackfill } from '../modules/markets/catalogue/catalogue-backfill';
import { SA_MARKET_ID } from '../modules/markets/sa-market.seed';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const apply = process.argv.includes('--apply');
  if (apply && process.env.CATALOGUE_BACKFILL_CONFIRM !== name) { console.error(`refusing to write: set CATALOGUE_BACKFILL_CONFIRM=${name}`); process.exit(2); }
  const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    const rollback = arg('rollback');
    if (rollback) {
      console.log('ROLLBACK', JSON.stringify((await rollbackRegistrationBackfill(db, rollback, { apply })).filter((r) => r.written > 0)));
      if (!apply) console.log('dry run only: nothing was changed');
      return;
    }
    const kind = arg('kind');
    const sources = kind ? CATALOGUE_SOURCES.filter((s) => s.kind === kind) : CATALOGUE_SOURCES;
    if (kind && sources.length === 0) { console.error(`failed: unknown kind ${kind}`); process.exit(2); }
    console.log('PLAN', JSON.stringify(await planRegistrationBackfill(db, SA_MARKET_ID, sources)));
    if (!apply) { console.log('dry run only: nothing was written'); return; }
    const runId = randomUUID();
    console.log('RUN_ID', runId);
    console.log('APPLIED', JSON.stringify({ written: (await applyRegistrationBackfill(db, SA_MARKET_ID, { sources, runId })).written }));
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
