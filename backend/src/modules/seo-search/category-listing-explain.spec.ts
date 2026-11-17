import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';
import { catalogueFilterClauses } from './catalogue-filters';

/**
 * Run 135 (2026-11-17 05:51): after deploy 134 mongod was still killed (04:24, 05:35). The slow operations were API reads of `medicines` of two shapes, each examining all 20,990 documents (~20 KB): an IXSCAN on
 * { public_eligibility, medical_review_status, price: -1, _id } and an IXSCAN on { ..., is_deleted, manufacturer }. They are `GET /public/categories/:locale/items` (the category pages): its price / newest /
 * most-ordered orders sorted by `_id` (so the planner took the OLD indexes without `is_deleted` and `id`, and fetched every document to test it), and its brand filter was a case-insensitive regex (no index
 * can serve it: every document is fetched and tested). These tests use the REAL schema indexes and the same filter and sort objects, on 3,000 documents of 5 KB.
 */
jest.setTimeout(240_000);
describe('the category listing is served by the indexes (explain, real schema indexes)', () => {
  let mongod: MongoMemoryServer; let col: mongoose.mongo.Collection;
  const N = 3000;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'category_listing' });
    col = mongoose.connection.collection('medicines');
    for (const [keys, options] of MedicineSchema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>) {
      if (Object.values(keys).includes('text')) continue;
      const { background: _b, ...opts } = options as Record<string, unknown>;
      await col.createIndex(keys as any, opts as any).catch(() => null);
    }
    await col.insertMany(Array.from({ length: N }, (_, i) => ({
      id: `m${String(i).padStart(5, '0')}`, public_eligibility: true, medical_review_status: 'approved', is_deleted: false, price: 5 + (i % 400), createdAt: new Date(Date.now() - i * 60_000),
      orders_count: i % 17, category: `c${i % 9}`, manufacturer: `Brand ${i % 40}`, form: `form${i % 6}`, translations: { ar: { name: 'x'.repeat(5000) } },
    })));
  });
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const stages = (plan: any): string[] => {
    const out: string[] = [];
    const walk = (n: any) => { if (!n) return; if (n.stage) out.push(n.stage); walk(n.inputStage); (n.inputStages || []).forEach(walk); walk(n.queryPlan); };
    walk(plan.queryPlanner.winningPlan);
    return out;
  };
  const facets = { brands: Array.from({ length: 40 }, (_, i) => `Brand ${i}`), forms: Array.from({ length: 6 }, (_, i) => `form${i}`) };

  // the exact sort objects of publicCategoryProducts
  const ORDERS: Array<[string, Record<string, 1 | -1>, Record<string, unknown>]> = [
    ['price_asc', { price: 1, id: 1 }, { price: { $gt: 0 } }],
    ['price_desc', { price: -1, id: 1 }, { price: { $gt: 0 } }],
    ['newest', { createdAt: -1, id: 1 }, {}],
    ['most_ordered', { orders_count: -1, id: 1 }, {}],
  ];

  it.each(ORDERS)('%s on "All": one page is read in index order, no SORT stage, about one page of documents', async (_n, order, extra) => {
    const filter = { ...publicMedicineFilter(), ...extra };
    const plan: any = await col.find(filter as any, { projection: { _id: 0, id: 1 } }).sort(order).skip(0).limit(24).explain('executionStats');
    expect(stages(plan)).not.toContain('SORT');
    expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(24 + 40);
  });

  it('a brand filter: the old regex fetched every public document; the exact match reads only the brand', async () => {
    const base = { ...publicMedicineFilter(), price: { $gt: 0 } };
    const regexQ = { ...base, $and: catalogueFilterClauses({ brand: 'brand 3' }, 'ar', null).and };
    const exactQ = { ...base, $and: catalogueFilterClauses({ brand: 'brand 3' }, 'ar', facets).and };
    const exam = async (q: any) => ((await col.find(q, { projection: { _id: 0, id: 1 } }).sort({ price: -1, id: 1 }).limit(24).explain('executionStats')) as any).executionStats.totalDocsExamined as number;
    const count = async (q: any) => { const p: any = await col.aggregate([{ $match: q }, { $count: 'n' }]).explain('executionStats'); return (p.stages?.[0]?.$cursor?.executionStats ?? p.executionStats).totalDocsExamined as number; };
    expect(await count(regexQ)).toBeGreaterThanOrEqual(N / 2);          // the old shape: every document
    expect(await count(exactQ)).toBeLessThanOrEqual(N * 0.3);            // only the 11 of 40 matching brands (about 825 of 3,000), not every document
    expect(await exam(exactQ)).toBeLessThanOrEqual(N / 10);
  });

  it('the exact brand clause keeps the regex meaning: every brand that contains the text, case-insensitive; none = matches nothing', () => {
    expect(catalogueFilterClauses({ brand: 'BRAND 3' }, 'ar', facets).and[0]).toEqual({ manufacturer: { $in: ['Brand 3', 'Brand 30', 'Brand 31', 'Brand 32', 'Brand 33', 'Brand 34', 'Brand 35', 'Brand 36', 'Brand 37', 'Brand 38', 'Brand 39'] } });
    expect(catalogueFilterClauses({ brand: 'zzz' }, 'ar', facets).and[0]).toEqual({ manufacturer: { $in: [] } });
    expect(catalogueFilterClauses({ brand: 'x.y' }, 'ar', null).and[0]).toEqual({ manufacturer: { $regex: 'x\\.y', $options: 'i' } });   // facets unknown: the old regex
    expect(catalogueFilterClauses({ form: 'form2' }, 'ar', facets).and[0]).toEqual({ $or: [{ form: { $in: ['form2'] } }] });
    expect(catalogueFilterClauses({ form: 'form2' }, 'hi', facets).and[0]).toEqual({ $or: [{ form: { $in: ['form2'] } }, { 'translations.hi.form': { $regex: 'form2', $options: 'i' } }] });
  });
});
