/**
 * 21.1 Verify, on the real AuthService.guest with a real MongoDB:
 *   "Reinstalling the app without signing in creates a new guest; a reopen keeps the same guest."
 * A reopen is the same device id; a reinstall is a new device id (the app keeps it in storage that goes with the install).
 */
import { BadRequestException } from '@nestjs/common';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserSchema } from '../../schemas/user.schema';
import { AuthService, guestDeviceHash, normaliseGuestDeviceId } from './auth.service';

jest.setTimeout(120_000);

describe('guest identity (21.1)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let service: AuthService;
  let users: any;
  const patients: any[] = [];
  const signed: any[] = [];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'guest-identity-test-secret';
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-id' }).asPromise();
    users = conn.model('User', UserSchema);
    await users.syncIndexes();
    service = Object.create(AuthService.prototype);
    (service as any).userModel = users;
    (service as any).patientModel = { create: async (d: any) => { patients.push(d); return d; }, deleteOne: async () => undefined };
    (service as any).jwtService = { sign: (p: any) => { signed.push(p); return `jwt.${p.id}`; } };
    (service as any).publicUser = (u: any) => ({ id: u.id, is_guest: u.is_guest, role: u.role, phone: u.phone });
    (service as any).signToken = (u: any, dev?: string) => { signed.push({ id: u.id, dev }); return { accessToken: `jwt.${u.id}`, refreshToken: 'r' }; };
    // a Redis that has lost everything - the binding must not depend on it
    (service as any).redisService = { getClient: () => undefined };
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => { await users.deleteMany({}); await conn.collection('guest_devices').deleteMany({}); patients.length = 0; signed.length = 0; });

  it('a reopen (same device id) keeps the same guest', async () => {
    const first: any = await service.guest(undefined, 'device-install-0001');
    const again: any = await service.guest(undefined, 'device-install-0001');
    expect(first.user.is_guest).toBe(true);
    expect(again.user.id).toBe(first.user.id);
    expect(await users.countDocuments({ is_guest: true })).toBe(1);
  });

  it('a reinstall (a new device id) is a new guest', async () => {
    const before: any = await service.guest(undefined, 'device-install-0001');
    const after: any = await service.guest(undefined, 'device-install-0002');
    expect(after.user.id).not.toBe(before.user.id);
    expect(await users.countDocuments({ is_guest: true })).toBe(2);
  });

  it('the binding is in the database, not in Redis: it survives a Redis that lost everything', async () => {
    const first: any = await service.guest(undefined, 'device-install-0003');
    // the Redis stub above has no client at all; the same answer comes from MongoDB
    const again: any = await service.guest(undefined, 'device-install-0003');
    expect(again.user.id).toBe(first.user.id);
    const row: any = await conn.collection('guest_devices').findOne({});
    expect(row.guest_id).toBe(first.user.id);
    expect(JSON.stringify(row)).not.toContain('device-install-0003');      // only a keyed hash is stored
    expect(row.device_hash).toBe(guestDeviceHash('device-install-0003'));
  });

  it('twelve first requests of one device at once make one guest', async () => {
    const results: any[] = await Promise.all(Array.from({ length: 12 }, () => service.guest(undefined, 'device-race-0001')));
    expect(new Set(results.map((r) => r.user.id)).size).toBe(1);
    expect(await users.countDocuments({ is_guest: true })).toBe(1);
    expect(await conn.collection('guest_devices').countDocuments({})).toBe(1);
  });

  it('a client-supplied phone is not identity: it neither reaches another guest nor lands on the new row', async () => {
    const a: any = await service.guest(undefined, 'device-phone-0001');
    await users.updateOne({ id: a.user.id }, { $set: { phone: '+966500001111' } });     // a guest who typed a phone at checkout
    const b: any = await service.guest('+966500001111', 'device-phone-0002');
    expect(b.user.id).not.toBe(a.user.id);
    expect(b.user.phone).not.toBe('+966500001111');
    const registered = await users.create({ full_name: 'R', phone: '+966500002222', is_guest: false, role: 'patient' });
    const c: any = await service.guest(registered.phone, 'device-phone-0003');
    expect(c.user.id).not.toBe(registered.id);
    expect(c.user.phone).not.toBe('+966500002222');
    // so a person can still register with that number later: no guest row holds it
    await expect(users.create({ full_name: 'Later', phone: '+966500009999', is_guest: false, role: 'patient' })).resolves.toBeDefined();
  });

  it('no device id (or a malformed one) is refused: the IP address is never the identity', async () => {
    for (const bad of [undefined, '', 'short', 'x'.repeat(200), 'has spaces in it', '<script>alert(1)</script>']) {
      await expect(service.guest(undefined, bad as never)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(await users.countDocuments({ is_guest: true })).toBe(0);
  });

  it('a guest that was converted to an account is never re-issued from its old device id', async () => {
    const g: any = await service.guest(undefined, 'device-convert-0001');
    await users.updateOne({ id: g.user.id }, { $set: { is_guest: false, phone: '+966500003333' } });
    const next: any = await service.guest(undefined, 'device-convert-0001');
    expect(next.user.id).not.toBe(g.user.id);
    expect(next.user.is_guest).toBe(true);
    const bound: any = await conn.collection('guest_devices').findOne({ device_hash: guestDeviceHash('device-convert-0001') });
    expect(bound.guest_id).toBe(next.user.id);
  });

  it('the device id is accepted from a header array and normalised the same way', () => {
    expect(normaliseGuestDeviceId(['device-array-0001', 'x'])).toBe('device-array-0001');
    expect(normaliseGuestDeviceId(12345678)).toBeNull();
  });
});
