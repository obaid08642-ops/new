// X4 (ca16fa7): "Enroll a device only after a passkey assertion, and bind it to
// that credential." Before: any admin session could enroll a new browser through
// POST /admin/devices/enroll or /lock (both exempt from the device check), and
// the guard never checked the credential a device was bound to.
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHash } from 'crypto';
import { JwtAuthGuard } from '../../common/auth.guard';
import { ImpersonationSessionService } from '../../common/impersonation-session.service';
import { AdminDeviceService } from './admin-device.service';
import { AdminDevicesController } from './admin-devices.controller';
import { AdminRecoveryController } from './admin-recovery.controller';
import { AuthService } from './auth.service';

jest.setTimeout(60_000);

const DEV = 'd'.repeat(32);
const hash = (id: string) => createHash('sha256').update(id).digest('hex');

describe('X4: devices are bound to a passkey assertion', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let devices: AdminDeviceService;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'x4' }).asPromise();
    devices = new AdminDeviceService(conn);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    for (const c of ['admin_devices', 'passkey_credentials', 'users']) await conn.collection(c).deleteMany({});
    await conn.collection('users').insertOne({ id: 'u1', role: 'admin', token_version: 1 });
  });

  async function guardFor(payload: Record<string, unknown>) {
    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: { verifyAsync: jest.fn().mockResolvedValue(payload) } },
        { provide: 'Reflector', useValue: { getAllAndOverride: jest.fn(() => undefined) } },
        { provide: 'DatabaseConnection', useValue: conn },
        { provide: ImpersonationSessionService, useValue: { validate: jest.fn() } },
      ],
    }).compile();
    const guard = module.get(JwtAuthGuard);
    return (path: string) => guard.canActivate({
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer t', 'x-admin-device': DEV }, path, ip: '127.0.0.1' }) }),
      getHandler: () => ({}), getClass: () => ({}),
    } as never);
  }

  describe('enrolling outside a passkey login', () => {
    const ctl = () => new AdminDevicesController(devices);
    const req = { headers: { 'user-agent': 'ua' } };

    it('a bootstrap admin (no passkey yet) may enroll this browser', async () => {
      await expect(ctl().enroll({ id: 'u1' }, req, { device_id: DEV } as never)).resolves.toEqual({ ok: true });
    });
    it('an admin with a passkey may not (passkey_assertion_required)', async () => {
      await conn.collection('passkey_credentials').insertOne({ user_id: 'u1', credential_id: 'cred-1' });
      await expect(ctl().enroll({ id: 'u1' }, req, { device_id: DEV } as never)).rejects.toThrow('passkey_assertion_required');
      expect(await conn.collection('admin_devices').countDocuments()).toBe(0);
    });
    it('a break-glass recovery session may (rec claim)', async () => {
      await conn.collection('passkey_credentials').insertOne({ user_id: 'u1', credential_id: 'cred-1' });
      await expect(ctl().enroll({ id: 'u1', rec: 1 }, req, { device_id: DEV } as never)).resolves.toEqual({ ok: true });
    });
    it('turning the lock on does not enroll a new browser for a passkey admin', async () => {
      await conn.collection('passkey_credentials').insertOne({ user_id: 'u1', credential_id: 'cred-1' });
      await ctl().setLock({ id: 'u1' }, { headers: { 'x-admin-device': DEV } }, { enabled: true } as never);
      expect(await conn.collection('admin_devices').countDocuments()).toBe(0);
    });
  });

  describe('the guard', () => {
    it('a device whose bound passkey was removed is refused (device_credential_revoked)', async () => {
      await conn.collection('admin_devices').insertOne({ user_id: 'u1', device_hash: hash(DEV), credential_id: 'gone' });
      const call = await guardFor({ id: 'u1', role: 'admin', tv: 1 });
      await expect(call('/api/v1/admin/users')).rejects.toThrow('device_credential_revoked');
    });
    it('with enforcement, an unbound (bootstrap) device of a passkey admin must re-bind', async () => {
      const prev = process.env.ADMIN_PASSKEY_ENFORCED;
      process.env.ADMIN_PASSKEY_ENFORCED = 'true';
      try {
        await conn.collection('passkey_credentials').insertOne({ user_id: 'u1', credential_id: 'cred-1' });
        await conn.collection('admin_devices').insertOne({ user_id: 'u1', device_hash: hash(DEV) });
        await expect((await guardFor({ id: 'u1', role: 'admin', tv: 1 }))('/api/v1/admin/users')).rejects.toThrow('device_rebind_required');
        // A break-glass session keeps working; a bound device works.
        await expect((await guardFor({ id: 'u1', role: 'admin', tv: 1, rec: 1 }))('/api/v1/admin/users')).resolves.toBe(true);
        await conn.collection('admin_devices').updateOne({ user_id: 'u1' }, { $set: { credential_id: 'cred-1' } });
        await expect((await guardFor({ id: 'u1', role: 'admin', tv: 1 }))('/api/v1/admin/users')).resolves.toBe(true);
      } finally {
        process.env.ADMIN_PASSKEY_ENFORCED = prev;
      }
    });
    it('with enforcement, a bootstrap session reaches only passkey/device endpoints (403 elsewhere)', async () => {
      const prev = process.env.ADMIN_PASSKEY_ENFORCED;
      process.env.ADMIN_PASSKEY_ENFORCED = 'true';
      try {
        await conn.collection('admin_devices').insertOne({ user_id: 'u1', device_hash: hash(DEV) });
        const call = await guardFor({ id: 'u1', role: 'admin', tv: 1 });
        await expect(call('/api/v1/admin/command-center')).rejects.toThrow('passkey_enrollment_required');
        await expect(call('/api/v1/auth/passkey/enroll/options')).resolves.toBe(true);
      } finally {
        process.env.ADMIN_PASSKEY_ENFORCED = prev;
      }
    });
  });

  it('recovery redeem issues a token with the rec claim and alerts the owner', async () => {
    const signed: Record<string, unknown>[] = [];
    const auth = Object.assign(Object.create(AuthService.prototype), {
      jwt: { sign: (p: Record<string, unknown>) => { signed.push(p); return 'tok'; } },
      storeRefreshSession: async () => undefined,
      userModel: { findOne: async () => ({ id: 'u1', email: 'a@nabd.test', role: 'admin', save: async () => undefined }) },
      otpContact: () => 'a@nabd.test',
      verifyOtp: async () => true,
      publicUser: (u: { id: string }) => ({ id: u.id }),
      adminLoginAlert: jest.fn(async () => undefined),
    });
    const ctl = new AdminRecoveryController(auth, { consume: async () => undefined } as never);
    await ctl.redeem({ email: 'a@nabd.test', email_code: '123456', recovery_code: 'ABCD-EFGH' } as never);
    expect(signed[0]).toEqual(expect.objectContaining({ id: 'u1', rec: 1 }));
    expect(auth.adminLoginAlert).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), true, expect.anything());
  });
});

// Live finding: AuthService declared `@Optional() adminDevices?: any`, so Nest
// had no injection token and completePasskeyLogin never enrolled (or bound) the
// device; only the BFF's generic enroll did.
describe('X4: the passkey login can bind the device', () => {
  it('AuthService receives AdminDeviceService from the module', async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AdminDeviceService, useValue: { enroll: jest.fn() } },
        { provide: 'UserRepository', useValue: {} },
        { provide: 'PatientProfileRepository', useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: (require('@nestjs/event-emitter') as typeof import('@nestjs/event-emitter')).EventEmitter2, useValue: {} },
        { provide: (require('../redis/redis.service') as typeof import('../redis/redis.service')).RedisService, useValue: {} },
      ],
    }).compile();
    const auth = module.get(AuthService) as unknown as { adminDevices?: unknown };
    expect(auth.adminDevices).toEqual({ enroll: expect.any(Function) });
  });
});
