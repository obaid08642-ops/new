import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { publicMedicineFilter } from './public-medicine-filter';

jest.setTimeout(240_000);
describe('explore: the three distinct shapes of filters()', () => {
  let mongod: MongoMemoryServer; let db: any; let col: any;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'filters_explain' });
    db = mongoose.connection.db; col = db.collection('medicines');
    for (const [keys, options] of MedicineSchema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>) {
      if (Object.values(keys).includes('text')) continue;
      const { background: _b, ...opts } = options as Record<string, unknown>;
      await col.createIndex(keys as any, opts as any).catch(() => null);
    }
    await col.insertMany(Array.from({ length: 3000 }, (_, i) => ({
      id: `m${i}`, public_eligibility: true, medical_review_status: 'approved', is_deleted: false, price: 5 + (i % 400), category: `c${i % 9}`, manufacturer: `M${i % 40}`, form: `f${i % 6}`,
      translations: { ar: { name: 'x'.repeat(5000) } },
    })));
  });
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const walk = (p: any, out: string[] = []): string[] => { if (!p) return out; if (p.stage) out.push(p.stage + (p.indexName ? `(${p.indexName})` : '')); walk(p.inputStage, out); (p.inputStages || []).forEach((x: any) => walk(x, out)); walk(p.queryPlan, out); return out; };
  const explainDistinct = async (key: string, extra: any) => {
    const r = await db.command({ explain: { distinct: 'medicines', key, query: { ...publicMedicineFilter(), ...extra } }, verbosity: 'executionStats' });
    return { stages: walk(r.queryPlanner.winningPlan), docs: r.executionStats.totalDocsExamined, keys: r.executionStats.totalKeysExamined };
  };

  it('prints the plans', async () => {
    const out: any = {};
    out.categories = await explainDistinct('category', {});
    out.brands = await explainDistinct('manufacturer', { manufacturer: { $ne: null } });
    out.forms = await explainDistinct('form', { form: { $ne: null } });
    const agg: any = await col.aggregate([{ $match: publicMedicineFilter() }, { $group: { _id: null, lo: { $min: '$price' }, hi: { $max: '$price' } } }]).explain('executionStats');
    out.price = { docs: (agg.stages?.[0]?.$cursor?.executionStats ?? agg.executionStats).totalDocsExamined };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(out));
    expect(true).toBe(true);
  });
});
