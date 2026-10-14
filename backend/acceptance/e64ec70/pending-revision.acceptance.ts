// ACCEPTANCE — e64ec70 (R6.F8 / R9c; REVIEW_P13 e64ec70; owner decision 2026-10-05:
// "pending revision (b)"). Written by the reviewer before the fix; the implementing
// agent makes it pass and may not edit it.
//
// An edit to a PUBLISHED catalog item by an editor who does not hold
// catalog.approve is stored as a pending revision. Patients keep seeing the last
// approved version (content, price, slug) until an approver approves it; then the
// revision is applied and published. Rejecting a pending revision discards it and
// leaves the approved version public. An editor who holds catalog.approve still
// publishes directly; a draft (never published) is still edited in place.
//
// Before: the edit was written onto the live document and the item went back to
// medical_review_status 'pending', so the public read 404'd and the next approval
// published unreviewed content.
//
// Contract for the admin side (what the catalog manager reads):
//   adminListCatalog(...) rows carry `pending_revision`
//     = { changes: { <field>: <proposed value>, ... }, submitted_by: <user id>, submitted_at: <Date> }
//   while one is waiting, and no `pending_revision` (absent or null) otherwise.
//   adminUpdateCatalog(...) answers requires_reapproval: true for a stored revision.
//   adminApproveCatalog(id, true|false, approverId) approves / discards it.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MedicinesService } from '../../src/modules/medicines/medicines.service';
import { MedicineRepository } from '../../src/modules/medicines/repositories/medicine.repository';
import { CatalogPublicationService } from '../../src/modules/events/catalog-publication.service';
import { MedicineSchema } from '../../src/schemas/medicine.schema';

jest.setTimeout(60_000);

describe('catalog edits without catalog.approve are pending revisions (e64ec70)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let medicines: Model<any>;
  let service: MedicinesService;

  const PUBLISHED = { public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved', verified: true, is_deleted: false };
  // Synthetic staff: the editor holds catalog.update / price.write but not catalog.approve.
  const EDITOR = { id: 'editor-1', role: 'support_agent', permissions: ['catalog.read', 'catalog.update', 'catalog.price.write'] };
  const APPROVER = { id: 'approver-1', role: 'admin' };

  async function seedMedicine(id: string, extra: Record<string, unknown> = {}) {
    await medicines.collection.insertOne({
      id, slug: `${id}-slug`, name_ar: 'دواء قبل', name_en: 'Before', description_ar: 'وصف قبل', price: 20, images: [],
      ...PUBLISHED, createdAt: new Date(), updatedAt: new Date(), ...extra,
    });
  }
  const publicView = (id: string) => service.getPublicById(id).then((m: any) => (typeof m?.toObject === 'function' ? m.toObject() : m));
  async function adminRow(id: string) {
    const res: any = await service.adminListCatalog({ q: '', page: 1, limit: 100 });
    return (res.data as any[]).find((r) => r.id === id);
  }

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'e64ec70' }).asPromise();
    medicines = conn.model('Medicine', MedicineSchema);
    const redis = { getClient: () => null, del: async () => 0 };
    const publication = new CatalogPublicationService(conn, redis as never, { emit: async () => undefined } as never);
    service = new MedicinesService(new MedicineRepository(medicines as never), { emit: () => true } as never, redis as never, conn, publication);
    await conn.collection('users').insertMany([EDITOR, APPROVER]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    for (const c of ['medicines', 'medicine_price_history', 'public_catalog_projections']) await conn.collection(c).deleteMany({});
  });

  it('patients keep seeing the approved version while the edit waits', async () => {
    await seedMedicine('m1');
    const res: any = await service.adminUpdateCatalog('m1', { description_ar: 'وصف بعد', price: 35, reason: 'تحديث السعر', name_ar: 'دواء بعد' }, EDITOR.id);
    expect(res).toEqual(expect.objectContaining({ ok: true, requires_reapproval: true }));

    const pub = await publicView('m1'); // still public: no 404
    expect(pub).toEqual(expect.objectContaining({ description_ar: 'وصف قبل', price: 20, name_ar: 'دواء قبل', slug: 'm1-slug' }));
    const raw: any = await medicines.collection.findOne({ id: 'm1' });
    expect(raw).toEqual(expect.objectContaining({ medical_review_status: 'approved', public_eligibility: true, indexing_eligibility: true }));
  });

  it('the admin catalog shows the pending revision with what the editor proposed', async () => {
    await seedMedicine('m2');
    await service.adminUpdateCatalog('m2', { description_ar: 'وصف بعد', price: 35, reason: 'تحديث السعر' }, EDITOR.id);
    const row = await adminRow('m2');
    expect(row.pending_revision).toEqual(expect.objectContaining({
      changes: expect.objectContaining({ description_ar: 'وصف بعد', price: 35 }),
      submitted_by: EDITOR.id,
    }));
    expect(new Date(row.pending_revision.submitted_at).getTime()).toBeGreaterThan(0);
    // The approved values are still the row's own values.
    expect(row).toEqual(expect.objectContaining({ description_ar: 'وصف قبل', price: 20 }));
  });

  it('a second edit before approval joins the same pending revision', async () => {
    await seedMedicine('m3');
    await service.adminUpdateCatalog('m3', { description_ar: 'وصف بعد' }, EDITOR.id);
    await service.adminUpdateCatalog('m3', { price: 40, reason: 'تحديث السعر' }, EDITOR.id);
    const row = await adminRow('m3');
    expect(row.pending_revision.changes).toEqual(expect.objectContaining({ description_ar: 'وصف بعد', price: 40 }));
    expect(await publicView('m3')).toEqual(expect.objectContaining({ description_ar: 'وصف قبل', price: 20 }));
  });

  it('approving applies and publishes the revision (price history records the change)', async () => {
    await seedMedicine('m4');
    await service.adminUpdateCatalog('m4', { description_ar: 'وصف بعد', price: 35, reason: 'تحديث السعر', name_ar: 'دواء بعد' }, EDITOR.id);
    await service.adminApproveCatalog('m4', true, APPROVER.id);

    expect(await publicView('m4')).toEqual(expect.objectContaining({ description_ar: 'وصف بعد', price: 35, name_ar: 'دواء بعد' }));
    const row = await adminRow('m4');
    expect(row.pending_revision ?? null).toBeNull();
    const hist = await conn.collection('medicine_price_history').find({ medicine_id: 'm4' }).toArray();
    expect(hist).toEqual(expect.arrayContaining([expect.objectContaining({ before_price: 20, after_price: 35 })]));
    const proj: any = await conn.collection('public_catalog_projections').findOne({ entity_id: 'm4' });
    expect(proj).toEqual(expect.objectContaining({ published: true }));
  });

  it('rejecting a pending revision discards it and keeps the approved version public', async () => {
    await seedMedicine('m5');
    await service.adminUpdateCatalog('m5', { description_ar: 'وصف بعد' }, EDITOR.id);
    await service.adminApproveCatalog('m5', false, APPROVER.id);

    expect(await publicView('m5')).toEqual(expect.objectContaining({ description_ar: 'وصف قبل', price: 20 }));
    const row = await adminRow('m5');
    expect(row.pending_revision ?? null).toBeNull();
    expect(row).toEqual(expect.objectContaining({ medical_review_status: 'approved', public_eligibility: true }));
  });

  it('an editor holding catalog.approve still publishes directly (no pending revision)', async () => {
    await seedMedicine('m6');
    const res: any = await service.adminUpdateCatalog('m6', { description_ar: 'وصف بعد' }, APPROVER.id);
    expect(res).toEqual(expect.objectContaining({ ok: true, requires_reapproval: false }));
    expect(await publicView('m6')).toEqual(expect.objectContaining({ description_ar: 'وصف بعد' }));
    expect((await adminRow('m6')).pending_revision ?? null).toBeNull();
  });

  it('a draft that was never published is edited in place and stays unpublished', async () => {
    await seedMedicine('m7', { public_eligibility: false, indexing_eligibility: false, medical_review_status: 'pending', verified: false });
    await service.adminUpdateCatalog('m7', { description_ar: 'وصف بعد' }, EDITOR.id);
    const raw: any = await medicines.collection.findOne({ id: 'm7' });
    expect(raw).toEqual(expect.objectContaining({ description_ar: 'وصف بعد', public_eligibility: false, medical_review_status: 'pending' }));
    expect(raw.pending_revision ?? null).toBeNull();
    await expect(service.getPublicById('m7')).rejects.toThrow();
  });
});
