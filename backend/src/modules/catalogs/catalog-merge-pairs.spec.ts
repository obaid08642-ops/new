/**
 * Reviewed duplicate pairs (docs/catalog-audit-gaps.md): pure helpers, the seed data holds one row per pair, and the real
 * migration (ts-node) on an in-memory MongoDB keeps the older row, re-points references, copies missing fields and never
 * deletes a row.
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongo as mdb } from 'mongoose';
import { MergePair, createdTime, matchesPair, olderRow } from './catalog-merge-pairs';

jest.setTimeout(240_000);

const BACKEND = path.resolve(__dirname, '../../..');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PAIRS: MergePair[] = require('./content/catalog-merge-pairs.v1.json').pairs;
const SEEDS: Record<string, string> = { lab_services: 'labs.json', nursing_services: 'nursing.json' };

describe('catalog merge pairs (pure)', () => {
  it('lists 3 packages and 4 nursing services', () => {
    expect(PAIRS.filter((p) => p.catalogue === 'lab_services')).toHaveLength(3);
    expect(PAIRS.filter((p) => p.catalogue === 'nursing_services')).toHaveLength(4);
  });
  it('matches by English name, Arabic name or code; a package never matches a single test', () => {
    const general = PAIRS.find((p) => p.id === 'pkg-general') as MergePair;
    expect(matchesPair({ name_en: 'Comprehensive Health Package', is_package: true }, general)).toBe(true);
    expect(matchesPair({ name_ar: 'باقة الصحة العامة', is_package: true }, general)).toBe(true);
    expect(matchesPair({ name_en: 'x', short_code: 'PKG_GENERAL', is_package: true }, general)).toBe(true);
    expect(matchesPair({ name_en: 'Comprehensive Health Package', is_package: false }, general)).toBe(false);
    expect(matchesPair({ name_en: 'Comprehensive Health Package', is_package: true, is_deleted: true, merged_into: 'a' }, general)).toBe(false);
  });
  it('the heart pair puts the kept package in the cardiac category', () => {
    expect((PAIRS.find((p) => p.id === 'pkg-heart') as MergePair).set_on_kept).toEqual({ category: 'cardiac' });
  });
  it('keeps the older row, whatever the order', () => {
    const a = { id: 'a', createdAt: new Date('2026-03-01') };
    const b = { id: 'b', createdAt: new Date('2026-01-01') };
    expect(olderRow([a, b]).id).toBe('b');
    expect(olderRow([{ id: 'z' }, { id: 'y' }]).id).toBe('y');
    expect(createdTime({ id: 'n' })).toBe(Number.MAX_SAFE_INTEGER);
  });
  it.each(Object.entries(SEEDS))('seed-data for %s holds at most one row of every pair', (collection, file) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rows = require(path.join(BACKEND, 'src/modules/catalogs/seed-data', file));
    for (const pair of PAIRS.filter((p) => p.catalogue === collection)) {
      expect(rows.filter((r: Record<string, unknown>) => matchesPair(r, pair)).length).toBeLessThanOrEqual(1);
    }
  });
});

describe('2026-10-catalogue-merge-pairs on a production-shaped database', () => {
  let mongo: MongoMemoryServer;
  let client: mdb.MongoClient;
  let db: mdb.Db;
  let uri: string;
  const run = (args: string[] = [], env: Record<string, string> = {}) => {
    const r = spawnSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), '--transpile-only', path.join(BACKEND, 'scripts/migrations/2026-10-catalogue-merge-pairs.ts'), ...args], {
      cwd: BACKEND, env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri, ...env }, encoding: 'utf8',
    });
    const out = `${r.stdout}${r.stderr}`;
    const line = out.split('\n').find((l) => l.startsWith('{"mode"'));
    return { status: r.status, out, report: line ? JSON.parse(line) : null };
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    uri = `${mongo.getUri()}nabd_pairs`;
    client = await mdb.MongoClient.connect(uri);
    db = client.db();
    await db.collection('lab_services').insertMany([
      { id: 'pkg-old', short_code: 'PKG_GENERAL', name_ar: 'باقة الصحة العامة', name_en: 'General Wellness Package', is_package: true, included_services: ['CBC'], price: 300, active: true, createdAt: new Date('2026-01-01') },
      { id: 'pkg-new', test_code: 'comprehensive_health_package', name_ar: 'باقة الفحص الشامل', name_en: 'Comprehensive Health Package', is_package: true, included_services: ['CBC', 'LIP'], description_en: 'Full check', price: 350, active: true, createdAt: new Date('2026-05-01') },
      { id: 'lab-cbc', short_code: 'CBC', name_ar: 'تحليل دم شامل', name_en: 'Complete Blood Count', active: true },
      { id: 'heart-old', short_code: 'PKG_HEART', name_ar: 'باقة صحة القلب', name_en: 'Heart Health Package', is_package: true, category: 'package', active: true, createdAt: new Date('2026-01-02') },
      { id: 'heart-new', name_ar: 'باقة القلب', name_en: 'Cardiac Package', is_package: true, category: 'cardiac', active: true, createdAt: new Date('2026-05-02') },
    ]);
    await db.collection('labbookings').insertOne({ id: 'bk-1', items: [{ service_id: 'pkg-new' }] });
    await db.collection('nursing_services').insertMany([
      { id: 'n-wound-new', name_ar: 'تغيير على الجروح', name_en: 'Wound Dressing', price: 80, active: true, createdAt: new Date('2026-06-01') },
      { id: 'n-wound-old', name_ar: 'العناية بالجروح العميقة والسكري', name_en: 'Advanced Wound & Diabetic Foot Care', price: 120, active: true, createdAt: new Date('2026-02-01') },
      { id: 'n-vitals', name_ar: 'قياس العلامات الحيوية', name_en: 'Vital Signs Monitoring', active: true },
    ]);
    await db.collection('homecarebookings').insertOne({ id: 'hb-1', service_id: 'n-wound-new' });
    await db.collection('provider_profiles').insertOne({ id: 'pp-1', nursing_services: [{ key: 'n-wound-old', price: 100 }, { key: 'n-wound-new', price: 90 }] });
  });
  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });

  it('refuses production without the confirm variable', () => {
    const r = run([], { NODE_ENV: 'production' });
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('CONFIRM_CATALOGUE_MERGE_PAIRS');
  });

  it('dry run reports each pair and changes nothing', async () => {
    const r = run();
    expect(r.status).toBe(0);
    const pkg = r.report.report.find((x: { pair: string }) => x.pair === 'pkg-general');
    expect(pkg).toEqual(expect.objectContaining({ kept: 'pkg-old', removed: ['pkg-new'], price_differs: [{ id: 'pkg-new', price: 350, kept_price: 300 }] }));
    expect(await db.collection('lab_services').countDocuments({ is_deleted: true })).toBe(0);
    expect((await db.collection('labbookings').findOne({ id: 'bk-1' }))?.items[0].service_id).toBe('pkg-new');
  });

  it('apply keeps the older id, moves references, copies missing fields and deletes nothing', async () => {
    const before = await db.collection('lab_services').countDocuments() + (await db.collection('nursing_services').countDocuments());
    const r = run(['--apply']);
    expect(r.status).toBe(0);
    expect(await db.collection('lab_services').countDocuments() + (await db.collection('nursing_services').countDocuments())).toBe(before);
    const kept = await db.collection('lab_services').findOne({ id: 'pkg-old' });
    expect(kept?.active).toBe(true);
    expect(kept?.description_en).toBe('Full check');
    // the removed heart package was the only one in the cardiac category: the kept one takes it over
    expect((await db.collection('lab_services').findOne({ id: 'heart-old' }))?.category).toBe('cardiac');
    const gone = await db.collection('lab_services').findOne({ id: 'pkg-new' });
    expect(gone).toEqual(expect.objectContaining({ active: false, is_deleted: true, merged_into: 'pkg-old' }));
    expect(await db.collection('archive_lab_services').countDocuments({ id: 'pkg-new', merged_into: 'pkg-old' })).toBe(1);
    expect((await db.collection('labbookings').findOne({ id: 'bk-1' }))?.items[0].service_id).toBe('pkg-old');
    expect((await db.collection('homecarebookings').findOne({ id: 'hb-1' }))?.service_id).toBe('n-wound-old');
    expect((await db.collection('nursing_services').findOne({ id: 'n-wound-new' }))?.merged_into).toBe('n-wound-old');
    expect((await db.collection('nursing_services').findOne({ id: 'n-vitals' }))?.active).toBe(true);
    const report = r.report.report.find((x: { pair: string }) => x.pair === 'nursing-wound');
    expect(report.still_referenced).toBe(0);
    expect(report.provider_duplicates).toEqual([expect.objectContaining({ doc: 'pp-1' })]);
  });

  it('a second run finds nothing to merge', () => {
    const r = run(['--apply']);
    expect(r.status).toBe(0);
    for (const e of r.report.report) expect(e.removed).toBeUndefined();
  });
});
