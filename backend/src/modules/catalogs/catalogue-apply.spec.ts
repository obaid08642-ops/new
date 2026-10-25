/**
 * The production catalogue apply (item 3): plan → hash → backup → guarded writes → verify → rollback, on an in-memory MongoDB.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, BATCH, decodeBackup, isTransientMongoError, withRetry, encodeBackup, planSha, rollbackChanges, sha256, stable, type Change, type DbLike } from './catalogue-apply.core';
import { computePlan, main } from '../../scripts/catalogue-apply';
import { tidy } from './catalogue-apply.steps';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;
let db: DbLike;
let dir: string;

const raw = () => mongoose.connection.db!;
const csv = fs.readFileSync(path.join(__dirname, '../medicines/data/medicine-translations-2026-10-24.csv'), 'utf8');
const firstSource = csv.split('\n')[1].match(/^"([^"]+)"/)![1]; // an English product name the reviewed CSV translates

const districtsExtract = {
  cities: [{ code: 'sa-riyadh', lat: 24.71, lng: 46.67, source: 'osm:place=city' }],
  districts: [
    { city_code: 'sa-riyadh', name_ar: 'الملقا', name_en: 'Malqa', lat: 24.81, lng: 46.62, source: 'osm:node/1' },
    { city_code: 'sa-riyadh', name_ar: 'العليا', name_en: 'Al Olaya', lat: 24.69, lng: 46.68, source: 'osm:node/2' },
  ],
};

async function seed() {
  await raw().collection('medicines').deleteMany({});
  await raw().collection('locations').deleteMany({});
  await raw().collection('insurance_companies').deleteMany({});
  await raw().collection('medicines').insertMany([
    { id: 'm1', name_en: firstSource, name_ar: 'دواء  أول ', translations: { ur: { name: firstSource } } },
    { id: 'm2', name_en: 'Plain', name_ar: 'سليم', translations: { ur: { name: 'اردو موجود' } } },
    { id: 'm3', name_en: ' Spaced  Name', name_ar: 'ثالث' },
  ]);
  await raw().collection('locations').insertMany([
    { code: 'sa-riyadh', type: 'city', name_ar: 'الرياض', name_en: '' },
    { code: 'sa-riyadh-001', type: 'district', parent_code: 'sa-riyadh', name_ar: 'حي الملقا', name_en: 'Al Malqa District' },
  ]);
  await raw().collection('insurance_companies').insertMany([{ code: 'bupa', name_ar: '', name_en: 'Bupa Arabia' }]);
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'catalogue_apply_test' });
  db = raw() as unknown as DbLike;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-apply-'));
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); fs.rmSync(dir, { recursive: true, force: true }); });
beforeEach(seed);

const writeFile = (name: string, text: string) => { const p = path.join(dir, name); fs.writeFileSync(p, text); return p; };

describe('plan', () => {
  it('lists every step with counts and writes nothing', async () => {
    const before = await raw().collection('medicines').find({}).toArray();
    const p = await computePlan(db, ['plan', `--districts=${writeFile('d.json', JSON.stringify(districtsExtract))}`]);
    const byStep = (step: string) => p.changes.filter((c) => c.step === step);
    expect(byStep('medicine_translations').length).toBeGreaterThan(0);
    expect(byStep('names_ar_en').map((c) => `${c.collection}.${(c as any).path}`).sort()).toEqual(['insurance_companies.name_ar', 'locations.name_en']); // only the empty ones that the seed knows
    expect(byStep('medicine_name_hygiene').map((c) => `${(c as any).key.id}.${(c as any).path}`).sort()).toEqual(['m1.name_ar', 'm3.name_en']);
    expect(byStep('districts').filter((c) => c.kind === 'insert')).toHaveLength(1);                // Al Olaya is new, Malqa exists
    expect(await raw().collection('medicines').find({}).toArray()).toEqual(before);
    expect(p.sha).toMatch(/^[0-9a-f]{64}$/);
  });

  it('has a stable hash: the same database and inputs give the same one, another input another one', async () => {
    const a = await computePlan(db, ['plan']);
    const b = await computePlan(db, ['plan']);
    expect(a.sha).toBe(b.sha);
    const c = await computePlan(db, ['plan', `--districts=${writeFile('d2.json', JSON.stringify(districtsExtract))}`]);
    expect(c.sha).not.toBe(a.sha);
  });

  it('skips the optional inputs when they are not given', async () => {
    const p = await computePlan(db, ['plan']);
    expect(p.report.districts).toMatch(/skipped/);
    expect(p.report.name_fixes).toMatch(/skipped/);
    expect(p.changes.some((c) => c.step === 'districts')).toBe(false);
  });
});

describe('apply → verify → rollback (the whole run through the CLI entry)', () => {
  const run = async (args: string[]) => {
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((m: string) => { logs.push(String(m)); });
    process.env.MONGO_URL = mongod.getUri();
    process.env.DB_NAME = 'catalogue_apply_test';
    try { return { code: await main(args), logs }; } finally { spy.mockRestore(); }
  };

  it('refuses a plan hash that does not match, and writes nothing', async () => {
    const backup = path.join(dir, 'no.json.gz');
    const { code, logs } = await run(['apply', `--expect=${'0'.repeat(64)}`, `--backup=${backup}`]);
    expect(code).toBe(2);
    expect(logs.join('\n')).toContain('plan_changed');
    expect(fs.existsSync(backup)).toBe(false);
    expect((await raw().collection('medicines').findOne({ id: 'm1' }))!.name_ar).toBe('دواء  أول ');
  });

  it('backs up first, applies exactly the planned changes, verifies, and a rollback restores the database byte for byte', async () => {
    const extra = [`--districts=${writeFile('dx.json', JSON.stringify(districtsExtract))}`];
    const snapshot = async () => ({
      medicines: await raw().collection('medicines').find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray(),
      locations: await raw().collection('locations').find({}, { projection: { _id: 0, createdAt: 0, updatedAt: 0 } }).sort({ code: 1 }).toArray(),
      insurers: await raw().collection('insurance_companies').find({}, { projection: { _id: 0 } }).toArray(),
    });
    const original = await snapshot();

    const plan = await run(['plan', ...extra]);
    const sha = JSON.parse(plan.logs[0]).plan_sha as string;
    const backup = path.join(dir, 'run1.json.gz');
    const applied = await run(['apply', `--expect=${sha}`, `--backup=${backup}`, ...extra]);
    expect(applied.code).toBe(0);
    const lines = applied.logs.map((l) => JSON.parse(l));
    expect(lines[0]).toMatchObject({ step: 'backup' });
    expect(lines[0].file_sha256).toBe(sha256(fs.readFileSync(backup)));
    expect(lines[1]).toMatchObject({ step: 'apply', ok: true, remaining_changes: 0, skipped_changed_since_plan: 0, counts_ok: true });

    // what changed
    expect((await raw().collection('medicines').findOne({ id: 'm1' }))!.name_ar).toBe('دواء أول');
    expect((await raw().collection('medicines').findOne({ id: 'm3' }))!.name_en).toBe('Spaced Name');
    expect((await raw().collection('medicines').findOne({ id: 'm2' }))!.translations.ur.name).toBe('اردو موجود'); // a non-English value is never overwritten
    expect((await raw().collection('insurance_companies').findOne({ code: 'bupa' }))!.name_ar).toBeTruthy();
    expect((await raw().collection('locations').findOne({ code: 'sa-riyadh-001' }))!.coordinates).toEqual({ lat: 24.81, lng: 46.62 });
    expect(await raw().collection('locations').countDocuments({ type: 'district' })).toBe(2);

    // verify = an empty plan; a second apply of the same hash has nothing left (the hash differs now)
    expect((await run(['verify', ...extra])).code).toBe(0);

    // rollback
    const rolled = await run(['rollback', `--backup=${backup}`]);
    expect(JSON.parse(rolled.logs[0])).toMatchObject({ ok: true, skipped_changed_since: 0 });
    expect(await snapshot()).toEqual(original);
  });

  it('a value edited after the plan is skipped, not overwritten, and the run reports it (so the task rolls back)', async () => {
    const p = await computePlan(db, ['plan']);
    await raw().collection('medicines').updateOne({ id: 'm1' }, { $set: { name_ar: 'تعديل المشرف' } });
    const res = await applyChanges(db, p.changes);
    expect(res.skipped_changed_since_plan).toBeGreaterThan(0);
    expect((await raw().collection('medicines').findOne({ id: 'm1' }))!.name_ar).toBe('تعديل المشرف');
  });
});

describe('owner-approved name fixes (#1556)', () => {
  it('plans only approved=yes rows that pass the script\'s checks, once, and applies and rolls them back', async () => {
    const _id = new mongoose.Types.ObjectId();
    await raw().collection('medicines').insertOne({ _id, id: 'm9', name_en: 'Panadol 500 Mg', name_ar: 'بنادول 500 مجم' });
    const head = 'sku,id,field,before,proposal,source,reason,approved';
    const good = `1,${_id.toHexString()},name_ar,بنادول 500 مجم,بنادول 500 مجم - 24 قرص,new_text,test,yes`;
    const notApproved = `2,${new mongoose.Types.ObjectId().toHexString()},name_ar,س,سص,new_text,test,`;
    const notArabicField = `3,${_id.toHexString()},translations.ur.name,x,y,new_text,test,yes`;
    const file = writeFile('approved.csv', [head, good, notApproved, notArabicField].join('\n') + '\n');
    const plan = await computePlan(db, ['plan', `--name-fixes=${file}`]);
    const fixes = plan.changes.filter((c) => c.step === 'medicine_name_fixes');
    expect(fixes).toHaveLength(1);
    expect(plan.report.name_fixes).toMatchObject({ approved: 2, refused: 1 });
    await applyChanges(db, fixes);
    expect((await raw().collection('medicines').findOne({ id: 'm9' }))!.name_ar).toBe('بنادول 500 مجم - 24 قرص');
    // already applied: a fresh plan has nothing left for it
    expect((await computePlan(db, ['plan', `--name-fixes=${file}`])).changes.filter((c) => c.step === 'medicine_name_fixes')).toHaveLength(0);
    await rollbackChanges(db, fixes);
    expect((await raw().collection('medicines').findOne({ id: 'm9' }))!.name_ar).toBe('بنادول 500 مجم');
  });
});

describe('the pieces', () => {
  it('tidy only collapses whitespace', () => {
    expect(tidy('  a   b  ')).toBe('a b');
    expect(tidy('نص سليم')).toBe('نص سليم');
  });

  it('the backup round-trips an ObjectId key and a date', () => {
    const id = new mongoose.Types.ObjectId();
    const changes: Change[] = [{ kind: 'set', step: 's', collection: 'c', key: { _id: id }, path: 'p', before: null, after: { when: new Date('2026-10-25T00:00:00Z') } }];
    const back = decodeBackup(encodeBackup({ meta: { created_at: 'x', db: 'd', plan_sha: planSha(changes, {}), inputs: {}, counts: {} }, changes }));
    expect(stable(back.changes)).toBe(stable(changes));
    expect((back.changes[0] as any).key._id).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it('the hash does not depend on the order of the changes', () => {
    const a: Change = { kind: 'set', step: 's', collection: 'c', key: { id: 1 }, path: 'p', before: null, after: 'x' };
    const b: Change = { ...a, key: { id: 2 } };
    expect(planSha([a, b], { f: '1' })).toBe(planSha([b, a], { f: '1' }));
    expect(planSha([a, b], { f: '1' })).not.toBe(planSha([a, b], { f: '2' }));
  });

  it('rollback leaves a value that was edited after the apply', async () => {
    await seed();
    const p = await computePlan(db, ['plan']);
    await applyChanges(db, p.changes);
    await raw().collection('medicines').updateOne({ id: 'm1' }, { $set: { name_ar: 'نص جديد' } });
    const res = await rollbackChanges(db, p.changes);
    expect(res.skipped_changed_since).toBeGreaterThan(0);
    expect((await raw().collection('medicines').findOne({ id: 'm1' }))!.name_ar).toBe('نص جديد');
  });

  it('the packaged CSV is the reviewed file (same bytes as data/catalogue-input-01)', () => {
    const original = fs.readFileSync(path.join(__dirname, '../../../../data/catalogue-input-01/medicine-translations-2026-10-24.csv'), 'utf8');
    expect(sha256(csv)).toBe(sha256(original));
  });
});

describe('a dropped connection (production run 17: "connection 1 closed")', () => {
  const netError = () => Object.assign(new Error('connection 1 to 10.0.0.1:27017 closed'), { name: 'MongoNetworkError' });

  /** A db whose bulkWrite performs the write and THEN drops (the ambiguous case), for the first `failures` calls from the `from`-th. */
  function flaky(failures: number, from = 2): { db: DbLike; calls: () => number } {
    let calls = 0; let failed = 0;
    const wrapped: DbLike = {
      collection: (name: string) => {
        const real = db.collection(name);
        return new Proxy(real as any, {
          get(target, prop) {
            if (prop !== 'bulkWrite') return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
            return async (ops: any[], options: any) => {
              calls += 1;
              const res = await target.bulkWrite(ops, options);
              if (calls >= from && failed < failures) { failed += 1; throw netError(); }
              return res;
            };
          },
        });
      },
    };
    return { db: wrapped, calls: () => calls };
  }

  const snapshot = async () => (await raw().collection('medicines').find({}).sort({ id: 1 }).toArray());

  async function seedMany(n: number) {
    await raw().collection('medicines').deleteMany({});
    await raw().collection('medicines').insertMany(Array.from({ length: n }, (_, i) => ({ id: `bulk${i}`, name_en: `Name ${i}`, name_ar: `  اسم   ${i} ` })));
  }

  it('applies in batches of 100, retries the batch that dropped, and ends with nothing left to change', async () => {
    const n = BATCH * 2 + 50;
    await seedMany(n);
    const plan = await computePlan(db, ['plan']);
    const fixes = plan.changes.filter((c) => c.collection === 'medicines');
    expect(fixes.length).toBeGreaterThanOrEqual(n);
    const f = flaky(2);
    const res = await applyChanges(f.db, plan.changes);
    expect(res.retried_batches).toBe(2);
    expect(f.calls()).toBeGreaterThan(Math.floor(fixes.length / BATCH)); // more than one batch, plus the retries
    expect((await computePlan(db, ['plan'])).changes).toHaveLength(0); // idempotent: the retry applied nothing twice and lost nothing
  });

  it('gives up with the error after the attempts are used (the task then rolls back)', async () => {
    await seedMany(10);
    const plan = await computePlan(db, ['plan']);
    const f = flaky(1000, 1);
    await expect(applyChanges(f.db, plan.changes)).rejects.toMatchObject({ name: 'MongoNetworkError' });
  });

  it('a rollback also survives a dropped connection and restores the backup state', async () => {
    await seedMany(BATCH + 20);
    const original = await snapshot();
    const plan = await computePlan(db, ['plan']);
    await applyChanges(db, plan.changes);
    const f = flaky(1, 1);
    const res = await rollbackChanges(f.db, plan.changes);
    expect(res.retried_batches).toBe(1);
    expect(await snapshot()).toEqual(original);
  });

  it('retries only network errors, not a real failure', async () => {
    expect(isTransientMongoError(netError())).toBe(true);
    expect(isTransientMongoError(new Error('Topology is closed, please connect'))).toBe(true);
    expect(isTransientMongoError(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }))).toBe(false);
    let tries = 0;
    await expect(withRetry(async () => { tries += 1; throw new Error('E11000 duplicate key'); }, undefined, async () => undefined)).rejects.toThrow('E11000');
    expect(tries).toBe(1);
  });
});
