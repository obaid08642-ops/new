/**
 * Phase 21.5 — one contact phone field at checkout, without SMS.
 * The formats named by the Verify: 05…, 5…, +9665…, 009665…, Arabic digits.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CheckoutContactService, hasContactPhone, normalizeDigits } from './checkout-contact.service';

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
    ['+٩٦٦٥٠١٢٣٤٥٦٧', '+966501234567'],
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

  const openCod = (patient: string, ids: string[], status = 'cod_due_on_delivery') =>
    conn.collection('pharmacy_orders').insertMany(ids.map((id) => ({ id, patient_account_id: patient, payment_method: 'cod', status })));

  beforeEach(async () => {
    for (const name of ['patient_profiles', 'system_configs']) await conn.collection(name).deleteMany({});
  });

  it('stores the checkout contact on the profile and shows the phone back', async () => {
    await conn.collection('users').insertOne({ id: 'u1', phone_verified: false });
    const saved = await svc.storeCheckoutContact('u1', { phone: '0501234567', address: 'Riyadh, Olaya' });
    expect(saved.phone.e164).toBe('+966501234567');
    expect(saved.phone.display).toBe('+966 50 123 4567');
    expect(saved.phone_verified).toBe(false);
    expect(saved.address_stored).toBe(true);
    const row = await conn.collection('patient_addresses').findOne({ user_id: 'u1' });
    expect(row?.phone_e164).toBe('+966501234567');
  });

  it('puts the address in the profile address book once, as the first (default) address', async () => {
    await svc.storeCheckoutContact('u-addr', { phone: '501234567', address: 'Riyadh, Olaya' });
    await svc.storeCheckoutContact('u-addr', { phone: '501234567', address: 'Riyadh, Olaya' });
    await svc.storeCheckoutContact('u-addr', { phone: '501234567', address: 'Jeddah, Tahlia' });
    const profile: any = await conn.collection('patient_profiles').findOne({ user_id: 'u-addr' });
    expect(profile.addresses.map((a: any) => a.street)).toEqual(['Riyadh, Olaya', 'Jeddah, Tahlia']);
    expect(profile.addresses.map((a: any) => a.is_default)).toEqual([true, false]);
    expect(profile.addresses[0].line1).toBe('Riyadh, Olaya');
  });

  it('a phone is a contact phone when the profile has one or checkout saved one', async () => {
    await conn.collection('users').insertMany([{ id: 'has-phone', phone: '0501234567' }, { id: 'no-phone' }, { id: 'saved' }]);
    expect(await hasContactPhone(conn, 'has-phone')).toBe(true);
    expect(await hasContactPhone(conn, 'no-phone')).toBe(false);
    await svc.storeCheckoutContact('saved', { phone: '0501234567' });
    expect(await hasContactPhone(conn, 'saved')).toBe(true);
  });

  it('caps the value of a cash order for an unverified customer, and not a verified one', async () => {
    await conn.collection('users').insertMany([{ id: 'u-new', phone_verified: false }, { id: 'u-ok', phone_verified: true }]);
    await expect(svc.assertCashOrderAllowed('u-new', 900)).rejects.toThrow('cod_value_limit_for_unverified_customer');
    await expect(svc.assertCashOrderAllowed('u-new', 100)).resolves.toBeUndefined();
    await expect(svc.assertCashOrderAllowed('u-ok', 5000)).resolves.toBeUndefined();
  });

  it('caps the open cash orders (the real order shape), but not the order being registered', async () => {
    await conn.collection('users').insertOne({ id: 'u-two', phone_verified: false });
    await openCod('u-two', ['a']);
    await expect(svc.assertCashOrderAllowed('u-two', 10)).resolves.toBeUndefined();
    await openCod('u-two', ['b']);
    await expect(svc.assertCashOrderAllowed('u-two', 10)).rejects.toThrow('cod_limit_reached_for_unverified_customer');
    await expect(svc.assertCashOrderAllowed('u-two', 10, 'b')).resolves.toBeUndefined();
    const gate = await svc.cashOnDeliveryLimits('u-two');
    expect(gate).toMatchObject({ allowed: false, open_cod_orders: 2, phone_verified: false });
  });

  it('delivered, cancelled and card orders do not count as open cash orders', async () => {
    await conn.collection('users').insertOne({ id: 'u-done', phone_verified: false });
    await openCod('u-done', ['d1', 'd2'], 'delivered');
    await openCod('u-done', ['c1'], 'cancelled');
    await conn.collection('pharmacy_orders').insertMany([
      { id: 'k1', patient_account_id: 'u-done', payment_method: 'card', status: 'confirmed' },
      { id: 'k2', patient_account_id: 'u-done', payment_method: 'card', status: 'confirmed' },
    ]);
    await expect(svc.assertCashOrderAllowed('u-done', 10)).resolves.toBeUndefined();
  });

  it('lifts the open-order cap once the phone is verified, and only markPhoneVerified does it', async () => {
    await conn.collection('users').insertOne({ id: 'u-v', phone_verified: false });
    await openCod('u-v', ['1', '2', '3']);
    await expect(svc.assertCashOrderAllowed('u-v', 10)).rejects.toThrow('cod_limit_reached_for_unverified_customer');
    await svc.storeCheckoutContact('u-v', { phone: '0501234567' });
    expect((await svc.cashOnDeliveryLimits('u-v')).allowed).toBe(false);
    await svc.markPhoneVerified('u-v', 'provider_call');
    expect((await svc.cashOnDeliveryLimits('u-v')).allowed).toBe(true);
    await expect(svc.assertCashOrderAllowed('u-v', 5000)).resolves.toBeUndefined();
  });

  it('the admin sets the limits in payment_rules; they win over the defaults', async () => {
    await conn.collection('users').insertOne({ id: 'u-cfg', phone_verified: false });
    await conn.collection('system_configs').insertOne({ key: 'payment_rules', value: { unverified_cod_max_sar: 50, unverified_cod_max_open_orders: 1 } });
    await expect(svc.assertCashOrderAllowed('u-cfg', 60)).rejects.toThrow('cod_value_limit_for_unverified_customer');
    await openCod('u-cfg', ['x']);
    await expect(svc.assertCashOrderAllowed('u-cfg', 10)).rejects.toThrow('cod_limit_reached_for_unverified_customer');
    expect((await svc.cashOnDeliveryLimits('u-cfg')).limits).toEqual({ max_value: 50, max_open_orders: 1 });
  });

  it('refuses a non-positive amount instead of passing it on', async () => {
    await conn.collection('users').insertOne({ id: 'u', phone_verified: false });
    await expect(svc.assertCashOrderAllowed('u', 0)).rejects.toThrow('order_amount_invalid');
    await expect(svc.assertCashOrderAllowed('u', Number.NaN)).rejects.toThrow('order_amount_invalid');
  });
});
