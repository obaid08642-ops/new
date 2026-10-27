import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { popularPage, refreshCategoryPositions } from './product-ranking.service';

/**
 * Owner 2026-10-27: the pharmacy's "All" showed 27 cold medicines from one category. With no category chosen, scored products come
 * first, then the rest round-robin across the categories; with a category chosen the order is the plain one.
 */
describe('popular order: All = a mix of every category', () => {
  let mongod: MongoMemoryServer;
  let col: mongoose.mongo.Collection;
  const projection = { _id: 0, id: 1, category: 1 };
  const filter = { public_eligibility: true, medical_review_status: 'approved' };
  const categories = ['medications', 'beauty', 'hair', 'skincare', 'baby', 'vitamins'];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'popular_mix' });
    col = mongoose.connection.collection('medicines');
    // medications is by far the biggest category and has the highest usage counts: the old order put it all on page 1
    const docs = Array.from({ length: 300 }, (_, i) => {
      const category = i < 200 ? 'medications' : categories[1 + (i % 5)];
      return {
        id: `p${String(i).padStart(3, '0')}`, category, public_eligibility: true, medical_review_status: 'approved',
        rank_score: 0, requires_prescription: false, availability_status: 'in_stock', image_1: 'https://cdn.example.test/a.jpg',
        usage_count: category === 'medications' ? 100 - (i % 50) : i % 20,
      };
    });
    docs.find((d) => d.id === 'p250')!.rank_score = 3;   // a beauty product with signals
    docs.find((d) => d.id === 'p005')!.rank_score = 1;   // a medicine with fewer signals
    await col.insertMany(docs);
    await refreshCategoryPositions(col as never);
  }, 120_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  it('numbers each product inside its own category, 1 = the best', async () => {
    for (const c of categories) {
      const rows = await col.find({ category: c }).sort({ category_pos: 1 }).toArray();
      expect(rows.map((r) => r.category_pos)).toEqual(rows.map((_, i) => i + 1));
    }
    const best = await col.findOne({ category: 'medications', category_pos: 1 });
    expect(best!.usage_count).toBe(100);
  });

  it('All, page 1: products with a score first, then a mix of every category', async () => {
    const page = await popularPage(col as never, filter, 0, 30, projection, true);
    expect(page.slice(0, 2).map((d) => d.id)).toEqual(['p250', 'p005']);         // scored, by score
    expect(new Set(page.map((d) => d.category)).size).toBe(6);                    // every category present
    // the unscored rest is round-robin: no category has a second product before every category has had its first
    const rest = page.slice(2);
    expect(new Set(rest.slice(0, 6).map((d) => d.category)).size).toBe(6);
    expect(rest.filter((d) => d.category === 'medications').length).toBeLessThanOrEqual(Math.ceil(rest.length / 6) + 1);
  });

  it('a product with a score ranks above every unscored one on every page', async () => {
    const all = await popularPage(col as never, filter, 0, 300, { _id: 0, id: 1, rank_score: 1 }, true);
    const firstUnscored = all.findIndex((d) => !d.rank_score);
    expect(all.slice(firstUnscored).every((d) => !d.rank_score)).toBe(true);
    expect(firstUnscored).toBe(2);
  });

  it('a category page is unchanged: that category only, score then the usual tie-breaks', async () => {
    const plain = await popularPage(col as never, { ...filter, category: 'medications' }, 0, 40, projection, false);
    const mixed = await popularPage(col as never, { ...filter, category: 'medications' }, 0, 40, projection, true);
    expect(plain.every((d) => d.category === 'medications')).toBe(true);
    expect(plain[0].id).toBe('p005');                                             // the scored one first
    expect(plain.slice(1).map((d) => d.id)).toEqual(mixed.slice(1).map((d) => d.id)); // inside one category the round-robin is the old order
  });
});
