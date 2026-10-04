// R11 §5 lead 3 (admin paths not tested): the admin network gate and the
// device lock applied to role admin / super_admin only. A support_agent token
// (staff, USER_IMPERSONATE) was honoured from any client and any device, the
// mobile API path included.
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './auth.guard';
import { UserRole } from './enums';

describe('staff tokens go through the admin gate and device lock (R11 §5 lead 3)', () => {
  const OLD = { gate: process.env.ADMIN_GATE_TOKEN, env: process.env.NODE_ENV, secret: process.env.JWT_SECRET };
  let guard: JwtAuthGuard;
  beforeEach(() => {
    process.env.ADMIN_GATE_TOKEN = 'unit-gate-secret';
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'unit-test-secret-min-32-chars-0123456789abcdef';
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ id: 'staff-1', role: UserRole.SUPPORT_AGENT }) } as unknown as JwtService;
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(null) } as never;
    const model = { findOne: jest.fn().mockReturnThis(), lean: jest.fn(), create: jest.fn() };
    const connection = { model: jest.fn().mockReturnValue(model), collection: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }) } as never;
    guard = new JwtAuthGuard(jwt, reflector, connection, { validate: jest.fn() } as never);
  });
  afterAll(() => {
    for (const [k, v] of [['ADMIN_GATE_TOKEN', OLD.gate], ['NODE_ENV', OLD.env], ['JWT_SECRET', OLD.secret]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  });
  const ctx = (path: string, headers: Record<string, string>) => {
    const req = { headers, params: {}, query: {}, body: {}, path, socket: { remoteAddress: '127.0.0.1' } };
    return { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => ({}), getClass: () => ({}) } as never;
  };

  it('a support_agent token without the gate header is refused on the mobile API path', async () => {
    await expect(guard.canActivate(ctx('/api/v1/users/search', { authorization: 'Bearer t' }))).rejects.toThrow('admin_gate_required');
  });

  it('with the gate header it still needs an enrolled device', async () => {
    await expect(guard.canActivate(ctx('/api/v1/users/search', { authorization: 'Bearer t', 'x-admin-gate-token': 'unit-gate-secret' })))
      .rejects.toThrow('device_not_enrolled');
  });

  it('a finance token (DATA_EXPORT, payouts) is gated too, in any letter case', async () => {
    for (const role of ['finance', 'Finance']) {
      (guard as any).jwt.verifyAsync = jest.fn().mockResolvedValue({ id: 'fin-1', role });
      await expect(guard.canActivate(ctx('/api/v1/export/patients', { authorization: 'Bearer t' }))).rejects.toThrow('admin_gate_required');
    }
  });
});
