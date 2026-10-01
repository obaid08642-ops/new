import { ForbiddenException } from '@nestjs/common';
import { StepUpService, StepUpGuard } from './step-up.guard';
import { RedisService } from '../modules/redis/redis.service';

describe('C4: Step-up re-authentication', () => {
  let service: StepUpService;
  let guard: StepUpGuard;
  let reflector: any;

  beforeEach(() => {
    const passkeyModel: any = { findOne: jest.fn(), updateOne: jest.fn() };
    // Same RedisService store for issue/verify inside one test. Cross-worker
    // behavior is covered by step-up.redis.spec.ts with two service instances.
    const redis = new RedisService();
    service = new StepUpService(passkeyModel, redis);
    reflector = { getAllAndOverride: jest.fn() };
    guard = new StepUpGuard(reflector, service, passkeyModel);
  });

  const ctx = (user: any, headers: Record<string, string> = {}, path = '/api/v1/admin/refunds') => ({
    switchToHttp: () => ({ getRequest: () => ({ user, headers, path, method: 'POST' }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  it('issues and verifies a step-up token', async () => {
    const token = await service.issue('u1', 'POST:/api/v1/admin/refunds');
    await expect(service.verify('u1', 'POST:/api/v1/admin/refunds', token)).resolves.toBe(true);
  });

  it('rejects a used token (single-use)', async () => {
    const token = await service.issue('u1', 'POST:/api/v1/admin/refunds');
    await expect(service.verify('u1', 'POST:/api/v1/admin/refunds', token)).resolves.toBe(true);
    await expect(service.verify('u1', 'POST:/api/v1/admin/refunds', token)).resolves.toBe(false);
  });

  it('rejects token for different action', async () => {
    const token = await service.issue('u1', 'POST:/api/v1/admin/refunds');
    await expect(service.verify('u1', 'POST:/api/v1/admin/payouts', token)).resolves.toBe(false);
  });

  it('rejects token for different user', async () => {
    const token = await service.issue('u1', 'POST:/api/v1/admin/refunds');
    await expect(service.verify('u2', 'POST:/api/v1/admin/refunds', token)).resolves.toBe(false);
  });

  it('guard requires a token on step-up endpoints', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctx({ id: 'u1' }) as any)).rejects.toThrow(ForbiddenException);
  });

  it('guard rejects with invalid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': 'invalid' }) as any)).rejects.toThrow(ForbiddenException);
  });

  it('guard allows with valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const token = await service.issue('u1', 'POST:/api/v1/admin/refunds');
    const result = await guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': token }) as any);
    expect(result).toBe(true);
  });

  it('guard rejects a step-up endpoint without a token even before enrollment', async () => {
    // X4 keeps bootstrap sessions out of admin routes in JwtAuthGuard. This guard
    // still requires the token on every @StepUp() route; it never bypasses it.
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctx({ id: 'u1' }) as any)).rejects.toThrow(ForbiddenException);
  });

  it('guard skips non-step-up endpoints', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const result = await guard.canActivate(ctx({ id: 'u1' }, {}, '/api/v1/patient/orders') as any);
    expect(result).toBe(true);
  });
});
