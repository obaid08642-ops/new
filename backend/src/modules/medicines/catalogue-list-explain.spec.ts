import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { publicMedicineFilter } from './public-medicine-filter';

/**
 * Run 133 / 96r (2026-11-16 16:05): 108 slow operations in ONE minute, all from the API on `medicines`, each 9-11 s, `IXSCAN { public_eligibility, medical_review_status, price: -1, _id }`
 * with docsExamined 20,990 and a SORT stage, and a count that also examined 20,990. 4-8 of them at once loaded ~20 KB x 21k documents several times: the cgroup limit.
 * The query is `MedicinesService.filtered` (the pharmacy screens' price / newest / most-ordered orders): the public filter INCLUDES `is_deleted: { $ne: true }` and the sort ends in `id`.
 * The old indexes had neither, so the planner scanned the whole index, FETCHED every document to test is_deleted, then sorted them in memory. These tests use the REAL schema indexes
 * on a real MongoDB with 3,000 documents of 5 KB and pin that each order reads only about one page and that the count reads no document.
 */
describe('the catalogue list orders and counts are served by indexes (explain, real schema indexes)', () => {
  let mongod: MongoMemoryServer;
  let col: mongoose.mongo.Collection;
  const N = 3000;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'catalogue_list' });
    col = mongoose.connection.collection('medicines');
    for (const [keys, options] of MedicineSchema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>) {
      if (Object.values(keys).includes('text')) continue;
      const { background: _b, ...opts } = options as Record<string, unknown>;
      await col.createIndex(keys as any, opts as any).catch(() => null);
    }
    await col.insertMany(Array.from({ length: N }, (_, i) => ({
      id: `m${String(i).padStart(5, '0')}`, name_ar: `د${i}`, name_en: `Drug ${i}`, public_eligibility: true, medical_review_status: 'approved', is_deleted: false,
      price: 5 + (i % 400), createdAt: new Date(Date.now() - i * 60_000), orders_count: i % 17, usage_count: i % 50, verified: true, category: `c${i % 9}`, manufacturer: `M${i % 40}`,
      translations: { ar: { name: 'x'.repeat(5000) } },
    })));
  }, 240_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const stages = (plan: any): string[] => {
    const out: string[] = [];
    const walk = (n: any) => { if (!n) return; if (n.stage) out.push(n.stage); walk(n.inputStage); (n.inputStages || []).forEach(walk); walk(n.queryPlan); };
    walk(plan.queryPlanner.winningPlan);
    return out;
  };

  // the exact sort objects of MedicinesService.filtered
  const ORDERS: Array<[string, Record<string, 1 | -1>, Record<string, unknown>]> = [
    ['price_asc', { price: 1, id: 1 }, { price: { $gt: 0 } }],
    ['price_desc', { price: -1, id: 1 }, { price: { $gt: 0 } }],
    ['newest', { createdAt: -1, id: 1 }, {}],
    ['most_ordered', { orders_count: -1, id: 1 }, {}],
  ];

  it.each(ORDERS)('%s: one page is read in index order (no SORT stage, about one page of documents examined)', async (_name, order, extra) => {
    const filter = { ...publicMedicineFilter(), ...extra };
    for (const skip of [0, 600]) {
      const plan: any = await col.find(filter as any, { projection: { _id: 0, id: 1 } }).sort(order).skip(skip).limit(30).explain('executionStats');
      expect(stages(plan)).not.toContain('SORT');
      expect(plan.executionStats.nReturned).toBe(30);
      expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(skip + 60);
    }
  });

  it.each(ORDERS)('%s: the count of the same filter reads no document', async (_name, _order, extra) => {
    const filter = { ...publicMedicineFilter(), ...extra };
    const plan: any = await col.aggregate([{ $match: filter }, { $count: 'n' }]).explain('executionStats');
    const stats = plan.stages?.[0]?.$cursor?.executionStats ?? plan.executionStats;
    expect(stats.totalDocsExamined).toBe(0);
  });
});
