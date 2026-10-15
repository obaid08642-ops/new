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
import { SeoSearchService } from '../seo-search/seo-search.module';
import { AiCommerceService } from '../ai-commerce/ai-commerce.service';
import { AssistantService } from '../ai/assistant.service';
import { HomeService } from '../home/home.service';
import { CartService, UnifiedCartSchema } from '../cart/cart.module';
import { AgentToolsService } from '../mcp/agent-tools.service';
import { PromotionCampaign, PromotionCampaignSchema } from '../../schemas/promotion-campaign.schema';

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

// Stays pending for the whole spec (the other modules' public reads); same ingredient/category/brand as an approved item.
const PENDING_2 = {
  id: 'med-pending-2', name_ar: 'كوارانتينول', name_en: 'Quarantinol', active_ingredient: 'paracetamol', brand: 'Panadol',
  manufacturer: 'GSK', category: 'pain', price: 30, usage_count: 0, verified: true, is_deleted: false, image: 'https://cdn.test/q.png',
  public_eligibility: false, indexing_eligibility: false, medical_review_status: 'pending', source: 'admin_console',
};
const approved = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, name_ar: name, name_en: name, category: 'pain', price: 10, usage_count: 0, verified: true, is_deleted: false,
  public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved', source: 'admin_console', ...extra,
});
// Five approved items carrying the term (cursor paging) and five without it that sort between them by name_ar.
const CURSOR_ROWS = [1, 2, 3, 4, 5].flatMap((n) => [approved(`med-cur-${n}`, `Med ${n} Cursorterm`), approved(`med-oth-${n}`, `Med ${n}x plain`)]);
const TOLERANT = approved('med-tol-1', 'Tolerantix', { category: 'vitamins', image: 'https://cdn.test/t.png', active_ingredient: 'paracetamol', brand: 'Panadol' });

const ids = (rows: any[]) => rows.map((r: any) => r.id);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  // autoIndex off: the schema's per-field text flags cannot all be built (MongoDB allows one text index); production
  // has one combined text index, created here so the full-text fast path runs too.
  conn = await mongoose.createConnection(`${mongo.getUri()}nabd_governance`, { autoIndex: false }).asPromise();
  model = conn.model(Medicine.name, MedicineSchema) as unknown as Model<MedicineDocument>;
  await conn.collection('medicines').createIndex({ name_ar: 'text', name_en: 'text', active_ingredient: 'text' }, { name: 'medicines_fts' });
  // Raw inserts: the governance fields are exactly what adminCreateCatalog writes.
  await conn.collection('medicines').insertMany([{ ...PENDING }, { ...APPROVED_OTHER }, { ...PENDING_2 }, ...CURSOR_ROWS, { ...TOLERANT }]);
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

describe('cursor paging and the tolerant fallback keep the query', () => {
  it('page 2 of a cursor search still applies the search term', async () => {
    const p1 = await svc.cursorPage('Cursorterm', undefined, undefined, 2);
    expect(p1.data).toHaveLength(2);
    expect(p1.next_cursor).toBeTruthy();
    const p2 = await svc.cursorPage('Cursorterm', undefined, p1.next_cursor!, 2);
    expect(p2.data.length).toBeGreaterThan(0);
    for (const row of [...p1.data, ...p2.data]) expect(row.name_en).toMatch(/Cursorterm$/);
    expect(ids(p2.data)).not.toEqual(expect.arrayContaining(ids(p1.data)));
  });

  it('the typo-tolerant fallback keeps the category filter', async () => {
    // "Tlrntix" reaches Tolerantix only through the tolerant fallback.
    expect(ids(await svc.list('Tlrntix', undefined, false, 50))).toContain(TOLERANT.id);
    expect(ids(await svc.list('Tlrntix', 'vitamins', false, 50))).toContain(TOLERANT.id);
    expect(ids(await svc.list('Tlrntix', 'pain', false, 50))).not.toContain(TOLERANT.id);
  });
});

describe('other modules: public and patient reads never return a medicine in medical review', () => {
  const has = (v: unknown, id: string) => JSON.stringify(v ?? null).includes(id);

  it('SEO: metadata, global search, recommendations, image sitemap and the advertised count', async () => {
    const seo = new SeoSearchService(conn);
    expect(await seo.metadata('medicine', PENDING_2.id)).toBeNull();
    expect(await seo.metadata('medicine', TOLERANT.id)).toEqual(expect.objectContaining({ id: TOLERANT.id }));
    const g = await seo.globalSearch('Quarantinol');
    expect(g.results.medicines).toEqual([]);
    expect((await seo.medicineRecommendations(PENDING_2.id)).items).toEqual([]);
    const rec = await seo.medicineRecommendations(TOLERANT.id);
    expect(has(rec, PENDING_2.id)).toBe(false);
    expect(has(rec, APPROVED_OTHER.id)).toBe(true); // same ingredient, approved
    const images = await seo.imageSitemapMedicines();
    expect(ids(images)).toContain(TOLERANT.id);
    expect(ids(images)).not.toContain(PENDING_2.id);
    const publicCount = await conn.collection('medicines').countDocuments({ is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' });
    expect(await seo.catalogCount()).toBe(publicCount);
  });

  it('AI commerce product feed', async () => {
    const feed = await new AiCommerceService(conn).getProductFeed({ search: 'Quarantinol' });
    expect(has(feed, PENDING_2.id)).toBe(false);
    expect(has(await new AiCommerceService(conn).getProductFeed({ search: 'Tolerantix' }), TOLERANT.id)).toBe(true);
  });

  it('patient assistant: no leaflet from a pending medicine', async () => {
    const gateway = { generate: async () => { throw new Error('model down'); } };
    const assistant = new AssistantService(conn, gateway as any);
    const pending = await assistant.assist('patient-1', { message: 'what is Quarantinol', locale: 'en' } as any);
    expect(pending.kind).not.toBe('leaflet');
    const ok: any = await assistant.assist('patient-1', { message: 'what is Tolerantix', locale: 'en' } as any);
    expect(ok.kind).toBe('leaflet');
    expect(ok.medicine).toEqual({ id: TOLERANT.id });
  });

  it('patient home search', async () => {
    const promo = conn.model(PromotionCampaign.name, PromotionCampaignSchema);
    const home = new HomeService(promo as any, {} as any, { user: { id: 'patient-1' } });
    expect(has(await home.globalSearch('Quarantinol'), PENDING_2.id)).toBe(false);
    expect(has(await home.globalSearch('Tolerantix'), TOLERANT.id)).toBe(true);
  });

  it('cart: a pending medicine cannot be added by id', async () => {
    const cart = new CartService(conn.model('UnifiedCart', UnifiedCartSchema) as any, model as any, {} as any, {} as any);
    await expect(cart.addContractItem({ id: 'patient-1' }, { medicine_id: PENDING_2.id, quantity: 1 })).rejects.toThrow('medicine_not_found');
  });

  it('agent ordering: a pending medicine is not found', async () => {
    const tools = new AgentToolsService(...([null, null, null, null, null, null, null, null, null, conn] as unknown as ConstructorParameters<typeof AgentToolsService>));
    await expect((tools as any).createPharmacyRequest({ id: 'patient-1', role: 'patient' }, { items: [{ medicine_id: PENDING_2.id, qty: 1 }] }))
      .rejects.toThrow(`medicine_not_found:${PENDING_2.id}`);
  });
});
