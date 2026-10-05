// 13.R1 (5285f44): "no duplicate offers". The offer and allocation indexes on
// (order, pharmacy) were not unique, so two concurrent drafts from one pharmacy
// both became offers, and nothing stopped a second allocation for the same
// pharmacy on one order. Real MongoDB, real schema indexes.
import { ConflictException } from '@nestjs/common';
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PharmacyOfferService } from '../services/pharmacy-offer.service';
import { PharmacyAllocation, PharmacyAllocationSchema, PharmacyOffer, PharmacyOfferSchema } from '../schemas/pharmacy.schema';

jest.setTimeout(60_000);

const lean = <T>(value: T) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('pharmacy offers and allocations are unique per (order, pharmacy) (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let offers: Model<PharmacyOffer>;
  let allocations: Model<PharmacyAllocation>;

  const order = {
    id: 'order-1', patient_account_id: 'patient-1', status: 'broadcasting',
    items: [{ id: 'item-1', matched_sku: 'SKU-1', qty: 2, name_ar: 'دواء', generic_name: 'generic-1' }],
  };
  const broadcast = { id: 'broadcast-1', order_id: 'order-1', notified_pharmacies: ['pharmacy-1'], lock_state: 'open' };
  const inventoryItem = { id: 'inventory-1', provider_account_id: 'pharmacy-1', sku: 'SKU-1', name_ar: 'دواء', stock: 9, available: true, price: 17.5, currency: 'SAR', updatedAt: new Date() };
  const pharmacist = { id: 'pharmacy-1', role: 'provider' };
  const draftBody = { items: [{ order_item_id: 'item-1', availability: 'available' as const, inventory_item_id: 'inventory-1', qty_offered: 2 }] };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'r1_unique' }).asPromise();
    offers = conn.model('PharmacyOffer', PharmacyOfferSchema);
    allocations = conn.model('PharmacyAllocation', PharmacyAllocationSchema);
    await offers.syncIndexes();
    await allocations.syncIndexes();
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { await offers.deleteMany({}); await allocations.deleteMany({}); });

  function service() {
    const accounts = { findOne: jest.fn(() => lean({ id: 'pharmacy-1', provider_type: 'pharmacy', status: 'approved' })) };
    const broadcasts = { findOne: jest.fn(() => lean(broadcast)) };
    const orders = { findOne: jest.fn(() => lean(order)) };
    const inventory = { findOne: jest.fn(() => lean(inventoryItem)) };
    const bus = { emit: jest.fn().mockResolvedValue(undefined) };
    return new PharmacyOfferService(conn, offers, orders as never, allocations, broadcasts as never, inventory as never, accounts as never, bus as never);
  }

  it('two concurrent drafts from one pharmacy leave one offer; the other is a 409 conflict', async () => {
    const svc = service();
    const results = await Promise.allSettled([
      svc.upsertDraft(pharmacist, 'order-1', draftBody),
      svc.upsertDraft(pharmacist, 'order-1', draftBody),
    ]);
    expect(await offers.countDocuments({ order_id: 'order-1', pharmacy_account_id: 'pharmacy-1' })).toBe(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect((rejected[0].reason as ConflictException).message).toBe('offer_draft_conflict');
  });

  it('a new quote after an expired one continues the version instead of colliding', async () => {
    await offers.collection.insertOne({ id: 'old-offer', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', version: 1, status: 'expired' });
    const draft = await service().upsertDraft(pharmacist, 'order-1', draftBody);
    expect(draft.version).toBe(2);
    expect((await offers.find({ order_id: 'order-1' }).lean()).map((o) => o.version).sort()).toEqual([1, 2]);
  });

  it('a second allocation for the same pharmacy on the same order is refused by the index', async () => {
    await allocations.collection.insertOne({ id: 'alloc-1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', status: 'pending_review' });
    await expect(allocations.collection.insertOne({ id: 'alloc-2', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', status: 'pending_review' }))
      .rejects.toMatchObject({ code: 11000 });
    // Another pharmacy on the same order is fine.
    await expect(allocations.collection.insertOne({ id: 'alloc-3', order_id: 'order-1', pharmacy_account_id: 'pharmacy-2', status: 'pending_review' }))
      .resolves.toBeTruthy();
  });

  it('declares both indexes as unique', async () => {
    const offerIx = await offers.collection.listIndexes().toArray();
    const allocIx = await allocations.collection.listIndexes().toArray();
    expect(offerIx.find((ix) => ix.name === 'pharmacy_offer_order_pharmacy_version_unique')).toMatchObject({ unique: true });
    expect(allocIx.find((ix) => ix.name === 'pharmacy_allocation_order_pharmacy_unique')).toMatchObject({ unique: true });
  });

  it('a second open draft for the same pair is refused whatever its version', async () => {
    await offers.collection.insertOne({ id: 'd1', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', version: 1, status: 'draft' });
    await expect(offers.collection.insertOne({ id: 'd2', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', version: 2, status: 'draft' }))
      .rejects.toMatchObject({ code: 11000 });
    // A submitted v1 plus a later expired v2 are history, not duplicates.
    await offers.collection.updateOne({ id: 'd1' }, { $set: { status: 'submitted' } });
    await expect(offers.collection.insertOne({ id: 'd3', order_id: 'order-1', pharmacy_account_id: 'pharmacy-1', version: 2, status: 'expired' }))
      .resolves.toBeTruthy();
  });
});
