/**
 * Removal of the legacy `WithdrawalRequest` rows (collection `withdrawalrequests`), owner decision 2026-10-31: nothing creates them any more, there
 * are no real users, so no archive. Run by `tools/ops/tasks/79-legacy-withdrawals-remove.sh` inside the backend container (its own MONGO_URL / DB_NAME):
 *   node dist/scripts/legacy-withdrawals-remove.js plan                                    read-only: how many rows, their ids, the plan's SHA-256
 *   node dist/scripts/legacy-withdrawals-remove.js apply --expect=<sha> --backup=<file>    backup (read back and hashed), delete by exact _id, verify
 *   node dist/scripts/legacy-withdrawals-remove.js rollback --backup=<file>                put the backed-up rows back
 * Prints JSON lines with counts, ids and hashes only: never a name, an IBAN or an amount. Exit codes: 0 ok, 1 failed (roll back), 2 the plan changed.
 */
import { createHash } from 'crypto';
import { gunzipSync, gzipSync } from 'zlib';
import * as fs from 'fs';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { mongoDirectConnection } from '../common/database/mongo-uri';

export const COLLECTION = 'withdrawalrequests';
const out = (o: Record<string, unknown>) => console.log(JSON.stringify(o));
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');

/** The part of a Mongo database this tool uses (a fake in the tests). */
export interface WithdrawalsDb {
  collection(name: string): {
    find(q: Record<string, unknown>): { toArray(): Promise<Array<Record<string, any>>> };
    deleteMany(q: Record<string, unknown>): Promise<{ deletedCount?: number }>;
    insertMany(docs: Array<Record<string, any>>, o?: Record<string, unknown>): Promise<unknown>;
    countDocuments(q?: Record<string, unknown>): Promise<number>;
  };
}
export interface Files { write(path: string, data: Buffer): void; read(path: string): Buffer }
const realFiles: Files = { write: (p, d) => fs.writeFileSync(p, d, { mode: 0o600 }), read: (p) => fs.readFileSync(p) };

async function planOf(db: WithdrawalsDb) {
  const rows = await db.collection(COLLECTION).find({}).toArray();
  const ids = rows.map((r) => String(r._id)).sort();
  return { rows, ids, plan_sha: sha(ids.join(',')), total_changes: ids.length };
}

export async function run(db: WithdrawalsDb, argv: string[], files: Files = realFiles): Promise<number> {
  const cmd = argv[0];
  const arg = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (cmd === 'plan') {
    const p = await planOf(db);
    out({ step: 'plan', collection: COLLECTION, plan_sha: p.plan_sha, total_changes: p.total_changes, ids: p.ids, writes: false });
    return 0;
  }
  if (cmd === 'apply') {
    const expect = arg('expect'); const backup = arg('backup');
    if (!expect || !backup) throw new Error('apply needs --expect=<plan sha> and --backup=<file>');
    const p = await planOf(db);
    if (p.plan_sha !== expect) { out({ step: 'apply', ok: false, reason: 'plan_changed', plan_sha: p.plan_sha }); return 2; }
    if (p.total_changes === 0) { out({ step: 'apply', ok: true, deleted: 0 }); return 0; }
    // the backup is read back and hashed before anything is deleted
    const data = gzipSync(Buffer.from(EJSON.stringify(p.rows, { relaxed: false })));
    files.write(backup, data);
    const back = files.read(backup);
    const restored = EJSON.parse(gunzipSync(back).toString('utf8')) as unknown[];
    if (sha(back) !== sha(data) || restored.length !== p.rows.length) { out({ step: 'backup', ok: false }); return 1; }
    out({ step: 'backup', ok: true, documents: p.rows.length, file_sha256: sha(back) });
    // deletion by the exact _id the plan saw, nothing else
    const planned = p.rows.map((r) => r._id);
    const res = await db.collection(COLLECTION).deleteMany({ _id: { $in: planned } });
    const left = await db.collection(COLLECTION).countDocuments({});
    const ok = (res.deletedCount ?? 0) === planned.length && left === 0;
    out({ step: 'apply', ok, deleted: res.deletedCount ?? 0, remaining: left });
    return ok ? 0 : 1;
  }
  if (cmd === 'rollback') {
    const backup = arg('backup');
    if (!backup) throw new Error('rollback needs --backup=<file>');
    const rows = EJSON.parse(gunzipSync(files.read(backup)).toString('utf8')) as Array<Record<string, any>>;
    const have = new Set((await db.collection(COLLECTION).find({ _id: { $in: rows.map((r) => r._id) } }).toArray()).map((r) => String(r._id)));
    const missing = rows.filter((r) => !have.has(String(r._id)));
    if (missing.length) await db.collection(COLLECTION).insertMany(missing, { ordered: false });
    out({ step: 'rollback', ok: true, restored: missing.length });
    return 0;
  }
  throw new Error('usage: plan | apply --expect=<sha> --backup=<file> | rollback --backup=<file>');
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set in this container');
  const conn = await mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 2, serverSelectionTimeoutMS: 30_000 }).asPromise();
  try { return await run(conn.db as unknown as WithdrawalsDb, argv); } finally { await conn.close().catch(() => undefined); }
}

if (require.main === module) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`error: ${String((e as Error)?.message || e).replace(/(mongodb(\+srv)?|redis(s)?):\/\/\S+/gi, '$1://<hidden>').slice(0, 300)}`); process.exit(1); });
}
