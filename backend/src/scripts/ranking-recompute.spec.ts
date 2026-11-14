import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { apply, firstPageCategories, plan } from './ranking-recompute';
import { ProductRankingService } from '../modules/product-ranking/product-ranking.service';
import { ProductRankingMetrics, ProductRankingMetricsSchema } from '../schemas/product-ranking-metrics.schema';

jest.setTimeout(120_000);

/**
 * The server task 94-ranking-recompute.sh: fills orders_count and category_pos with the real ranking recompute, in the container.
 * Here: a real in-memory MongoDB and the real ProductRankingService (only Redis is a stand-in).
 */
describe('ranking-recompute tool', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let logs: string[];
  const ok = { public_eligibility: true, medical_review_status: 'approved', requires_prescription: false, availability_status: 'in_stock', image_1: 'https://cdn.example.test/a.jpg' };
  const redis: any = { zadd: jest.fn() };
  const lines = () => logs.map((l) => JSON.parse(l));
  const step = (name: string, when?: string) => lines().filter((l) => l.step === name && (when === undefined || l.when === when));

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'rank_task' }).asPromise();
    // medications dominates; four other categories have a few products each
    const docs = Array.from({ length: 120 }, (_, i) => {
      const category = i < 80 ? 'medications' : ['beauty', 'hair', 'baby', 'vitamins'][i % 4];
      return { id: `p${i}`, category, ...ok, usage_count: category === 'medications' ? 100 - (i % 40) : i % 10, rank_score: 0 };
    });
    await conn.collection('medicines').insertMany(docs as never);
    await conn.collection('medicines').insertOne({ id: 'no-category', ...ok });                       // no category: gets no position, is not counted
    // two delivered orders (p3 twice, p90 once) and one not delivered
    await conn.collection('orders').insertMany([
      { id: 'o1', state: 'DELIVERED', items: [{ medicine_id: 'p3' }, { medicine_id: 'p3' }, { medicine_id: 'p90' }] },
      { id: 'o2', state: 'DELIVERED', items: [{ medicine_id: 'p3' }] },
      { id: 'o3', state: 'PENDING', items: [{ medicine_id: 'p90' }, { medicine_id: 'p91' }] },
    ] as never);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(() => { logs = []; jest.spyOn(console, 'log').mockImplementation((m: string) => { logs.push(String(m)); }); });
  afterEach(() => jest.restoreAllMocks());

  it('plan writes nothing and says what would change', async () => {
    await plan(conn);
    expect(step('orders_count')[0]).toMatchObject({ products_with_delivered_orders: 2, differs: 2, modified: 0 });
    expect(step('category_pos')[0]).toMatchObject({ medicines_with_category: 120, missing_category_pos: 120, categories: 5 });
    expect(step('plan')[0]).toEqual({ step: 'plan', writes: false });
    expect(await conn.collection('medicines').countDocuments({ category_pos: { $exists: true } })).toBe(0);
    expect(await conn.collection('medicines').countDocuments({ orders_count: { $exists: true } })).toBe(0);
  });

  it('apply fills orders_count and category_pos with the real recompute, verifies, and the first 24 of All are a mix', async () => {
    const metrics = conn.model(ProductRankingMetrics.name, ProductRankingMetricsSchema);
    const code = await apply(conn, new ProductRankingService(metrics as never, redis, conn));
    expect(code).toBe(0);
    expect(step('first_page', 'before')[0]).toMatchObject({ of: 24 });
    expect(step('orders_count')[0]).toMatchObject({ differs: 2, modified: 2 });
    expect(step('category_pos')[0]).toMatchObject({ medicines_with_category: 120, missing_category_pos: 0 });
    expect(step('verify')[0]).toEqual({ step: 'verify', ok: true });
    expect(step('first_page', 'after')[0].distinct_categories).toBe(5);
    expect(step('first_page', 'before')[0].distinct_categories).toBeLessThan(5);                     // the old order: all medications
    expect((await conn.collection('medicines').findOne({ id: 'p3' }))!.orders_count).toBe(2);
    expect((await conn.collection('medicines').findOne({ id: 'p90' }))!.orders_count).toBe(1);
    expect((await conn.collection('medicines').findOne({ id: 'p91' }))!.orders_count).toBeUndefined(); // only delivered orders count
    expect((await conn.collection('medicines').findOne({ id: 'no-category' }))!.category_pos).toBeUndefined();
  });

  it('a second apply changes nothing (idempotent)', async () => {
    const metrics = conn.model(ProductRankingMetrics.name, ProductRankingMetricsSchema);
    const before = await conn.collection('medicines').find({}, { projection: { _id: 0, id: 1, category_pos: 1, orders_count: 1 } }).sort({ id: 1 }).toArray();
    expect(await apply(conn, new ProductRankingService(metrics as never, redis, conn))).toBe(0);
    expect(step('orders_count')[0]).toMatchObject({ differs: 0, modified: 0 });
    const after = await conn.collection('medicines').find({}, { projection: { _id: 0, id: 1, category_pos: 1, orders_count: 1 } }).sort({ id: 1 }).toArray();
    expect(after).toEqual(before);
  });

  it('fails (exit 1) when a product is left without its position', async () => {
    await conn.collection('medicines').updateOne({ id: 'p5' }, { $unset: { category_pos: '' } });
    const code = await apply(conn, { recomputeAll: async () => ({ updated: 0 }) });                  // a recompute that did not number it
    expect(code).toBe(1);
    expect(step('verify')[0]).toEqual({ step: 'verify', ok: false });
  });

  it('prints counts only: no document, id, name or connection string', async () => {
    await plan(conn);
    const text = logs.join('\n');
    expect(text).not.toMatch(/mongodb|redis:|p\d{1,3}\b|medications|beauty/);
  });

  it('firstPageCategories counts the distinct categories of a page', async () => {
    const r = await firstPageCategories(conn, 10);
    expect(r.of).toBe(10);
    expect(r.distinct_categories).toBeGreaterThan(0);
  });
});
