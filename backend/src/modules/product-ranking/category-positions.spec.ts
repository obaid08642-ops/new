import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { RANKING_CATEGORY_POSITION_INDEX } from '../../schemas/medicine.schema';
import { ProductRankingService, categoryPositionPipeline, refreshCategoryPositions } from './product-ranking.service';
import { RankingScoreJob } from './ranking-admin.controller';

/**
 * Run 131 (task 96r): mongod was OOM-killed in a loop; the slowest operations were the worker's ranking job reading all ~21,000 whole documents. These tests pin the fix:
 * the same positions as before, answered from a covering index (no document loaded), only the CHANGED positions handed to $merge, and a guard that keeps a restart from
 * starting the job at once.
 */
describe('refreshCategoryPositions (covering index, writes only what changed)', () => {
  let mongod: MongoMemoryServer;
  let col: mongoose.mongo.Collection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'category_pos' });
    col = mongoose.connection.collection('medicines');
    await col.createIndex(RANKING_CATEGORY_POSITION_INDEX as any, { name: 'ranking_category_positions_covering_v1' });
    const docs: any[] = [];
    for (let i = 0; i < 60; i++) {
      docs.push({
        id: `m${i}`, category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C', usage_count: i % 7, availability_status: i % 5 === 0 ? 'out_of_stock' : 'in_stock',
        ...(i % 2 ? { image_1: 'https://cdn.example.test/x.jpg' } : {}), requires_prescription: i % 11 === 0, rank_score: 0,
        translations: { ar: { name: 'x'.repeat(5000) } },   // the weight of a whole product
      });
    }
    docs.push({ id: 'no-category', usage_count: 1 });
    await col.insertMany(docs);
  }, 120_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const positions = async () => Object.fromEntries((await col.find({ category: { $type: 'string' } }, { projection: { _id: 0, id: 1, category_pos: 1 } }).toArray()).map((d: any) => [d.id, d.category_pos]));
  const withoutMerge = () => categoryPositionPipeline().slice(0, -1);

  it('numbers every product inside its category 1..n, best first (in stock, image, usage count, id), and leaves a product without a category alone', async () => {
    await refreshCategoryPositions(col as any);
    const pos = await positions();
    for (const c of ['A', 'B', 'C']) {
      const rows = (await col.find({ category: c }).toArray()) as any[];
      const expected = [...rows].sort((a, b) => (b.availability_status === 'out_of_stock' ? 0 : 1) - (a.availability_status === 'out_of_stock' ? 0 : 1) || (b.image_1 ? 1 : 0) - (a.image_1 ? 1 : 0) || b.usage_count - a.usage_count || String(a._id).localeCompare(String(b._id)));
      expect(expected.map((r) => pos[r.id])).toEqual(rows.map((_, i) => i + 1));
    }
    expect((await col.findOne({ id: 'no-category' }) as any).category_pos).toBeUndefined();
  });

  it('a second run with nothing changed hands NOTHING to $merge', async () => {
    await refreshCategoryPositions(col as any);
    expect(await col.aggregate(withoutMerge() as any).toArray()).toEqual([]);
  });

  it('only the products whose position changed are handed to $merge, and the run puts them right', async () => {
    await col.updateOne({ id: 'm1' }, { $set: { usage_count: 99 } });          // m1 (category B) becomes the best of its category
    const changed: any[] = await col.aggregate(withoutMerge() as any).toArray();
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.length).toBeLessThan(25);                                    // not the whole catalogue
    for (const c of changed) expect(Object.keys(c).sort()).toEqual(['_id', 'category_pos']);
    await refreshCategoryPositions(col as any);
    expect(((await col.findOne({ id: 'm1' })) as any).category_pos).toBe(1);
    expect(await col.aggregate(withoutMerge() as any).toArray()).toEqual([]);
  });

  it('the read part is answered from the covering index: no document is examined', async () => {
    const plan: any = await col.aggregate(withoutMerge() as any).explain('executionStats');
    const stats = plan.stages?.[0]?.$cursor?.executionStats ?? plan.executionStats;
    expect(stats.totalDocsExamined).toBe(0);
    expect(JSON.stringify(plan)).toContain('ranking_category_positions_covering_v1');
    expect(JSON.stringify(plan)).not.toContain('"stage":"FETCH"');
  });
});

describe('the timer job guard', () => {
  const service = (set: jest.Mock | null) => new ProductRankingService({} as any, { getClient: () => ({ set }) } as any, undefined);
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('does not run within the first minutes of the process (a restart must not start the job at once)', async () => {
    const set = jest.fn().mockResolvedValue('OK');
    const r = await service(set).mayRunTimerJob(30);
    expect(r.run).toBe(false);
    expect(r.reason).toContain('under 600 s');
    expect(set).not.toHaveBeenCalled();
  });

  it('runs once per interval across processes: the first caller gets the key, the next one is refused', async () => {
    const set = jest.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    const s = service(set);
    expect((await s.mayRunTimerJob(5000)).run).toBe(true);
    const second = await s.mayRunTimerJob(5000);
    expect(second.run).toBe(false);
    expect(second.reason).toContain('less than 1200 s ago');
    expect(set).toHaveBeenCalledWith('ranking:timer_job:last_run', expect.any(String), 'EX', 1200, 'NX');
  });

  it('fails open when Redis is unreachable (the uptime guard still applies)', async () => {
    const set = jest.fn().mockRejectedValue(new Error('redis down'));
    expect((await service(set).mayRunTimerJob(5000)).run).toBe(true);
    expect((await service(set).mayRunTimerJob(5)).run).toBe(false);
  });

  it('RankingScoreJob.run does not call recomputeAll when the guard says no, and does when it says yes', async () => {
    const recomputeAll = jest.fn().mockResolvedValue({ updated: 3 });
    const mayRunTimerJob = jest.fn().mockResolvedValueOnce({ run: false, reason: 'x' }).mockResolvedValueOnce({ run: true });
    const job = new RankingScoreJob({ recomputeAll, mayRunTimerJob } as any);
    await job.run();
    expect(recomputeAll).not.toHaveBeenCalled();
    await job.run();
    expect(recomputeAll).toHaveBeenCalledTimes(1);
  });
});

describe('the other two reads of the ranking job do not load whole documents either', () => {
  let mongod: MongoMemoryServer;
  let col: mongoose.mongo.Collection;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'ranking_reads' });
    col = mongoose.connection.collection('medicines');
    await col.createIndex({ rank_score: 1, id: 1 }, { name: 'ranking_scored_ids_v1' });
    await col.createIndex({ source: 1, createdAt: -1 }, { name: 'ranking_recent_by_source_v1' });
    const old = new Date(Date.now() - 400 * 86400000);
    await col.insertMany(Array.from({ length: 80 }, (_, i) => ({ id: `m${i}`, source: i < 3 ? 'admin' : 'import', createdAt: i < 3 ? new Date() : old, rank_score: i % 4 === 0 ? 5 : 0, translations: { ar: { name: 'x'.repeat(5000) } } })));
  }, 120_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  it('the products with a score are read from the index (no document examined)', async () => {
    const plan: any = await col.find({ rank_score: { $gt: 0 } }, { projection: { _id: 0, id: 1 } }).explain('executionStats');
    expect(plan.executionStats.totalDocsExamined).toBe(0);
    expect(plan.executionStats.nReturned).toBe(20);
  });

  it('the products created in the last days are found through the index: only the matching documents are examined, not the catalogue', async () => {
    const since = new Date(Date.now() - 7 * 86400000);
    const plan: any = await col.find({ source: { $in: ['admin', 'pharmacy', 'provider'] }, source_product_id: { $exists: false }, createdAt: { $gte: since } }, { projection: { id: 1, createdAt: 1, availability_status: 1 } }).explain('executionStats');
    expect(plan.executionStats.nReturned).toBe(3);
    expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(3);
    expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain('ranking_recent_by_source_v1');
  });
});

describe('the hourly price sweep reads ids and prices from an index', () => {
  it('no document is examined for the sweep query', async () => {
    const { PRICE_SWEEP_INDEX } = await import('../../schemas/medicine.schema');
    const { publicMedicineFilter } = await import('../medicines/public-medicine-filter');
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'price_sweep' });
    try {
      const col = mongoose.connection.collection('medicines');
      await col.createIndex(PRICE_SWEEP_INDEX as any, { name: 'price_sweep_covering_v1' });
      await col.insertMany(Array.from({ length: 50 }, (_, i) => ({ id: `m${i}`, price: 10 + i, public_eligibility: true, medical_review_status: 'approved', is_deleted: false, requires_prescription: i % 5 === 0, controlled: false, active: true, availability_status: i % 7 === 0 ? 'discontinued' : 'in_stock', translations: { ar: { name: 'x'.repeat(5000) } } })));
      const filter = { ...publicMedicineFilter(), requires_prescription: { $ne: true }, controlled: { $ne: true }, active: { $ne: false }, availability_status: { $ne: 'discontinued' } };
      const plan: any = await col.find(filter as any, { projection: { _id: 0, id: 1, price: 1 } }).explain('executionStats');
      expect(plan.executionStats.totalDocsExamined).toBe(0);
      expect(plan.executionStats.nReturned).toBeGreaterThan(20);
      expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain('price_sweep_covering_v1');
    } finally { await mongoose.disconnect(); await mongod.stop(); }
  }, 120_000);
});
