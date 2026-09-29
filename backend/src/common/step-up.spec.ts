import { ForbiddenException } from '@nestjs/common';
import { StepUpService, StepUpGuard } from './step-up.guard';

describe('C4: Step-up re-authentication', () => {
  let service: StepUpService;
  let guard: StepUpGuard;
  let reflector: any;

  beforeEach(() => {
    service = new StepUpService();
    reflector = { getAllAndOverride: jest.fn() };
    guard = new StepUpGuard(reflector, service);
  });

  const ctx = (user: any, headers: Record<string, string> = {}, path = '/api/v1/admin/refunds') => ({
    switchToHttp: () => ({ getRequest: () => ({ user, headers, path, method: 'POST' }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  it('issues and verifies a step-up token', () => {
    const token = service.issue('u1', 'POST:/api/v1/admin/refunds');
    expect(service.verify('u1', 'POST:/api/v1/admin/refunds', token)).toBe(true);
  });

  it('rejects a used token (single-use)', () => {
    const token = service.issue('u1', 'POST:/api/v1/admin/refunds');
    expect(service.verify('u1', 'POST:/api/v1/admin/refunds', token)).toBe(true);
    expect(service.verify('u1', 'POST:/api/v1/admin/refunds', token)).toBe(false);
  });

  it('rejects token for different action', () => {
    const token = service.issue('u1', 'POST:/api/v1/admin/refunds');
    expect(service.verify('u1', 'POST:/api/v1/admin/payouts', token)).toBe(false);
  });

  it('rejects token for different user', () => {
    const token = service.issue('u1', 'POST:/api/v1/admin/refunds');
    expect(service.verify('u2', 'POST:/api/v1/admin/refunds', token)).toBe(false);
  });

  it('guard rejects without token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(() => guard.canActivate(ctx({ id: 'u1' }) as any)).toThrow(ForbiddenException);
  });

  it('guard rejects with invalid token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(() => guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': 'invalid' }) as any)).toThrow(ForbiddenException);
  });

  it('guard allows with valid token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const token = service.issue('u1', 'POST:/api/v1/admin/refunds');
    const result = guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': token }) as any);
    expect(result).toBe(true);
  });

  it('guard skips non-step-up endpoints', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const result = guard.canActivate(ctx({ id: 'u1' }, {}, '/api/v1/patient/orders') as any);
    expect(result).toBe(true);
  });
});
