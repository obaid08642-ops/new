/**
 * Medical governance of the public catalogue reads. A medicine the admin has added but not yet approved
 * (medical_review_status 'pending', public_eligibility false) must never reach a patient or a guest, on any
 * public read path and in any fallback. Live-gate failure: GET /medicines?q= returned such a medicine through
 * the typo-tolerant fallback whenever no approved medicine matched the query.
 *
 * Runs the real MedicinesService queries against an in-memory MongoDB (the filters are evaluated by MongoDB,
 * not asserted as object shapes).
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, Model } from 'mongoose';
import { MedicinesService } from './medicines.service';
import { MedicineRepository } from './repositories/medicine.repository';
import { Medicine, MedicineDocument, MedicineSchema } from '../../schemas/medicine.schema';

jest.setTimeout(120_000);

let mongo: MongoMemoryServer;
let conn: Connection;
let model: Model<MedicineDocument>;
let svc: MedicinesService;

const ADMIN = 'admin-governance-spec';
const PENDING = {
  id: 'med-pending-1', name_ar: 'فيتامين تجريبي قيد المراجعة', name_en: 'Vitaminx Review Pending', active_ingredient: 'ascorbic acid',
  category: 'vitamins', price: 20, usage_count: 5, verified: true, is_deleted: false,
  public_eligibility: false, indexing_eligibility: false, medical_review_status: 'pending', source: 'admin_console',
};
const APPROVED_OTHER = {
  id: 'med-approved-1', name_ar: 'بنادول معتمد', name_en: 'Panadol Approved', active_ingredient: 'paracetamol',
  category: 'pain', price: 12, usage_count: 9, verified: true, is_deleted: false,
  public_eligibility: true, indexing_eligibility: false, medical_review_status: 'approved', source: 'admin_console',
};

const ids = (rows: any[]) => rows.map((r: any) => r.id);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  // autoIndex off: the schema's per-field text flags cannot all be built (MongoDB allows one text index); production
  // has one combined text index, created here so the full-text fast path runs too.
  conn = await mongoose.createConnection(`${mongo.getUri()}nabd_governance`, { autoIndex: false }).asPromise();
  model = conn.model(Medicine.name, MedicineSchema) as unknown as Model<MedicineDocument>;
  await conn.collection('medicines').createIndex({ name_ar: 'text', name_en: 'text', active_ingredient: 'text' }, { name: 'medicines_fts' });
  // Raw inserts: the governance fields are exactly what adminCreateCatalog writes.
  await conn.collection('medicines').insertMany([{ ...PENDING }, { ...APPROVED_OTHER }]);
  // A cache miss on every read: the spec checks the database queries, not a cached copy.
  const redis = { getJson: async () => null, setJson: async () => undefined };
  svc = new MedicinesService(
    new MedicineRepository(model), { emit: jest.fn() } as any, redis as any, conn,
    { refresh: jest.fn() } as any,
  );
});

afterAll(async () => {
  await conn?.close();
  await mongo?.stop();
});

describe('public medicine search never shows a medicine that is still in medical review', () => {
  // First: the searches below are recorded as search terms, which also feed the suggestion pool.
  it('did-you-mean never suggests the name of a pending medicine', async () => {
    const r = await svc.didYouMean('Vitaminy');
    expect(r.suggestion).toBeNull();
  });

  it('typo-tolerant fallback: a pending medicine and no approved match -> not in the public search', async () => {
    const rows = await svc.list(PENDING.name_ar, undefined, false, 50);
    expect(ids(rows)).not.toContain(PENDING.id);
    const latin = await svc.list('Vitaminx', undefined, false, 50);
    expect(ids(latin)).not.toContain(PENDING.id);
  });

  it('the admin/internal search (includeUnverified) still finds the pending medicine', async () => {
    const rows = await svc.list(PENDING.name_ar, undefined, true, 50);
    expect(ids(rows)).toContain(PENDING.id);
  });

  it('paginated, cursor, filtered, autocomplete and stream reads hide it too', async () => {
    expect(ids((await svc.paginate(PENDING.name_ar, undefined, 1, 30, false)).data)).not.toContain(PENDING.id);
    expect(ids((await svc.cursorPage(PENDING.name_ar, undefined, undefined, 30)).data)).not.toContain(PENDING.id);
    expect(ids(await svc.filtered(PENDING.name_ar, undefined, { forms: [], brands: [], rx_only: false }, 'relevant', undefined) as any[]))
      .not.toContain(PENDING.id);
    expect(ids(await svc.autocomplete('Vitaminx'))).not.toContain(PENDING.id);
    const streamed = await model.find(svc.publicStreamFilter(undefined, undefined) as any).lean();
    expect(ids(streamed)).not.toContain(PENDING.id);
    expect(ids(streamed)).toContain(APPROVED_OTHER.id);
  });

  it('after the admin approves it, the same public search finds it', async () => {
    await svc.adminApproveCatalog(PENDING.id, true, ADMIN);
    const rows = await svc.list(PENDING.name_ar, undefined, false, 50);
    expect(ids(rows)).toContain(PENDING.id);
  });
});
