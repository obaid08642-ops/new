/**
 * READ-ONLY finder of test and seed records in production (owner decision 2026-10-28). Run by `tools/ops/tasks/77-test-data-find.sh` inside the backend
 * container (its own MONGO_URL / DB_NAME): `node dist/scripts/test-data-find.js [--ids=<profile id>,<profile id>]`.
 * Prints JSON lines with counts and ids only: per collection how many were scanned, one line per candidate (collection, id, which pattern matched,
 * type) and, for each provider record, how many documents of which collection point at it (orders, bookings, reviews, files, sessions...).
 * Never a name, an e-mail, a phone number, a document or a value of the environment. Writes nothing.
 */
import mongoose from 'mongoose';
import { mongoDirectConnection } from '../common/database/mongo-uri';
import { findTestRecords, scanDb, type ScanDb } from '../modules/catalogs/test-data';

const out = (o: Record<string, unknown>) => console.log(JSON.stringify(o));
/** The three test providers the owner named (production's public map, 2026-10-28): ids are those of the provider records. */
export const KNOWN_TEST_IDS_PREFIX = ['7210a983', 'c142700b', 'f3dee443'];

export async function run(db: ScanDb, ids: string[]): Promise<number> {
  const idsExpanded = [...ids];
  // the known ids are given as prefixes (the owner saw only the start of each): resolve them to the full profile ids
  for (const prefix of KNOWN_TEST_IDS_PREFIX) {
    const hit = await db.collection('provider_profiles').find({ id: { $regex: `^${prefix}` } }, { projection: { _id: 0, id: 1 } }).toArray();
    for (const h of hit) if (typeof h.id === 'string' && !idsExpanded.includes(h.id)) idsExpanded.push(h.id);
  }
  const res = await findTestRecords(db, idsExpanded);
  for (const [collection, n] of Object.entries(res.scanned)) out({ step: 'scanned', collection, documents: n, candidates: res.candidates.filter((c) => c.collection === collection).length });
  for (const c of res.candidates) out({ step: 'candidate', collection: c.collection, id: c.id, matched: c.matched, type: c.type ?? null });
  for (const [id, linked] of Object.entries(res.links)) out({ step: 'links', id, linked, total: Object.values(linked).reduce((a, b) => a + b, 0) });
  out({ step: 'summary', candidates: res.candidates.length, providers: res.candidates.filter((c) => c.collection === 'provider_profiles').length, writes: false });
  return 0;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error('MONGO_URL is not set in this container');
  const arg = argv.find((a) => a.startsWith('--ids='));
  const ids = arg ? arg.slice(6).split(',').map((s) => s.trim()).filter((s) => /^[A-Za-z0-9-]{4,64}$/.test(s)) : [];
  const conn = await mongoose.createConnection(uri, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: mongoDirectConnection(uri), maxPoolSize: 2, serverSelectionTimeoutMS: 30_000 }).asPromise();
  try { return await run(scanDb(conn.db), ids); } finally { await conn.close().catch(() => undefined); }
}

if (require.main === module) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`error: ${String((e as Error)?.message || e).replace(/(mongodb(\+srv)?|redis(s)?):\/\/\S+/gi, '$1://<hidden>').slice(0, 300)}`); process.exit(1); });
}
