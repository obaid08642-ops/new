/**
 * GET /medicines (the private list, also the app's): the ranked page is read the cheap way (popularPage, answered from the covering index) instead of an aggregate that carried every
 * matching document through its sort (SPEED_SWEEP.md: ~300 ms above the floor). On a real MongoDB with the real indexes: same rows in the same order as the old aggregate, the sort
 * is answered from the index (no document examined for the keys), and the page is served through HotCache (fresh 5 minutes, stale up to 15 while rebuilt).
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MedicinesService } from './medicines.service';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { popularOrderStages, POPULAR_MIX_SORT_PROJECTION, POPULAR_KEY_STAGES, POPULAR_MIX_KEY_STAGES } from '../product-ranking/product-ranking.service';

jest.setTimeout(180_000);
let mongo: MongoMemoryServer;
let Model: mongoose.Model<any>;
const CATEGORIES = ['medications', 'beauty', 'hair', 'baby', 'vitamins'];
const bulky = { ar: 'نص طويل '.repeat(200), en: 'long text '.repeat(200) };

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'med_rank' });
  Model = mongoose.model('Medicine', MedicineSchema);
  // the schema's own indexes, as production builds them (the several single-field text indexes of the schema cannot coexist in one collection: they are left out)
  for (const [keys, options] of MedicineSchema.indexes()) {
    if (Object.values(keys as Record<string, unknown>).includes('text')) continue;
    await Model.collection.createIndex(keys as never, options as never);
  }
  const docs = Array.from({ length: 1500 }, (_, i) => ({
    id: `m${i}`, slug: `slug-${i}`, name_ar: `دواء ${i}`, name_en: `Drug ${i}`, category: CATEGORIES[i % 5], is_deleted: false, public_eligibility: true, medical_review_status: 'approved', verified: true,
    rank_score: i % 7 === 0 ? (i % 50) : 0, requires_prescription: i % 11 === 0, availability_status: i % 13 === 0 ? 'out_of_stock' : 'in_stock', usage_count: (i * 37) % 101,
    image_1: i % 3 ? `https://cdn.example.test/${i}.jpg` : '', category_pos: Math.floor(i / 5) + 1, price: 10 + (i % 90),
    description_ar: bulky.ar, description_en: bulky.en, more_info_ar: bulky.ar, more_info_en: bulky.en, translations: { ur: { name: `ur ${i}`, description: bulky.ar }, hi: { name: `hi ${i}`, description: bulky.ar } },
  }));
  await Model.collection.insertMany(docs as never);
});
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

const service = (hotCache?: unknown) => {
  const s: any = Object.create(MedicinesService.prototype);
  s.model = { db: Model.db, find: (...a: any[]) => (Model as any).find(...a), aggregate: (p: any[]) => Model.aggregate(p), countDocuments: (q: any) => Model.countDocuments(q) };
  s.redis = { getJson: async () => null, setJson: async () => undefined };
  s.hotCache = hotCache;
  s.applySponsored = async (rows: any[]) => rows;
  s.withBadges = (m: any) => m;
  return s as MedicinesService;
};

describe('the ranked page', () => {
  // the filter the private list really sends: the public gate plus `verified` (MedicinesService.buildQuery with includeUnverified false)
  const filter = { is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved', verified: true };
  const old = async (match: any, skip: number, limit: number, mix: boolean) =>
    (await Model.aggregate([{ $match: match }, ...popularOrderStages(mix), { $skip: skip }, { $limit: limit }, { $project: { _id: 0, id: 1 } }] as never[])).map((r: any) => r.id);

  it('gives the same products in the same order as the old aggregate: "All" (round-robin), a category, deep pages', async () => {
    const s = service();
    for (const [category, page] of [[undefined, 1], [undefined, 2], [undefined, 40], ['beauty', 1], ['hair', 3]] as const) {
      const out: any = await s.paginate(undefined, category, page, 24, false, 'smart_ranking');
      const match = category ? { ...filter, category } : filter;
      expect(out.data.map((m: any) => m.id)).toEqual(await old(match, (page - 1) * 24, 24, !category));
      expect(out.data.length).toBeGreaterThan(0);
      expect(out.total).toBe(await Model.countDocuments(match));
      expect(out.data[0]._id).toBeUndefined();
      expect(out.data[0].description_ar).toBeUndefined();            // the card projection: no long text
    }
  });

  it('the sort is answered from a covering index: no document is examined for the keys, for "All" and for a category (the filters the private list really sends)', async () => {
    const find = (o: any, k: string, out: any[] = []): any[] => { if (o && typeof o === 'object') { if (k in o) out.push(o[k]); for (const v of Object.values(o)) find(v, k, out); } return out; };
    const plan = async (match: any, stages: any[]) => {
      const e: any = await Model.collection.aggregate([{ $match: match }, { $project: POPULAR_MIX_SORT_PROJECTION }, ...stages, { $skip: 0 }, { $limit: 24 }, { $project: { _id: 1 } }]).explain('executionStats');
      const first = e.stages?.[0]?.$cursor ?? e;
      return { stages: find(first.queryPlanner?.winningPlan, 'stage'), indexes: find(first.queryPlanner?.winningPlan, 'indexName'), examined: first.executionStats?.totalDocsExamined };
    };
    const build = (category?: string) => (service() as any).buildQuery(undefined, category, false);
    expect(await plan(build(), POPULAR_MIX_KEY_STAGES)).toEqual({ stages: ['PROJECTION_COVERED', 'IXSCAN'], indexes: ['public_verified_popular_covering_v1'], examined: 0 });
    expect(await plan(build('beauty'), POPULAR_KEY_STAGES)).toEqual({ stages: ['PROJECTION_COVERED', 'IXSCAN'], indexes: ['public_verified_category_covering_v1'], examined: 0 });
  });

  it('is served through HotCache: fresh for 5 minutes, stale for up to 15 while it is rebuilt; one key per (query, page, sort)', async () => {
    const calls: any[] = [];
    const hot = { get: jest.fn(async (key: string, opts: any, load: () => Promise<unknown>) => { calls.push({ key, opts }); return load(); }) };
    const out: any = await service(hot).paginate(undefined, undefined, 2, 20, false, 'smart_ranking');
    expect(out.page).toBe(2);
    expect(calls).toHaveLength(1);
    expect(calls[0].opts).toEqual({ ttl: 300, swr: 900 });
    expect(calls[0].key).toBe('med:page:governed-v2:::false:2:20:smart_ranking:global');
  });

  it('without HotCache it still caches in Redis as before (read, build, write)', async () => {
    const s: any = service();
    const written: any[] = [];
    s.redis = { getJson: async () => null, setJson: async (k: string, v: unknown, ttl: number) => { written.push({ k, ttl }); } };
    await s.paginate(undefined, undefined, 1, 10, false, 'smart_ranking');
    expect(written).toEqual([{ k: 'med:page:governed-v2:::false:1:10:smart_ranking:global', ttl: 300 }]);
    s.redis = { getJson: async () => ({ cached: true }), setJson: async () => { throw new Error('must not write'); } };
    expect(await s.paginate(undefined, undefined, 1, 10, false, 'smart_ranking')).toEqual({ cached: true });
  });
});
