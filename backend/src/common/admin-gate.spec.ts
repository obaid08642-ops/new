import { ForbiddenException } from '@nestjs/common';
import { AdminGateGuard } from './admin-gate.guard';

describe('C3: Admin network gate', () => {
  let guard: AdminGateGuard;

  beforeEach(() => {
    guard = new AdminGateGuard();
    process.env.ADMIN_GATE_TOKEN = 'test-gate-secret';
    process.env.NODE_ENV = 'test';
  });

  const ctx = (path: string, headers: Record<string, string> = {}) => ({
    switchToHttp: () => ({ getRequest: () => ({ path, url: path, headers }) }),
  });

  it('rejects /admin/* without gate token', () => {
    expect(() => guard.canActivate(ctx('/api/v1/admin/users') as any))
      .toThrow(ForbiddenException);
  });

  it('rejects /admin/* with wrong gate token', () => {
    expect(() => guard.canActivate(ctx('/api/v1/admin/users', { 'x-admin-gate-token': 'wrong' }) as any))
      .toThrow(ForbiddenException);
  });

  it('allows /admin/* with correct gate token', () => {
    const result = guard.canActivate(ctx('/api/v1/admin/users', { 'x-admin-gate-token': 'test-gate-secret' }) as any);
    expect(result).toBe(true);
  });

  it('allows non-admin paths without gate token', () => {
    const result = guard.canActivate(ctx('/api/v1/patient/orders') as any);
    expect(result).toBe(true);
  });

  it('fails closed in production when gate token not configured', () => {
    delete process.env.ADMIN_GATE_TOKEN;
    process.env.NODE_ENV = 'production';
    expect(() => guard.canActivate(ctx('/api/v1/admin/users') as any))
      .toThrow(ForbiddenException);
  });
});
