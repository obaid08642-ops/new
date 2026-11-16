import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { publicMedicineFilter } from '../medicines/public-medicine-filter';

/**
 * Run 133 follow-up: `SeoSearchModule.buildCategoryTree` groups the whole public catalogue by category and sub-category. Arabic and English have covering indexes; Urdu, Hindi, Bengali and Tagalog
 * read `translations.<lang>.main_category / sub_category`, which no index held, so each cold build (every hour per language, and a crawler of /c/ pages starts them) FETCHED all ~21k documents
 * (~20 KB each = ~420 MB) like the 96r queries. These tests use the REAL schema indexes on a real MongoDB (3,000 documents of 5 KB) and pin that the group reads no document.
 */
describe('the category tree group is covered by an index in every language (explain, real schema indexes)', () => {
  let mongod: MongoMemoryServer;
  let col: mongoose.mongo.Collection;
  const N = 3000;
  const LANGS = ['ur', 'hi', 'bn', 'tl', 'en'] as const;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'category_tree' });
    col = mongoose.connection.collection('medicines');
    for (const [keys, options] of MedicineSchema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>) {
      if (Object.values(keys).includes('text')) continue;
      const { background: _b, ...opts } = options as Record<string, unknown>;
      await col.createIndex(keys as any, opts as any).catch(() => null);
    }
    const tr = (i: number) => ({ main_category: `c${i % 7}`, sub_category: `s${i % 23}`, body: 'x'.repeat(5000) });
    await col.insertMany(Array.from({ length: N }, (_, i) => ({
      id: `m${i}`, public_eligibility: true, medical_review_status: 'approved', is_deleted: false, category: `c${i % 7}`, sub_category: `s${i % 23}`,
      translations: { ur: tr(i), hi: tr(i), bn: tr(i), tl: tr(i), en: tr(i) },
    })));
  }, 240_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  it.each(LANGS)('%s: the group reads no document', async (db) => {
    const plan: any = await col.aggregate([
      { $match: publicMedicineFilter() },
      { $group: { _id: { c: `$translations.${db}.main_category`, s: `$translations.${db}.sub_category` }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]).explain('executionStats');
    const stats = plan.stages?.[0]?.$cursor?.executionStats ?? plan.executionStats;
    expect(stats.totalDocsExamined).toBe(0);
  });
});
