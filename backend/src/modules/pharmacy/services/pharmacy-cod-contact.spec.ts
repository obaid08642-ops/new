/**
 * 21.5 — cash on delivery for a pharmacy order, on top of the D-25 rules: the patient needs a phone the pharmacy can call,
 * and an unverified phone has a cap on the value and on the open cash orders. Card payment never reaches this code.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PharmacyOrderService } from './pharmacy-order.service';

jest.setTimeout(120_000);

describe('PharmacyOrderService.registerCod — 21.5 contact phone and unverified cap', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let service: PharmacyOrderService;
  const KEY = ['cod', 'idem', String(1).padStart(8, '0')].join('-');

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'cod-contact' }).asPromise();
    const col = conn.collection('pharmacy_orders');
    const orders: any = {
      findOne: (q: any) => ({ lean: async () => col.findOne(q) }),
      updateOne: (q: any, u: any) => col.updateOne(q, u),
    };
    service = new PharmacyOrderService(orders, {} as any, {} as any, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    for (const n of ['pharmacy_orders', 'users', 'patient_addresses', 'system_configs', 'provider_settings']) await conn.collection(n).deleteMany({});
    await conn.collection('system_configs').insertOne({ key: 'payment_rules', value: { pharmacy_cod_max_sar: 1000 } });
  });

  const seed = async (patient: string, user: Record<string, unknown>, total: number, extra: Record<string, unknown> = {}) => {
    await conn.collection('users').insertOne({ id: patient, ...user });
    await conn.collection('pharmacy_orders').insertOne({ id: `done-${patient}`, patient_account_id: patient, status: 'delivered', payment_method: 'card' });
    await conn.collection('pharmacy_orders').insertOne({
      id: `o-${patient}`, patient_account_id: patient, status: 'cash_card_payment_pending', selected_offer_id: 'offer', pharmacy_account_id: 'ph1',
      quote_accepted_at: new Date(), pricing_snapshot: { hash: 'h', totals: { total } }, items: [], ...extra,
    });
  };
  const register = (patient: string) => service.registerCod({ id: patient }, `o-${patient}`, KEY);

  it('a returning patient with a phone and a small order registers cash on delivery', async () => {
    await seed('p1', { phone: '0501234567' }, 120);
    await expect(register('p1')).resolves.toMatchObject({ ok: true, idempotent: false });
  });

  it('refuses when there is no phone to call (guest without a checkout contact)', async () => {
    await seed('p2', {}, 120);
    await expect(register('p2')).rejects.toThrow('contact_phone_required');
    await conn.collection('patient_addresses').insertOne({ user_id: 'p2', kind: 'checkout_contact', phone_e164: '+966501234567' });
    await expect(register('p2')).resolves.toMatchObject({ ok: true });
  });

  it('an unverified phone is capped on the value, a verified one is not (the admin cap still applies)', async () => {
    await seed('p3', { phone: '0501234567' }, 800);
    await expect(register('p3')).rejects.toThrow('cod_value_limit_for_unverified_customer');
    await seed('p4', { phone: '0501234567', phone_verified: true }, 800);
    await expect(register('p4')).resolves.toMatchObject({ ok: true });
    await seed('p5', { phone: '0501234567', phone_verified: true }, 1500);
    await expect(register('p5')).rejects.toThrow('cod_over_limit');
  });

  it('an unverified phone with two open cash orders cannot open a third', async () => {
    await seed('p6', { phone: '0501234567' }, 100);
    await conn.collection('pharmacy_orders').insertMany([
      { id: 'x1', patient_account_id: 'p6', payment_method: 'cod', status: 'cod_due_on_delivery' },
      { id: 'x2', patient_account_id: 'p6', payment_method: 'cod', status: 'out_for_delivery' },
    ]);
    await expect(register('p6')).rejects.toThrow('cod_limit_reached_for_unverified_customer');
    const order = await conn.collection('pharmacy_orders').findOne({ id: 'o-p6' });
    expect(order?.payment_method).toBeUndefined();
  });

  it('D-25: a patient with no delivered or completed order cannot pay a first order in cash, and the order is left unchanged', async () => {
    await conn.collection('users').insertOne({ id: 'p7', phone: '0501234567', phone_verified: true });
    await conn.collection('pharmacy_orders').insertOne({
      id: 'o-p7', patient_account_id: 'p7', status: 'cash_card_payment_pending', selected_offer_id: 'offer', pharmacy_account_id: 'ph1',
      quote_accepted_at: new Date(), pricing_snapshot: { hash: 'h', totals: { total: 120 } }, items: [],
    });
    // an order that is still on its way, or one that was cancelled, is not a delivered order
    await conn.collection('pharmacy_orders').insertMany([
      { id: 'y1', patient_account_id: 'p7', status: 'out_for_delivery' },
      { id: 'y2', patient_account_id: 'p7', status: 'cancelled' },
    ]);
    await expect(register('p7')).rejects.toThrow('cod_first_order_not_allowed');
    expect((await conn.collection('pharmacy_orders').findOne({ id: 'o-p7' }))?.payment_method).toBeUndefined();
    await conn.collection('pharmacy_orders').updateOne({ id: 'y1' }, { $set: { status: 'completed' } });
    await expect(register('p7')).resolves.toMatchObject({ ok: true });
  });
});
