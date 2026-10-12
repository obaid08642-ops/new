import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SeoIndexingListener } from './seo-indexing.listener';
import { SeoIndexingService } from './seo-indexing.service';

jest.setTimeout(120_000);

const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

describe('IndexNow on every add, change and removal (owner 2026-10-12)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let submitted: string[][];
  let listener: SeoIndexingListener;
  let service: SeoIndexingService;

  beforeAll(async () => {
    process.env.NABD_PUBLIC_URL = 'https://nabd.plus';
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'idx' }).asPromise();
    const db = conn.db!;
    await db.collection('locations').insertMany([
      { type: 'city', is_active: true, code: 'sa-riyadh' },
      { type: 'city', is_active: true, code: 'sa-jeddah' },
      { type: 'city', is_active: false, code: 'sa-closed' },
    ]);
    await db.collection('medicines').insertOne({ id: 'm1', slug: 'panadol-m1', translations: { en: { slug: 'panadol-en' }, tl: { slug: 'panadol-tl' } } });
    await db.collection('lab_services').insertOne({ id: 'l1', short_code: 'CBC' });
    await db.collection('radiology_services').insertOne({ id: 'r1', short_code: 'MRI' });
    await db.collection('nursing_services').insertOne({ id: 'h1' });
    await db.collection('articles').insertOne({ id: 'a1', slug: 'vitamin-d-a1', status: 'DRAFT', is_deleted: true });
    await db.collection('provider_profiles').insertMany([
      { id: 'doc-prof', user_id: 'doc-user', account_id: 'doc-acc', type: 'doctor', slug: 'dr-sara' },
      { id: 'ph-prof', user_id: 'ph-user', account_id: 'ph-acc', type: 'pharmacy', slug: 'al-dawaa' },
    ]);
    await db.collection('facilities').insertOne({ id: 'f1', slug: 'kfsh' });
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  beforeEach(() => {
    submitted = [];
    const indexNow = { submitUrls: jest.fn(async (urls: string[]) => { submitted.push(urls); return { success: true, urls_submitted: urls.length, timestamp: new Date() }; }) };
    service = new SeoIndexingService(conn, indexNow as any);
    listener = new SeoIndexingListener(service);
  });

  const all = () => submitted.flat();
  const expectSixLocales = (pathAfterLocale: RegExp) => {
    for (const l of LOCALES) expect(all().some((u) => new RegExp(`^https://nabd\\.plus/${l}/`).test(u) && pathAfterLocale.test(u))).toBe(true);
  };

  it('a medicine decision pings its six localized product pages', async () => {
    await listener.onProjected({ entity_type: 'medicine', entity_id: 'm1' });
    expect(all()).toEqual(expect.arrayContaining([
      'https://nabd.plus/ar/p/panadol-m1', 'https://nabd.plus/en/p/panadol-en', 'https://nabd.plus/fil/p/panadol-tl',
      'https://nabd.plus/ur/p/panadol-m1', 'https://nabd.plus/hi/p/panadol-m1', 'https://nabd.plus/bn/p/panadol-m1',
    ]));
  });

  it('lab tests: approve and disable ping the city pages in six locales (active cities only)', async () => {
    await listener.onServiceApproved({ entity_id: 'l1', meta: { kind: 'lab' } });
    expectSixLocales(/\/labs\/CBC\/(riyadh|jeddah)$/);
    expect(all().length).toBe(12);
    expect(all().some((u) => u.includes('closed'))).toBe(false);
    submitted = [];
    await listener.onServiceDisabled({ entity_id: 'l1', meta: { kind: 'lab' } });
    expect(all().length).toBe(12);
  });

  it('radiology (catalog delta and projection) pings the service page in six locales', async () => {
    await listener.onCatalogDelta({ id: 'r1' });
    expectSixLocales(/\/diagnostics\/radiology\/r1$/);
    expect(all().some((u) => /\/radiology\/mri\//.test(u))).toBe(false);
    submitted = [];
    await listener.onProjected({ entity_type: 'radiology_service', entity_id: 'r1' });
    expect(all().length).toBe(6);
  });

  it('nursing / home-care services', async () => {
    await listener.onProjected({ entity_type: 'home_care_service', entity_id: 'h1' });
    expectSixLocales(/\/home-care\/services\/h1$/);
  });

  it('a deleted article is still announced so crawlers drop it', async () => {
    await listener.onArticleChanged({ id: 'a1' });
    expectSixLocales(/\/articles\/vitamin-d-a1$/);
  });

  it('providers: an account id, user id or profile id resolves to the doctor or pharmacy pages', async () => {
    await listener.onApproved({ provider_id: 'doc-acc' });
    expectSixLocales(/\/doctor\/dr-sara$/);
    submitted = [];
    await listener.onSuspended({ provider_id: 'ph-user' });
    expectSixLocales(/\/pharmacy\/al-dawaa$/);
    submitted = [];
    await listener.onProjected({ entity_type: 'provider', entity_id: 'doc-prof' });
    expectSixLocales(/\/doctor\/dr-sara$/);
    submitted = [];
    await listener.onProjected({ entity_type: 'facility', entity_id: 'f1' });
    expectSixLocales(/\/facility\/kfsh$/);
  });

  it('unknown ids and kinds ping nothing and never throw', async () => {
    await listener.onApproved({});
    await listener.onProjected({ entity_type: 'medicine', entity_id: 'nope' });
    await listener.onServiceApproved({ entity_id: 'x', meta: { kind: 'service' } });
    expect(submitted).toEqual([]);
  });

  it('an IndexNow outage never breaks the caller', async () => {
    const broken = new SeoIndexingService(conn, { submitUrls: jest.fn().mockRejectedValue(new Error('down')) } as any);
    await expect(new SeoIndexingListener(broken).onProjected({ entity_type: 'medicine', entity_id: 'm1' })).resolves.toBeUndefined();
  });

  it('the sweep pings what changed since the last sweep, once across workers', async () => {
    const db = conn.db!;
    const t0 = new Date('2026-10-12T10:00:00Z');
    await service.sweep(t0); // first run creates the state
    await db.collection('medicines').updateOne({ id: 'm1' }, { $set: { updatedAt: new Date('2026-10-12T10:05:00Z') } });
    submitted = [];
    const t1 = new Date('2026-10-12T10:10:00Z');
    const [a, b] = await Promise.all([service.sweep(t1), new SeoIndexingService(conn, { submitUrls: jest.fn() } as any).sweep(t1)]);
    expect([a.submitted, b.submitted].sort()).toEqual([0, 6]);
    submitted = [];
    expect((await service.sweep(new Date('2026-10-12T10:20:00Z'))).submitted).toBe(0);
  });
});
