/**
 * Phase 21.8 — guest data lifecycle. The plan's Verify: "A scheduled-job test".
 *  - inactive guests with no orders are deleted after 12 months (configurable);
 *  - orders and invoices are kept, without identity data;
 *  - account deletion also covers guest data.
 * Real Mongo (in-memory), the real GuestService and the real PdplService: the same erasure runs for a guest and for an account.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CronExpression } from '@nestjs/schedule';
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants';
import { GuestService } from './guest.service';
import { GuestLifecycleService } from './guest-lifecycle.service';
import { AuthService } from './auth.service';
import { PdplService } from '../users/pdpl.service';
import { User, UserSchema } from '../../schemas/user.schema';

jest.setTimeout(120_000);

const DAY = 24 * 3600 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

describe('Phase 21.8 guest data lifecycle (real erasure)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let guests: GuestService;
  let lifecycle: GuestLifecycleService;
  let pdpl: PdplService;
  const col = (n: string) => conn.collection(n);

  beforeAll(async () => {
    process.env.GUEST_RETENTION_MONTHS = '12';
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-lifecycle-21-8' }).asPromise();
    const userModel = conn.model(User.name, UserSchema);
    pdpl = new PdplService(conn, userModel as never);
    guests = new GuestService(conn, new JwtService({ secret: 'x'.repeat(40) }), { getClient: () => null } as never, pdpl);
    lifecycle = new GuestLifecycleService(guests);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    for (const n of ['users', 'guest_devices', 'pharmacy_orders', 'pushtokens', 'patient_profiles', 'addresses', 'notifications', 'audit_logs', 'unified_carts']) {
      if (!(await conn.db!.collections()).some((c) => c.collectionName === n)) await conn.createCollection(n).catch(() => undefined);
      await col(n).deleteMany({});
    }
  });

  /** A guest with the personal data a guest accumulates. */
  const seedGuest = async (id: string, extra: Record<string, unknown> = {}) => {
    await col('users').insertOne({ id, is_guest: true, role: 'patient', active: true, createdAt: ago(500), ...extra });
    await col('guest_devices').insertOne({ device_hash: `h-${id}`, guest_id: id, last_seen_at: ago(500) });
    await col('pushtokens').insertOne({ user_id: id, token: `t-${id}` });
    await col('notifications').insertOne({ user_id: id, title: 'x' });
    await col('addresses').insertOne({ user_id: id, street: 'Olaya 1' });
  };
  const personalRows = async (id: string) =>
    (await col('pushtokens').countDocuments({ user_id: id })) + (await col('notifications').countDocuments({ user_id: id })) +
    (await col('addresses').countDocuments({ user_id: id })) + (await col('guest_devices').countDocuments({ guest_id: id }));

  it('the daily job is scheduled and runs the purge', async () => {
    const meta = Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, GuestLifecycleService.prototype.purgeInactiveGuests);
    expect(meta?.cronTime).toBe(CronExpression.EVERY_DAY_AT_4AM);
    await seedGuest('g-idle');
    expect(await lifecycle.purgeInactiveGuests()).toEqual({ anonymised: 0, deleted: 1 });
  });

  it('deletes an inactive guest with no orders: the account row, the device binding and every personal row', async () => {
    await seedGuest('g-idle');
    const r = await guests.purgeInactiveGuests();
    expect(r).toEqual({ anonymised: 0, deleted: 1 });
    expect(await col('users').countDocuments({ id: 'g-idle' })).toBe(0);
    expect(await personalRows('g-idle')).toBe(0);
    // the erasure itself is also in the trail (23.2 data_erasure); the lifecycle row says why it happened
    expect(await col('audit_logs').findOne({ resource_id: 'g-idle', action: 'account.guest_purged' })).toBeTruthy();
  });

  it('keeps the order of a guest who bought, without identity data; the personal data and the binding go', async () => {
    await seedGuest('g-bought', { full_name: 'Sara', phone: '+966500000001', email: 's@x.test' });
    await col('pharmacy_orders').insertOne({
      id: 'o1', patient_account_id: 'g-bought', total: 120, customer_phone: '+966500000001',
      delivery_address: { street: 'Olaya 1', lat: 24.7, lng: 46.7 },
    });
    const r = await guests.purgeInactiveGuests();
    expect(r).toEqual({ anonymised: 1, deleted: 0 });
    const order: any = await col('pharmacy_orders').findOne({ id: 'o1' });
    expect(order.total).toBe(120);
    expect(order.customer_phone).toBeUndefined();
    expect(order.delivery_address?.street).toBeUndefined();
    expect(order.patient_account_id).toBeUndefined();
    const kept: any = await col('users').findOne({ id: 'g-bought' });
    expect(kept).toMatchObject({ full_name: 'deleted guest', phone: null, email: null });
    expect(kept.anonymised_at).toBeTruthy();
    expect(await personalRows('g-bought')).toBe(0);
    expect(await col('audit_logs').findOne({ resource_id: 'g-bought', action: 'account.guest_anonymised' })).toBeTruthy();
    // the next run leaves the shell alone
    expect(await guests.purgeInactiveGuests()).toEqual({ anonymised: 0, deleted: 0 });
  });

  it('a guest who is still using the app is not purged, however old the account is', async () => {
    await seedGuest('g-active-refresh', { last_active_at: ago(5) });
    await seedGuest('g-active-binding');
    await col('guest_devices').updateOne({ guest_id: 'g-active-binding' }, { $set: { last_seen_at: ago(3) } });
    const r = await guests.purgeInactiveGuests();
    expect(r).toEqual({ anonymised: 0, deleted: 0 });
    expect(await col('users').countDocuments({})).toBe(2);
    expect(await personalRows('g-active-refresh')).toBeGreaterThan(0);
  });

  it('a merged guest, a recent guest and a registered user are never touched', async () => {
    await col('users').insertMany([
      { id: 'g-merged', is_guest: false, merged_into: 'acct', createdAt: ago(900) },
      { id: 'g-new', is_guest: true, createdAt: ago(10) },
      { id: 'acct', is_guest: false, createdAt: ago(900) },
    ]);
    expect(await guests.purgeInactiveGuests()).toEqual({ anonymised: 0, deleted: 0 });
    expect(await col('users').countDocuments({})).toBe(3);
  });

  it('the window is configurable: the environment, and one run through the admin cleanup', async () => {
    await col('users').insertOne({ id: 'g-40', is_guest: true, createdAt: ago(40) });
    expect(await guests.purgeInactiveGuests()).toEqual({ anonymised: 0, deleted: 0 });
    expect(await lifecycle.purgeInactiveGuests({ retentionDays: 30 })).toEqual({ anonymised: 0, deleted: 1 });
    await col('users').insertOne({ id: 'g-40b', is_guest: true, createdAt: ago(40) });
    process.env.GUEST_RETENTION_MONTHS = '1';
    try { expect(await guests.purgeInactiveGuests()).toEqual({ anonymised: 0, deleted: 1 }); } finally { process.env.GUEST_RETENTION_MONTHS = '12'; }
  });
});

describe('Phase 21.8 account deletion covers guest data', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let pdpl: PdplService;
  const col = (n: string) => conn.collection(n);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-erasure-21-8' }).asPromise();
    pdpl = new PdplService(conn, conn.model(User.name, UserSchema) as never);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    for (const n of ['users', 'guest_devices', 'pushtokens']) {
      if (!(await conn.db!.collections()).some((c) => c.collectionName === n)) await conn.createCollection(n).catch(() => undefined);
      await col(n).deleteMany({});
    }
  });

  it('erasing a registered account also removes the guests merged into it and their device bindings', async () => {
    const hash = await bcrypt.hash('Str0ng!Pass-1', 4);
    await col('users').insertMany([
      { id: 'acct', is_guest: false, role: 'patient', active: true, full_name: 'Sara', password_hash: hash, phone: '+966500000010' },
      { id: 'old-guest', is_guest: false, merged_into: 'acct', phone: 'merged-old-guest' },
      { id: 'other-guest', is_guest: false, merged_into: 'someone-else', phone: 'merged-other' },
    ]);
    await col('guest_devices').insertMany([
      { device_hash: 'a', guest_id: 'old-guest' },
      { device_hash: 'b', guest_id: 'acct' },
      { device_hash: 'c', guest_id: 'other-guest' },
    ]);
    const r = await pdpl.erasePatientData('acct', { password: 'Str0ng!Pass-1' });
    expect(r.deleted).toMatchObject({ merged_guest_shells: 1, guest_devices: 2 });
    expect(await col('users').countDocuments({ id: 'old-guest' })).toBe(0);
    expect(await col('users').countDocuments({ id: 'other-guest' })).toBe(1);
    expect((await col('guest_devices').find({}).toArray()).map((x: any) => x.guest_id)).toEqual(['other-guest']);
  });

  it('a guest deletes their own data with the guest session; no password is needed', async () => {
    await col('users').insertOne({ id: 'g1', is_guest: true, role: 'patient', active: true });
    await col('pushtokens').insertOne({ user_id: 'g1', token: 't' });
    await col('guest_devices').insertOne({ device_hash: 'x', guest_id: 'g1' });
    const r = await pdpl.erasePatientData('g1', { guestSession: true });
    expect(r.deleted).toMatchObject({ pushtokens: 1, guest_devices: 1 });
    expect(await col('guest_devices').countDocuments({ guest_id: 'g1' })).toBe(0);
  });

  it('the guest shortcut never works for a registered account', async () => {
    const hash = await bcrypt.hash('Str0ng!Pass-1', 4);
    await col('users').insertOne({ id: 'real', is_guest: false, role: 'patient', active: true, password_hash: hash });
    await expect(pdpl.erasePatientData('real', { guestSession: true })).rejects.toThrow('password_required');
    await expect(pdpl.erasePatientData('real', { retention: true })).rejects.toThrow('password_required');
    expect((await col('users').findOne({ id: 'real' }))?.active).toBe(true);
  });
});

describe('Phase 21.8 a guest refresh counts as activity', () => {
  const make = () => {
    const updateOne = jest.fn(async () => ({}));
    const svc: any = Object.create(AuthService.prototype);
    svc.userModel = { updateOne };
    return { svc, updateOne };
  };
  it('writes last_active_at, at most once a day', async () => {
    const { svc, updateOne } = make();
    await svc.touchGuestActivity({ id: 'g', last_active_at: ago(3) });
    await svc.touchGuestActivity({ id: 'g' });
    await svc.touchGuestActivity({ id: 'g', last_active_at: new Date() });
    expect(updateOne).toHaveBeenCalledTimes(2);
  });
});
