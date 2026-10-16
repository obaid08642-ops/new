/**
 * #1556 owner decision F: duplicate service rows deleted after their references are re-pointed, orphan insurance
 * networks attached on evidence only, and one lab list. Runs the real scripts (ts-node) against an in-memory MongoDB
 * holding the production shapes from the 2026-10-16 audit (two seeders' rows for one test, old `ar`/`en` and
 * `title` shapes, networks of a missing company, the old `lab_tests` list).
 */
import { spawnSync } from 'child_process';
import * as path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongo as mdb } from 'mongoose';
import { duplicateGroups, normalizeName, pickKeeper, rewritePath } from './catalog-dedupe';

jest.setTimeout(240_000);

const BACKEND = path.resolve(__dirname, '../../..');
const SEED = path.join(BACKEND, 'src/modules/catalogs/seed-data');

let mongo: MongoMemoryServer;
let client: mdb.MongoClient;
let db: mdb.Db;
let uri: string;

function run(script: string, args: string[] = [], env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), '--transpile-only', path.join(BACKEND, 'scripts/migrations', script), ...args], {
    cwd: BACKEND,
    env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: uri, ...env },
    encoding: 'utf8',
  });
  const out = `${r.stdout}${r.stderr}`;
  const line = out.split('\n').find((l) => l.startsWith('{"mode"'));
  return { status: r.status, out, report: line ? JSON.parse(line) : null };
}

describe('catalog-dedupe helpers', () => {
  it('folds Arabic spelling variants and Latin case', () => {
    expect(normalizeName('تحليل دم شامل (CBC)')).toBe(normalizeName('تحليل دم شامل CBC'));
    expect(normalizeName('فيتامين د')).toBe(normalizeName('فيتامين دّ'));
    expect(normalizeName('الاتحاد للتأمين')).toBe(normalizeName('الإتحاد للتامين'));
  });
  it('groups by name or code and keeps the live, coded row', () => {
    const rows = [
      { id: 'a', name_ar: 'تحليل بول كامل', name_en: 'Urine Analysis', short_code: 'URINE', active: true },
      { id: 'b', name_ar: 'تحليل بول كامل', name_en: 'Urine Complete', short_code: 'UA', active: true, medical_review_status: 'approved' },
      { id: 'c', name_ar: 'سكر صائم', name_en: 'FBS', short_code: 'FBS' },
    ];
    const groups = duplicateGroups(rows);
    expect(groups).toHaveLength(1);
    expect(pickKeeper(groups[0]).id).toBe('b');
  });
  it('joins the reviewed same-service names and nothing near them', () => {
    expect(duplicateGroups([{ name_en: 'CT Brain' }, { name_en: 'Brain CT Scan' }])).toHaveLength(1);
    expect(duplicateGroups([{ name_en: 'MRI Spine' }, { name_en: 'Lumbar Spine MRI' }])).toHaveLength(0);
  });
  it('does not merge a test with the package of the same name', () => {
    expect(duplicateGroups([{ name_en: 'Thyroid', is_package: true }, { name_en: 'Thyroid' }], { byPackage: true })).toHaveLength(0);
  });
  it('rewrites nested and array references without leaving duplicates', () => {
    const doc = { items: [{ service_id: 'old' }, { service_id: 'x' }], test_categories: ['old', 'keep'] };
    const map = new Map([['old', 'keep']]);
    expect(rewritePath(doc, 'items.service_id', map)).toBe(1);
    expect(rewritePath(doc, 'test_categories', map)).toBe(1);
    expect(doc).toEqual({ items: [{ service_id: 'keep' }, { service_id: 'x' }], test_categories: ['keep'] });
  });
  it.each(['labs.json', 'radiology.json', 'nursing.json', 'specialties.json', 'insurance.json'])('seed-data/%s holds one row per service', (f) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rows = require(path.join(SEED, f));
    const groups = duplicateGroups(rows, { byPackage: f === 'labs.json' });
    expect(groups.map((g) => g.map((x: Record<string, unknown>) => x.name_en))).toEqual([]);
  });
});

describe('scripts on a production-shaped database', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    uri = `${mongo.getUri()}nabd_dedupe`;
    client = await mdb.MongoClient.connect(uri);
    db = client.db();
    await db.collection('lab_services').insertMany([
      { id: 'lab-ua', name_ar: 'تحليل بول كامل', name_en: 'Urine Complete', short_code: 'UA', active: true, medical_review_status: 'approved', price: 30, createdAt: new Date('2026-01-01') },
      { id: 'lab-urine', name_ar: 'تحليل بول كامل', name_en: 'Urine Analysis', short_code: 'URINE', test_code: 'URINE', active: true, price: 30, description_en: 'Urine test', createdAt: new Date('2026-02-01') },
      { id: 'lab-cbc', name_ar: 'تحليل دم شامل (CBC)', name_en: 'Complete Blood Count', short_code: 'CBC', active: true, medical_review_status: 'approved', price: 45 },
      { id: 'pkg-1', name_ar: 'باقة', name_en: 'Basic Package', is_package: true, included_services: ['URINE', 'CBC'], active: true, price: 99 },
    ]);
    await db.collection('labbookings').insertOne({ id: 'bk-1', items: [{ service_id: 'lab-urine', price: 30 }, { service_id: 'lab-cbc' }] });
    await db.collection('provider_capabilities_lab').insertOne({ id: 'cap-1', provider_account_id: 'lab-a', code: 'lab-urine', price: 25 });
    await db.collection('provider_profiles').insertOne({ id: 'pp-1', test_categories: ['lab-urine', 'lab-ua'], nursing_services: [{ key: 'n-old', price: 100 }], accepted_insurance: ['ins-dup'] });
    await db.collection('nursing_services').insertMany([
      { id: 'n-new', name_ar: 'قياس العلامات الحيوية', name_en: 'Vital Signs Monitoring', code: 'n-new', active: true, medical_review_status: 'approved' },
      { id: 'n-old', title: { ar: 'قياس العلامات الحيوية', en: 'Vital Signs Monitoring' }, active: true },
    ]);
    await db.collection('homecarebookings').insertOne({ id: 'hb-1', service_id: 'n-old' });
    await db.collection('specialties').insertMany([
      { id: 'spec-cardiology', code: 'cardiology', name_ar: 'قلب وأوعية دموية', name_en: 'cardiology' },
      { id: 'sp-old', code: 'Cardiology', ar: 'قلب وأوعية دموية', en: 'Cardiology' },
    ]);
    await db.collection('provider_profiles').insertOne({ id: 'pp-2', specialty: 'Cardiology' });
    await db.collection('insurance_companies').insertMany([
      { id: 'ins-keep', code: 'alrajhi_takaful', name_ar: 'تكافل الراجحي', name_en: 'Al Rajhi Takaful', catalog_status: 'verified', is_active: true },
      { id: 'ins-dup', code: 'rajhi', ar: 'تكافل الراجحي', en: 'Al Rajhi Takaful' },
      { id: 'ins-bupa', code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia', is_active: true },
    ]);
    await db.collection('insurance_networks').insertMany([
      { id: 'net-k-gold', company_id: 'ins-keep', code: 'gold', name_ar: 'ذهبي', name_en: 'Gold' },
      { id: 'net-d-gold', company_id: 'ins-dup', code: 'gold', name_ar: 'ذهبي', name_en: 'Gold' },
      { id: 'net-d-silver', company_id: 'ins-dup', code: 'silver', name_ar: 'فضي', name_en: 'Silver' },
      // orphans: by company code field, by code prefix, and one with no evidence
      { id: 'net-o1', company_id: 'gone-1', company_name: 'Bupa Arabia', code: 'blue', name_ar: 'أزرق', name_en: 'Blue' },
      { id: 'net-o2', company_id: 'gone-2', code: 'bupa-silver', name_ar: 'فضي', name_en: 'Silver' },
      { id: 'net-o3', company_id: 'gone-3', code: 'vip', name_ar: 'كبار الشخصيات', name_en: 'VIP' },
    ]);
    await db.collection('patient_profiles').insertOne({ id: 'pat-1', insurance: { company_id: 'ins-dup' } });
    await db.collection('lab_tests').insertMany([
      { id: 'lt-cbc', test_name_ar: 'تحليل دم شامل', test_name_en: 'Complete Blood Count', code: 'CBC', description_ar: 'وصف قديم' },
      { id: 'lt-new', test_name_ar: 'تحليل الأمونيا', test_name_en: 'Ammonia', code: 'NH3', price: 120 },
    ]);
    await db.collection('labbookings').insertOne({ id: 'bk-2', items: [{ service_id: 'lt-new' }] });
  });
  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });

  it('refuses production without the confirm variable', () => {
    const r = run('2026-10-services-dedupe.ts', [], { NODE_ENV: 'production' });
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('CONFIRM_SERVICES_DEDUPE');
    for (const s of ['2026-10-insurance-orphan-networks.ts', '2026-10-unify-lab-list.ts']) {
      expect(run(s, [], { NODE_ENV: 'production' }).status).not.toBe(0);
    }
  });

  it('dry run reports the groups and changes nothing', async () => {
    const r = run('2026-10-services-dedupe.ts');
    expect(r.status).toBe(0);
    const lab = r.report.report.find((x: { collection: string }) => x.collection === 'lab_services');
    expect(lab.groups).toEqual([expect.objectContaining({ kept: 'lab-ua', removed: ['lab-urine'] })]);
    expect(await db.collection('lab_services').countDocuments()).toBe(4);
  });

  it('apply keeps one row per service and re-points every reference', async () => {
    const r = run('2026-10-services-dedupe.ts', ['--apply']);
    expect(r.status).toBe(0);
    expect(await db.collection('lab_services').countDocuments({ id: 'lab-urine' })).toBe(0);
    expect(await db.collection('archive_lab_services').countDocuments({ id: 'lab-urine', merged_into: 'lab-ua' })).toBe(1);
    expect((await db.collection('lab_services').findOne({ id: 'lab-ua' }))?.description_en).toBe('Urine test');
    expect((await db.collection('labbookings').findOne({ id: 'bk-1' }))?.items.map((i: { service_id: string }) => i.service_id)).toEqual(['lab-ua', 'lab-cbc']);
    expect((await db.collection('provider_capabilities_lab').findOne({ id: 'cap-1' }))?.code).toBe('lab-ua');
    expect((await db.collection('lab_services').findOne({ id: 'pkg-1' }))?.included_services).toEqual(['UA', 'CBC']);
    const pp = await db.collection('provider_profiles').findOne({ id: 'pp-1' });
    expect(pp?.test_categories).toEqual(['lab-ua']);
    expect(pp?.nursing_services[0].key).toBe('n-new');
    expect(pp?.accepted_insurance).toEqual(['ins-keep']);
    expect(await db.collection('nursing_services').countDocuments()).toBe(1);
    expect((await db.collection('homecarebookings').findOne({ id: 'hb-1' }))?.service_id).toBe('n-new');
    expect(await db.collection('specialties').countDocuments()).toBe(1);
    expect((await db.collection('provider_profiles').findOne({ id: 'pp-2' }))?.specialty).toBe('cardiology');
    expect(await db.collection('insurance_companies').countDocuments({ id: 'ins-dup' })).toBe(0);
    expect((await db.collection('patient_profiles').findOne({ id: 'pat-1' }))?.insurance.company_id).toBe('ins-keep');
    const keptNets = await db.collection('insurance_networks').find({ company_id: 'ins-keep' }).toArray();
    expect(keptNets.map((n) => n.code).sort()).toEqual(['gold', 'silver']);
  });

  it('a second run finds nothing', () => {
    const r = run('2026-10-services-dedupe.ts', ['--apply']);
    expect(r.report.report.every((x: { removed: number }) => x.removed === 0)).toBe(true);
  });

  it('orphan networks: attached on evidence, the rest listed for the owner', async () => {
    const dry = run('2026-10-insurance-orphan-networks.ts');
    expect(dry.report.orphans).toBe(3);
    const r = run('2026-10-insurance-orphan-networks.ts', ['--apply']);
    expect(r.status).toBe(0);
    expect(r.report.attached.map((a: { network: string; matched_by: string }) => [a.network, a.matched_by])).toEqual([['net-o1', 'company_name'], ['net-o2', 'code_prefix']]);
    expect(r.report.for_owner).toEqual([expect.objectContaining({ network: 'net-o3', missing_company_id: 'gone-3' })]);
    expect((await db.collection('insurance_networks').findOne({ id: 'net-o1' }))?.company_id).toBe('ins-bupa');
    expect((await db.collection('insurance_networks').findOne({ id: 'net-o3' }))?.company_id).toBe('gone-3');
    expect(run('2026-10-insurance-orphan-networks.ts').report.orphans).toBe(1);
  });

  it('one lab list: lab_tests merged into lab_services and dropped', async () => {
    const r = run('2026-10-unify-lab-list.ts', ['--apply']);
    expect(r.status).toBe(0);
    const names = (await db.listCollections().toArray()).map((c) => c.name);
    expect(names).not.toContain('lab_tests');
    expect(await db.collection('archive_lab_tests').countDocuments()).toBe(2);
    const added = await db.collection('lab_services').findOne({ short_code: 'NH3' });
    expect(added).toEqual(expect.objectContaining({ name_en: 'Ammonia', medical_review_status: 'pending', provenance: 'lab_tests' }));
    expect(await db.collection('lab_services').countDocuments({ short_code: 'CBC' })).toBe(1);
    expect((await db.collection('labbookings').findOne({ id: 'bk-2' }))?.items[0].service_id).toBe(added?.id);
    expect(run('2026-10-unify-lab-list.ts', ['--apply']).report.report[0].note).toBe('legacy list absent');
  });
});
