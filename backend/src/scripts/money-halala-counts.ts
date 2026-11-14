/**
 * READ-ONLY counts for the R11 halala backfill (ops task 96i): per collection.field, how many doubles exist, how many lack the `_halalas` shadow (clean / unclean) and how many
 * shadows disagree with their double. Counts only: never a document, an id or a value. Nothing is written (no --apply exists here; the writer is money-halala-backfill.js).
 *   node dist/scripts/money-halala-counts.js          env: MONGO_URL, DB_NAME (same as the backend)
 */
import { mongo } from 'mongoose';
import { checkShadows, halalaCountLines, planBackfill } from '../modules/finance-integrity/halala-backfill';

(async () => {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  const client = await mongo.MongoClient.connect(url);
  try {
    const db = client.db(name);
    for (const line of halalaCountLines(await planBackfill(db, undefined, 0), await checkShadows(db))) console.log(line);
    console.log('halala-counts: done (read-only)');
  } finally { await client.close(); }
})().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
