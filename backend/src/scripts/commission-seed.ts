/**
 * Writes the commission defaults into `finance_config` `{ key: 'commissions' }` where they are MISSING (owner decision 2026-11-01).
 * Until the document is seeded the resolver charges the system default (10) for every service type, while the admin screen shows
 * pharmacy 10, doctor 15, lab 12, radiology 12, nursing 15. This makes the live number match.
 *
 * Never overwrites: each value is written only while that exact field is absent (a compare-and-set on `$exists: false`), so an
 * admin-set value, even 0, always stays. Dry run by default; `--apply` writes. Run by `tools/ops/tasks/79b-commission-seed.sh` inside the
 * backend container (its own MONGO_URL / DB_NAME). Prints service names and numbers only.
 */
import mongoose from 'mongoose';
import { mongoDirectConnection } from '../common/database/mongo-uri';
import { DEFAULT_COMMISSIONS, DEFAULT_VAT_PERCENT } from '../common/commission-defaults';

export interface SeedDb {
  collection(name: string): {
    findOne(q: Record<string, unknown>): Promise<Record<string, any> | null>;
    insertOne(doc: Record<string, unknown>): Promise<unknown>;
    updateOne(q: Record<string, unknown>, u: Record<string, unknown>): Promise<{ matchedCount?: number; modifiedCount?: number }>;
  };
}

export interface SeedChange { field: string; value: number }
const out = (o: Record<string, unknown>) => console.log(JSON.stringify(o));
const isNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** What is missing: the whole document, or the individual percents (and VAT) the document does not hold. */
export async function planCommissionSeed(db: SeedDb): Promise<{ document_missing: boolean; changes: SeedChange[]; present: SeedChange[] }> {
  const doc = await db.collection('finance_config').findOne({ key: 'commissions' });
  const wanted: SeedChange[] = [
    ...Object.entries(DEFAULT_COMMISSIONS.service_types).map(([t, v]) => ({ field: `service_types.${t}.percent`, value: v.percent })),
    { field: 'tax.vat_percent', value: DEFAULT_VAT_PERCENT },
  ];
  const at = (path: string) => path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), doc);
  return {
    document_missing: !doc,
    changes: wanted.filter((w) => !doc || !isNumber(at(w.field))),
    present: doc ? wanted.filter((w) => isNumber(at(w.field))).map((w) => ({ field: w.field, value: at(w.field) })) : [],
  };
}

export async function applyCommissionSeed(db: SeedDb, apply: boolean): Promise<{ written: SeedChange[]; skipped: SeedChange[] }> {
  const plan = await planCommissionSeed(db);
  if (!apply) return { written: [], skipped: [] };
  const col = db.collection('finance_config');
  if (plan.document_missing) {
    // nothing there: the same document the admin finance suite seeds
    try { await col.insertOne({ key: 'commissions', ...DEFAULT_COMMISSIONS, updatedAt: new Date() }); return { written: plan.changes, skipped: [] }; } catch { /* created by someone meanwhile: fill what is still missing below */ }
  }
  const written: SeedChange[] = []; const skipped: SeedChange[] = [];
  for (const c of plan.changes) {
    // only while the field is absent: a value the admin set meanwhile is never touched
    const note = c.field.startsWith('service_types.') ? { [`${c.field.replace(/\.percent$/, '')}.note`]: (DEFAULT_COMMISSIONS.service_types as Record<string, { note: string }>)[c.field.split('.')[1]].note } : {};
    const res = await col.updateOne({ key: 'commissions', [c.field]: { $exists: false } }, { $set: { [c.field]: c.value, ...note } });
    (res.modifiedCount ?? res.matchedCount ?? 0) > 0 ? written.push(c) : skipped.push(c);
  }
  return { written, skipped };
}

export async function run(db: SeedDb, argv: string[]): Promise<number> {
  const apply = argv.includes('--apply');
  const plan = await planCommissionSeed(db);
  out({ step: 'plan', mode: apply ? 'apply' : 'dry run (nothing is written)', document_missing: plan.document_missing, missing: plan.changes, already_set: plan.present });
  const result = await applyCommissionSeed(db, apply);
  if (apply) {
    out({ step: 'apply', written: result.written, skipped_because_set_meanwhile: result.skipped });
    const after = await planCommissionSeed(db);
    out({ step: 'verify', still_missing: after.changes, ok: after.changes.length === 0 });
    return after.changes.length === 0 ? 0 : 1;
  }
  return 0;
}

async function main(): Promise<number> {
  const uri = process.env.MONGO_URL || process.env.MONGO_URI || '';
  if (!uri) throw new Error('MONGO_URL is not set');
  const conn = await mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 2, serverSelectionTimeoutMS: 30_000 }).asPromise();
  try { return await run(conn.db as unknown as SeedDb, process.argv.slice(2)); } finally { await conn.close().catch(() => undefined); }
}

if (require.main === module) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`error: ${String((e as Error)?.message || e).replace(/(mongodb(\+srv)?|redis(s)?):\/\/\S+/gi, '$1://<hidden>').slice(0, 300)}`); process.exit(1); });
}
