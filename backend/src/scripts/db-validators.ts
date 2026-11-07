/**
 * R14. node dist/scripts/db-validators.js              dry run: the plan and how many existing documents would not pass each validator; writes nothing
 *      node dist/scripts/db-validators.js --apply=warn    set the validators with validationAction warn (violations are logged by mongod, writes go through)
 *      node dist/scripts/db-validators.js --apply=error   writes that violate a validator are REFUSED (only after a week of clean warn)
 *      node dist/scripts/db-validators.js --remove        take the validators off again
 * Needs MONGO_URL, DB_NAME; every write needs MONEY_BACKFILL_CONFIRM-style confirmation: DB_VALIDATORS_CONFIRM=<the database name>. Prints counts and names only.
 */
import { mongo } from 'mongoose';
import { applyValidators, countInvalid, planValidators, removeValidators } from '../modules/db-integrity/db-validators';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const apply = process.argv.find((a) => a.startsWith('--apply='))?.slice(8);
  const remove = process.argv.includes('--remove');
  if ((apply || remove) && process.env.DB_VALIDATORS_CONFIRM !== name) { console.error(`refusing to write: set DB_VALIDATORS_CONFIRM=${name}`); process.exit(2); }
  if (apply && apply !== 'warn' && apply !== 'error') { console.error('--apply=warn or --apply=error'); process.exit(2); }
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    console.log('PLAN', JSON.stringify(await planValidators(db)));
    console.log('INVALID_EXISTING', JSON.stringify(await countInvalid(db)));
    if (apply) console.log('APPLIED', JSON.stringify(await applyValidators(db, apply as 'warn' | 'error')));
    else if (remove) console.log('REMOVED', JSON.stringify(await removeValidators(db)));
    else console.log('dry run only: nothing was written');
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
