/**
 * Phase 21.5 — one contact phone field at checkout, without SMS.
 * The formats named by the Verify: 05…, 5…, +9665…, 009665…, Arabic digits.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CheckoutContactService, normalizeDigits } from './checkout-contact.service';

jest.setTimeout(120_000);

describe('Phase 21.5 checkout contact', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: CheckoutContactService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'checkout-contact' }).asPromise();
    svc = new CheckoutContactService(conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    for (const name of ['patient_addresses', 'users', 'pharmacy_orders']) {
      const exists = (await conn.db!.collections()).some((c) => c.collectionName === name);
      if (!exists) await conn.createCollection(name).catch(() => undefined);
      await conn.collection(name).deleteMany({});
    }
  });

  it.each([
    ['0501234567', '+966501234567'],
    ['501234567', '+966501234567'],
    ['+966501234567', '+966501234567'],
    ['00966501234567', '+966501234567'],
    ['050 123 4567', '+966501234567'],
    ['+966 50 123 4567', '+966501234567'],
    ['٠٥٠١٢٣٤٥٦٧', '+966501234567'],
    ['۰۵۰۱۲۳۴۵۶۷', '+966501234567'],
  ])('normalizes %s to E.164 %s', (input, expected) => {
    const result = svc.normalizePhone(input);
    expect(result.e164).toBe(expected);
    expect(result.country).toBe('SA');
    expect(result.display).toContain('+966');
  });

  it.each([['12345'], [''], ['abc'], ['+9665']])('refuses %p', (input) => {
    expect(() => svc.normalizePhone(input)).toThrow();
  });

  it('normalizes Arabic-Indic digits before anything else', () => {
    expect(normalizeDigits('٠٥٠١٢٣٤٥٦٧')).toBe('0501234567');
    expect(normalizeDigits('۰۵۰۱۲۳۴۵۶۷')).toBe('0501234567');
    expect(normalizeDigits('abc123')).toBe('abc123');
  });

  it('stores the checkout contact on the profile and shows the phone back', async () => {
    await conn.collection('users').insertOne({ id: 'u1', phone_verified: false });
    const saved = await svc.storeCheckoutContact('u1', { phone: '0501234567', address: 'Riyadh, Olaya' });
    expect(saved.phone.e164).toBe('+966501234567');
    expect(saved.phone_verified).toBe(false);
    expect(saved.address_stored).toBe(true);
    const row = await conn.collection('patient_addresses').findOne({ user_id: 'u1' });
    expect(row.phone_e164).toBe('+966501234567');
  });

  it('caps cash on delivery for a new unverified customer, and not for card', async () => {
    await conn.collection('users').insertOne({ id: 'u-new', phone_verified: false });
    await expect(svc.assertCashOrderAllowed('u-new', 900)).rejects.toThrow('cod_value_limit_for_unverified_customer');
    await expect(svc.assertCashOrderAllowed('u-new', 100)).resolves.toBeUndefined();

    await conn.collection('pharmacy_orders').insertMany([
      { id: '1', patient_id: 'u-new', payment_method: 'cash', state: 'pending' },
      { id: '2', patient_id: 'u-new', payment_method: 'cash', state: 'accepted' },
    ]);
    const gate = await svc.cashOnDeliveryLimits('u-new');
    expect(gate.allowed).toBe(false);
    await expect(svc.assertCashOrderAllowed('u-new', 10)).rejects.toThrow('cod_limit_reached_for_unverified_customer');
  });

  it('lifts the cap once the phone is verified', async () => {
    await conn.collection('users').insertOne({ id: 'u-ok', phone_verified: true });
    await conn.collection('pharmacy_orders').insertMany([
      { id: '1', patient_id: 'u-ok', payment_method: 'cash', state: 'pending' },
      { id: '2', patient_id: 'u-ok', payment_method: 'cash', state: 'accepted' },
    ]);
    expect((await svc.cashOnDeliveryLimits('u-ok')).allowed).toBe(true);
    await expect(svc.assertCashOrderAllowed('u-ok', 5000)).resolves.toBeUndefined();
  });

  it('refuses a non-positive amount instead of passing it on', async () => {
    await conn.collection('users').insertOne({ id: 'u', phone_verified: false });
    await expect(svc.assertCashOrderAllowed('u', 0)).rejects.toThrow('order_amount_invalid');
    await expect(svc.assertCashOrderAllowed('u', Number.NaN)).rejects.toThrow('order_amount_invalid');
  });
});
