// Q29 (55342cd) enforces payment_evidence_gateway_event_unique at startup. A COD
// collection record had no gateway fields, so every one of them landed on the
// same (null, null, null) key: the second cash delivery on the platform failed
// with 409 after the money was collected (live gate, j_pharmacy).
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PharmacyAllocationService } from '../services/pharmacy-allocation.service';
import { PharmacyAllocationState } from '../schemas/pharmacy.schema';
import { ensurePharmacyIndexes } from '../pharmacy-indexes';

jest.setTimeout(60_000);

describe('COD collection evidence vs the gateway unique index (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'cod_evidence_test' }).asPromise();
    await ensurePharmacyIndexes(conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  function service(n: number) {
    const allocation = {
      id: `alloc-${n}`, order_id: `order-${n}`, pharmacy_account_id: 'pharmacy-1', offer_id: `offer-${n}`, offer_version: 1,
      status: PharmacyAllocationState.OUT_FOR_DELIVERY,
      totals: { total: 53, currency: 'SAR' }, items: [{ action: 'available' }], timeline: [], save: jest.fn(), toObject: jest.fn(() => ({ id: `alloc-${n}` })),
    };
    const order = {
      id: `order-${n}`, patient_account_id: 'patient-1', payment_method: 'cod', status: 'cod_due_on_delivery',
      selected_offer_id: `offer-${n}`, selected_allocation_id: `alloc-${n}`, selected_offer_version: 1,
      pricing_snapshot: { offer_id: `offer-${n}`, offer_version: 1, hash: `quote-hash-${n}`, totals: { total: 53 } },
    };
    const policy = { findOne: jest.fn().mockResolvedValue({ active: true, payment_method: 'cod', allow_preparation: true }) };
    const allocs = { findOne: jest.fn().mockResolvedValue(allocation), find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) })), db: { collection: jest.fn(() => ({ findOne: jest.fn(), insertOne: jest.fn() })) } };
    const orders = {
      findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(order) })),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      db: { collection: (name: string) => (name === 'pharmacy_fulfillment_policies' ? policy : conn.db!.collection(name)) },
    };
    const notifications = { notifyPatientAllocationProgress: jest.fn().mockResolvedValue(undefined) };
    const bus = { emit: jest.fn().mockResolvedValue(undefined) };
    const svc = new PharmacyAllocationService(allocs as never, orders as never, {} as never, {} as never, notifications as never, bus as never, {} as never);
    return { svc, allocation };
  }

  it('two cash deliveries on two orders both record their collection', async () => {
    const pharmacist = { id: 'pharmacy-1', role: 'pharmacy' };
    for (const n of [1, 2]) {
      const { svc, allocation } = service(n);
      await expect(svc.delivered(pharmacist, `alloc-${n}`, { collection: { method: 'cash', amount_collected: 53 } })).resolves.toEqual({ id: `alloc-${n}` });
      expect(allocation.status).toBe(PharmacyAllocationState.DELIVERED);
    }
    const rows = await conn.db!.collection('pharmacy_payment_evidence').find({ kind: 'cod_collection' }).toArray();
    expect(rows.map((r) => r.allocation_id).sort()).toEqual(['alloc-1', 'alloc-2']);
  });

  it('a COD record never looks like gateway payment evidence for a quote', async () => {
    const row = await conn.db!.collection('pharmacy_payment_evidence').findOne({ allocation_id: 'alloc-1' });
    expect(row?.gateway).toBe('cod');
    expect(row?.quote_snapshot_hash).toBeUndefined();
    expect(row?.payer_account_id).toBeUndefined();
  });
});
