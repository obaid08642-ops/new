import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { MedicinesService } from './medicines.service';
import { publicMedicineFilter } from './public-medicine-filter';

/**
 * Item 5 of the 2026-11-16 12:10 queue: the cache-warm crons (`warmHomepageCatalog` every 5 minutes: top 200 by usage_count; `warmTrendingCatalog` every 10: top 20) run on the worker
 * against ~21,000 medicines of ~20 KB each. With the real schema indexes, the planner must answer them in index order and stop at the limit: no blocking SORT, and only about `limit`
 * documents examined, not the catalogue. A change to the indexes or to the query that loses this shows here, before it shows as a mongod OOM kill.
 */
describe('the cache-warm queries stop at their limit (explain, real schema indexes)', () => {
  let mongod: MongoMemoryServer;
  let Model: mongoose.Model<any>;
  const N = 3000;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'cache_warm' });
    Model = mongoose.model('MedicineWarm', MedicineSchema, 'medicines');
    // every index the schema declares except the text ones (MongoDB allows ONE text index per collection; the schema declares several, which is a separate matter)
    for (const [keys, options] of MedicineSchema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>) {
      if (Object.values(keys).includes('text')) continue;
      const { background: _b, ...opts } = options as Record<string, unknown>;
      await Model.collection.createIndex(keys as any, opts as any);
    }
    const docs = Array.from({ length: N }, (_, i) => ({
      id: `m${i}`, name_ar: `دواء ${i}`, name_en: `Drug ${i}`, public_eligibility: true, medical_review_status: 'approved', is_deleted: false, verified: i % 2 === 0,
      category: `c${i % 9}`, usage_count: (i * 7) % 211, rating: i % 5, price: 10 + (i % 90), rank_score: 0,
      translations: { ar: { name: 'x'.repeat(2000) } },
    }));
    await Model.collection.insertMany(docs);
  }, 180_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const projection = (MedicinesService as any).CARD_PROJECTION;
  const stages = (plan: any): string[] => {
    const out: string[] = [];
    const walk = (n: any) => { if (!n) return; if (n.stage) out.push(n.stage); walk(n.inputStage); (n.inputStages || []).forEach(walk); walk(n.queryPlan); };
    walk(plan.queryPlanner.winningPlan);
    return out;
  };

  it.each([[200, 'warmHomepageCatalog'], [20, 'warmTrendingCatalog']])('top %i by usage_count (%s): index order, no blocking sort, about the limit examined', async (limit) => {
    const plan: any = await Model.collection.find(publicMedicineFilter() as any, { projection }).sort({ usage_count: -1 }).limit(limit).explain('executionStats');
    expect(stages(plan)).not.toContain('SORT');
    expect(plan.executionStats.nReturned).toBe(limit);
    expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(limit + 50);
    expect(plan.executionStats.totalDocsExamined).toBeLessThan(N / 3);
  });
});
