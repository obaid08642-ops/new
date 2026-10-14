/**
 * Phase 21.3 — the guest permission matrix, one test per row of the matrix the
 * owner approved, plus the admin edit that applies without a deploy.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  DEFAULT_GUEST_CAPABILITIES,
  GuestCapability,
  GuestCapabilityGuard,
  GuestPermissionMatrixService,
  GUEST_CAPABILITY_KEY,
} from './permission-matrix.service';
import { ExecutionContext } from '@nestjs/common';

jest.setTimeout(120_000);

const GUEST_MAY = [
  'browse', 'search', 'cart', 'pharmacy_order',
  'book_consultation', 'book_lab', 'book_radiology', 'book_nursing',
  'pay_card', 'pay_cash',
] as GuestCapability[];

const FULL_ACCOUNT_REQUIRED = [
  'insurance', 'family', 'medical_records', 'prescription_refill',
  'loyalty', 'saved_cards', 'chat_history',
] as GuestCapability[];

function ctx(capability: GuestCapability, user: Record<string, unknown>): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(GUEST_CAPABILITY_KEY, capability, handler);
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('Phase 21.3 guest permission matrix', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: GuestPermissionMatrixService;
  let guard: GuestCapabilityGuard;
  const reflector = {
    getAllAndOverride: (key: string, handlers: Array<() => unknown>) => {
      if (key !== GUEST_CAPABILITY_KEY) return undefined;
      for (const h of handlers) {
        const value = Reflect.getMetadata(key, h);
        if (value) return value;
      }
      return undefined;
    },
  } as never;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-matrix' }).asPromise();
    svc = new GuestPermissionMatrixService(conn);
    guard = new GuestCapabilityGuard(reflector, svc);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  beforeEach(async () => {
    const exists = (await conn.db!.collections()).some((c) => c.collectionName === 'guest_capability_matrix');
    if (!exists) await conn.createCollection('guest_capability_matrix').catch(() => undefined);
    await conn.collection('guest_capability_matrix').deleteMany({});
  });

  it.each(GUEST_MAY)('a guest may %s', async (capability) => {
    expect(DEFAULT_GUEST_CAPABILITIES[capability]).toBe(true);
    expect(await svc.isAllowed(capability)).toBe(true);
  });

  it.each(FULL_ACCOUNT_REQUIRED)('a full account is required for %s', async (capability) => {
    expect(DEFAULT_GUEST_CAPABILITIES[capability]).toBe(false);
    expect(await svc.isAllowed(capability)).toBe(false);
    expect(await svc.explain(capability)).toEqual({ code: 'account_required', capability });
  });

  it('the guard lets a guest through for an allowed capability and blocks a denied one', async () => {
    const guest = { is_guest: true, id: 'g' };
    await expect(guard.canActivate(ctx('insurance', guest))).rejects.toThrow('account_required');
    await expect(guard.canActivate(ctx('pharmacy_order', guest))).resolves.toBe(true);
  });

  it('the guard never blocks a signed-in account', async () => {
    await expect(guard.canActivate(ctx('insurance', { is_guest: false, id: 'a' }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx('insurance', {}))).resolves.toBe(true);
  });

  it('an admin change takes effect on the next request, with no deploy', async () => {
    expect(await svc.isAllowed('insurance')).toBe(false);
    await svc.setCapabilities({ insurance: true }, 'admin-1');
    expect(await svc.isAllowed('insurance')).toBe(true);
    expect(await svc.isAllowed('family')).toBe(false);
    const stored = await conn.collection('guest_capability_matrix').findOne({ id: 'default' });
    expect(stored?.updated_by).toBe('admin-1');
  });

  it('refuses an unknown capability or a non-boolean value', async () => {
    await expect(svc.setCapabilities({ not_a_capability: true } as never, 'admin-1')).rejects.toThrow('unknown_guest_capability');
    await expect(svc.setCapabilities({ insurance: 'yes' } as never, 'admin-1')).rejects.toThrow('guest_capability_must_be_boolean');
  });
});
