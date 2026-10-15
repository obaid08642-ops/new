/**
 * scripts/migrations/2026-09-catalog-json-to-db.ts against a database shaped like production on 2026-10-15, when
 * the apply failed with E11000 on labservices.id_1: seed docs that carry the JSON's `id` but no short_code/test_code,
 * legacy docs with short_code only, and admin edits that must survive. Runs the real script (ts-node) on an in-memory
 * MongoDB with production's unique `id` indexes.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongo as mdb } from 'mongoose';

jest.setTimeout(240_000);

const BACKEND = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(BACKEND, 'scripts/migrations/2026-09-catalog-json-to-db.ts');
const SEED = path.join(BACKEND, 'src/modules/catalogs/seed-data');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const labs: Array<Record<string, unknown>> = require(path.join(SEED, 'labs.json'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const radiology: Array<Record<string, unknown>> = require(path.join(SEED, 'radiology.json'));

let mongo: MongoMemoryServer;
let client: mdb.MongoClient;
let db: mdb.Db;
let uri: string;

function run(...args: string[]) {
  const r = spawnSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), '--transpile-only', SCRIPT, ...args], {
    cwd: BACKEND,
    env: { ...process.env, MONGODB_URI: uri },
    encoding: 'utf8',
  });
  const out = `${r.stdout}${r.stderr}`;
  const json = out.slice(out.indexOf('{\n'));
  return { status: r.status, out, report: JSON.parse(json.slice(0, json.lastIndexOf('}') + 1)) };
}

const withoutCodes = labs.find((x) => x.id && !x.short_code)!; // the item production failed on
const withShort = labs.filter((x) => x.short_code);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  uri = `${mongo.getUri()}nabd_test`;
  client = await mdb.MongoClient.connect(uri);
  db = client.db();
  for (const c of ['labservices', 'radiologyservices', 'nursing_catalog']) await db.collection(c).createIndex({ id: 1 }, { unique: true });
  await db.collection('labservices').insertMany([
    // seed doc with the JSON id and no code at all (production: id 834c1dc5-…)
    { id: withoutCodes.id, name_en: withoutCodes.name_en, price: 1 },
    // legacy seed doc: short_code only (gets test_code backfilled)
    { id: 'legacy-1', short_code: withShort[0].short_code, name_en: 'legacy' },
    // admin edit of a JSON item, matched by test_code: must not be touched
    { id: 'admin-1', test_code: withShort[1].short_code, short_code: withShort[1].short_code, name_en: 'edited by admin', price: 999 },
    // a JSON item's id on a doc whose code was changed by an admin
    { id: withShort[2].id || `x-${withShort[2].short_code}`, test_code: 'renamed-by-admin', name_en: 'renamed' },
  ]);
  const rad = radiology.find((x) => x.id)!;
  await db.collection('radiologyservices').insertOne({ id: rad.id, name_en: 'seed without short_code' });
});
afterAll(async () => {
  await client?.close();
  await mongo?.stop();
});

describe('2026-09-catalog-json-to-db on a production-shaped database', () => {
  let dry: ReturnType<typeof run>;
  it('dry-run writes nothing and reports what the apply will do, with no conflicts', async () => {
    const before = await db.collection('labservices').countDocuments();
    const coded = await db.collection('labservices').countDocuments({ test_code: { $exists: true } });
    dry = run();
    expect(dry.status).toBe(0);
    expect(dry.report.dry_run).toBe(true);
    expect(dry.report.conflicts).toBe(0);
    expect(dry.report.labs.would_backfill_test_code).toBe(1);
    expect(await db.collection('labservices').countDocuments()).toBe(before);
    expect(await db.collection('labservices').countDocuments({ test_code: { $exists: true } })).toBe(coded);
  });

  it('apply succeeds (no E11000), inserts what the dry-run said, and leaves existing docs alone', async () => {
    const r = run('--apply');
    expect(r.out).not.toMatch(/E11000/);
    expect(r.status).toBe(0);
    expect(r.report.conflicts).toBe(0);
    expect(r.report.labs.inserted).toBe(dry.report.labs.would_insert);
    expect(r.report.radiology.inserted).toBe(dry.report.radiology.would_insert);
    expect(r.report.nursing.inserted).toBe(dry.report.nursing.would_insert);
    // the seed doc production failed on is still one document, untouched
    expect(await db.collection('labservices').countDocuments({ id: withoutCodes.id })).toBe(1);
    expect((await db.collection('labservices').findOne({ id: withoutCodes.id }))!.price).toBe(1);
    const admin = await db.collection('labservices').findOne({ id: 'admin-1' });
    expect(admin!.name_en).toBe('edited by admin');
    expect(admin!.price).toBe(999);
    expect((await db.collection('labservices').findOne({ id: 'legacy-1' }))!.test_code).toBe(withShort[0].short_code);
    // no id appears twice
    const dups = await db.collection('labservices').aggregate([{ $group: { _id: '$id', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]).toArray();
    expect(dups).toEqual([]);
    expect(await db.collection('insurancecompanies').countDocuments()).toBeGreaterThan(0);
  });

  it('a second apply inserts nothing', async () => {
    const r = run('--apply');
    expect(r.status).toBe(0);
    expect(r.report.labs.inserted).toBe(0);
    expect(r.report.radiology.inserted).toBe(0);
    expect(r.report.nursing.inserted).toBe(0);
    expect(r.report.insurance.companies.inserted).toBe(0);
    expect(r.report.insurance.networks.inserted).toBe(0);
  });

  it('an insert that would repeat another unique value is skipped and counted, not a crash', async () => {
    await db.dropDatabase();
    await db.collection('labservices').createIndex({ id: 1 }, { unique: true });
    await db.collection('labservices').createIndex({ name_en: 1 }, { unique: true, partialFilterExpression: { name_en: { $type: 'string' } } });
    const victim = withShort[3];
    await db.collection('labservices').insertOne({ id: 'other-doc', test_code: 'other', name_en: victim.name_en });
    const r = run('--apply');
    expect(r.status).toBe(0);
    expect(r.out).not.toMatch(/E11000/);
    expect(r.report.labs.conflict).toBeGreaterThan(0);
    expect(r.out).toMatch(/"unique_key":"name_en"/);
  });
});
