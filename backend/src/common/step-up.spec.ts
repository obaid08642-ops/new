import { ForbiddenException } from '@nestjs/common';
import { StepUpService, StepUpGuard } from './step-up.guard';

describe('C4: Step-up re-authentication', () => {
  let service: StepUpService;
  let guard: StepUpGuard;
  let reflector: any;

  // Whether the account has an enrolled passkey. Step-up is a SECOND factor, so
  // the guard can only enforce it once one exists; with no factor there is
  // nothing to re-present and demanding a token would lock the admin out of every
  // sensitive action. Both branches are covered below.
  let enrolledFactor: any;

  beforeEach(() => {
    // StepUpService and StepUpGuard both take the PasskeyCredential model, and the
    // guard queries it on every canActivate. A bare `{}` is not enough: the call is
    // `findOne(...).lean().catch(...)`, and a missing method throws synchronously,
    // which .catch() cannot absorb.
    const passkeyModel: any = { findOne: () => ({ lean: async () => enrolledFactor }) };
    service = new StepUpService(passkeyModel);
    reflector = { getAllAndOverride: jest.fn() };
    guard = new StepUpGuard(reflector, service, passkeyModel);
    enrolledFactor = { credential_id: 'cred-1' };
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

  // canActivate became async when the guard started querying the passkey model to
  // decide whether the admin has a second factor, so a synchronous toThrow() no
  // longer observes the rejection — it has to be awaited.
  it('guard rejects without token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctx({ id: 'u1' }) as any)).rejects.toThrow(ForbiddenException);
  });

  it('guard rejects with invalid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': 'invalid' }) as any)).rejects.toThrow(ForbiddenException);
  });

  it('guard allows with valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const token = service.issue('u1', 'POST:/api/v1/admin/refunds');
    const result = await guard.canActivate(ctx({ id: 'u1' }, { 'x-step-up-token': token }) as any);
    expect(result).toBe(true);
  });

  it('guard allows a step-up endpoint when no second factor is enrolled yet', async () => {
    // Documented bootstrap: the base authentication is the strongest factor that
    // exists, so requiring a token the admin cannot present would be a lockout.
    enrolledFactor = null;
    reflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(ctx({ id: 'u1' }) as any);
    expect(result).toBe(true);
  });

  it('guard skips non-step-up endpoints', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const result = await guard.canActivate(ctx({ id: 'u1' }, {}, '/api/v1/patient/orders') as any);
    expect(result).toBe(true);
  });
});
