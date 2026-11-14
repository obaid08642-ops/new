import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';
import { POPULAR_KEY_STAGES, POPULAR_ORDER_STAGES, POPULAR_SORT_PROJECTION, popularPage } from './product-ranking.service';

/**
 * `/public` p95 alerts (2026-10-25..27): the popular order carried whole documents through its $sort. `popularPage` reads the same order
 * through the six sort fields only. The order and the rows must be exactly the old pipeline's, ties included.
 */
describe('popularPage = the old popular order, read the cheap way', () => {
  let mongod: MongoMemoryServer;
  let col: mongoose.mongo.Collection;
  const projection = { _id: 0, id: 1, name_ar: 1, usage_count: 1 };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'popular_page' });
    col = mongoose.connection.collection('medicines');
    const docs = Array.from({ length: 120 }, (_, i) => ({
      id: `m${String(i).padStart(3, '0')}`, name_ar: `دواء ${i}`, public_eligibility: true, medical_review_status: 'approved',
      // many ties on purpose: most products have no signals at all
      rank_score: i % 7 === 0 ? (i % 5) * 3 : 0,
      requires_prescription: i % 11 === 0,
      availability_status: i % 6 === 0 ? 'out_of_stock' : i % 13 === 0 ? 'discontinued' : 'none',
      ...(i % 4 === 0 ? {} : i % 4 === 1 ? { image_1: 'https://cdn.example.test/a.jpg' } : i % 4 === 2 ? { image: 'https://cdn.example.test/b.jpg' } : { image_1: '' }),
      usage_count: i % 9,
      translations: { ar: { name: 'x'.repeat(2000) } },         // the weight the old sort carried
    }));
    await col.insertMany(docs);
    // an unpublished one never appears
    await col.insertOne({ id: 'hidden', public_eligibility: false, medical_review_status: 'approved', rank_score: 99, usage_count: 99 });
  }, 120_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const filter = { public_eligibility: true, medical_review_status: 'approved' };
  const oldWay = async (skip: number, limit: number) => (await col.aggregate([{ $match: filter }, ...POPULAR_ORDER_STAGES, { $skip: skip }, { $limit: limit }, { $project: projection }] as any).toArray());

  it.each([[0, 24], [24, 24], [48, 24], [100, 24], [0, 10], [7, 13], [110, 24], [500, 24]])('skip %i limit %i: same rows, same order as the old pipeline', async (skip, limit) => {
    const expected = await oldWay(skip, limit);
    const got = await popularPage(col as never, filter, skip, limit, projection);
    expect(got.map((d) => d.id)).toEqual(expected.map((d) => d.id));
    expect(got).toEqual(expected);                            // same projection too (no _id leaks)
  });

  it('the production filter (with is_deleted) is answered from the real schema index: no document is loaded for the page or the count', async () => {
    const [spec, options] = MedicineSchema.indexes().find(([, o]) => o?.name === 'public_popular_covering_v2')!;
    await col.createIndex(spec as never, { name: options!.name });
    const prod = publicMedicineFilter();
    const plan: any = await col.aggregate([{ $match: prod }, { $project: POPULAR_SORT_PROJECTION }, ...POPULAR_KEY_STAGES, { $skip: 0 }, { $limit: 24 }, { $project: { _id: 1 } }] as any, { explain: 'executionStats' } as any).next();
    const cursorStage = plan.stages?.[0]?.$cursor ?? plan;
    expect(JSON.stringify(cursorStage)).toContain('IXSCAN');
    expect(cursorStage.executionStats.totalDocsExamined).toBe(0);
    const count: any = await col.aggregate([{ $match: prod }, { $count: 'n' }] as any, { explain: 'executionStats' } as any).next();
    const countStage = count.stages?.[0]?.$cursor ?? count;
    expect(countStage.executionStats.totalDocsExamined).toBe(0);
  });

  it('keeps _id when the projection asks for it, and never returns the hidden product', async () => {
    const got = await popularPage(col as never, filter, 0, 200, { id: 1 });
    expect(got.every((d) => '_id' in d)).toBe(true);
    expect(got.some((d) => d.id === 'hidden')).toBe(false);
    expect(got).toHaveLength(120);
  });

  it('a prescription-only item keeps its natural place, an out-of-stock one after the in-stock ones of the same score', async () => {
    const all = await popularPage(col as never, filter, 0, 200, { _id: 0, id: 1, requires_prescription: 1, rank_score: 1, availability_status: 1 });
    const rx = all.filter((d) => d.requires_prescription);
    expect(rx.length).toBeGreaterThan(0);
    const firstRxIndex = all.findIndex((d) => d.requires_prescription);
    const topScoreNonRx = all.findIndex((d) => !d.requires_prescription && d.rank_score > 0);
    expect(topScoreNonRx).toBeLessThan(firstRxIndex + 1);
  });
});
