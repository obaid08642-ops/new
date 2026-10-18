/**
 * Phase 16.9 - encrypt the health fields of the rows that were written before field encryption existed.
 *
 *   FIELD_ENCRYPTION_KEY=... MONGO_URL=... DB_NAME=... \
 *     npx ts-node --transpile-only src/scripts/encrypt-health-fields.ts            dry run: counts only, writes nothing
 *     ... HEALTH_MIGRATION_CONFIRM=apply HEALTH_MIGRATION_BACKUP=<backup file name> \
 *     npx ts-node --transpile-only src/scripts/encrypt-health-fields.ts --apply
 *
 * Safety (the rows are patients' medical records):
 *   - apply refuses to run without the key, without HEALTH_MIGRATION_CONFIRM=apply, and without HEALTH_MIGRATION_BACKUP
 *     (the name of the backup taken just before, which the operator has checked; nothing is rewritten without one);
 *   - a row is changed only when a health field is still plaintext, so the run is idempotent and can be repeated or resumed;
 *   - each write is guarded by the value that was read (a row edited in the meantime is skipped and picked up by the next run);
 *   - after each write the row is read back and decrypted; any difference stops the run with the row id.
 */
import mongoose from 'mongoose';
import { HEALTH_FIELDS, protectHealthDoc, revealHealthDoc } from '../common/health-fields';
import { fieldCrypto } from '../common/pdpl-compliance.module';

type Db = mongoose.mongo.Db;

export interface MigrationResult { collection: string; scanned: number; plaintext_rows: number; encrypted: number; skipped_concurrent: number }

const topFieldsOf = (collection: string): string[] => [...new Set((HEALTH_FIELDS[collection] ?? []).map((p) => p.split('.')[0]))];

const clone = <T>(v: T): T => (v === undefined ? v : (structuredClone(v) as T));

export async function encryptCollection(db: Db, collection: string, opts: { apply: boolean; batch?: number }): Promise<MigrationResult> {
  if (!fieldCrypto().isEnabled()) throw new Error('FIELD_ENCRYPTION_KEY is not set');
  const tops = topFieldsOf(collection);
  const result: MigrationResult = { collection, scanned: 0, plaintext_rows: 0, encrypted: 0, skipped_concurrent: 0 };
  const cursor = db.collection(collection).find({}, { projection: Object.fromEntries(tops.map((t) => [t, 1])), batchSize: opts.batch ?? 200 });
  for await (const row of cursor) {
    result.scanned++;
    const before = Object.fromEntries(tops.filter((t) => row[t] !== undefined).map((t) => [t, clone(row[t])]));
    const after = protectHealthDoc(collection, clone(before));
    const changed = tops.filter((t) => JSON.stringify(before[t]) !== JSON.stringify(after[t]));
    if (!changed.length) continue;
    result.plaintext_rows++;
    if (!opts.apply) continue;
    const guard: Record<string, unknown> = { _id: row._id };
    for (const t of changed) guard[t] = before[t];
    const res = await db.collection(collection).updateOne(guard, { $set: Object.fromEntries(changed.map((t) => [t, after[t]])) });
    if (!res.matchedCount) { result.skipped_concurrent++; continue; }
    const check = await db.collection(collection).findOne({ _id: row._id }, { projection: Object.fromEntries(tops.map((t) => [t, 1])) });
    const readBack = revealHealthDoc(collection, Object.fromEntries(changed.map((t) => [t, clone(check?.[t])])));
    for (const t of changed) {
      if (JSON.stringify(readBack[t]) !== JSON.stringify(before[t])) throw new Error(`verification failed for ${collection} ${String(row._id)} field ${t}: stopping`);
    }
    result.encrypted++;
  }
  return result;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.MONGO_URL;
  if (!url) throw new Error('MONGO_URL is required');
  if (!fieldCrypto().isEnabled()) throw new Error('FIELD_ENCRYPTION_KEY is required: without it nothing can be encrypted');
  if (apply) {
    if (process.env.HEALTH_MIGRATION_CONFIRM !== 'apply') throw new Error('refusing to write: set HEALTH_MIGRATION_CONFIRM=apply');
    if (!process.env.HEALTH_MIGRATION_BACKUP) throw new Error('refusing to write: set HEALTH_MIGRATION_BACKUP to the name of the backup taken just before this run');
  }
  const conn = await mongoose.createConnection(url, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}).asPromise();
  try {
    const db = conn.db as Db;
    const present = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
    for (const collection of Object.keys(HEALTH_FIELDS)) {
      if (!present.has(collection)) { console.log(JSON.stringify({ collection, skipped: 'collection does not exist' })); continue; }
      console.log(JSON.stringify({ ...(await encryptCollection(db, collection, { apply })), mode: apply ? 'apply' : 'dry-run' }));
    }
  } finally {
    await conn.close();
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
}
