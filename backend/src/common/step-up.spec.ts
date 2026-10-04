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

describe('R23: step-up options ceremony', () => {
  // The UI calls POST options (empty body, admin session) to get a WebAuthn
  // challenge, runs the ceremony, then POSTs the assertion to issue. Before
  // this, no route minted the webauthn_stepup:{userId} challenge that
  // issueFromAssertion verifies, so every ceremony died with
  // challenge_expired before the user touched their key.
  const store = new Map<string, string>();
  const redis: any = {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    // R23: the challenge is consumed on read.
    take: jest.fn(async (k: string) => { const v = store.get(k) ?? null; store.delete(k); return v; }),
    set: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
  };
  const passkeyModel: any = {
    find: jest.fn(() => ({ lean: async () => [{ credential_id: 'cred-1', transports: ['usb'] }] })),
  };
  const svc = () => new StepUpService(passkeyModel, redis);

  it('mints a challenge the issue path can read back', async () => {
    const service = svc();
    const challenge = await service.storeChallenge('u1');
    expect(challenge).toBeTruthy();
    expect(await service['takeChallenge']('webauthn_stepup:u1')).toBe(challenge);
  });

  it('lists enrolled credential ids for allowCredentials', async () => {
    const service = svc();
    const ids = await service.credentialIds('u1');
    expect(ids).toEqual([{ id: 'cred-1', transports: ['usb'] }]);
  });

  it('options returns WebAuthn options for an admin with a passkey', async () => {
    const { StepUpController } = require('../modules/auth/step-up.controller');
    const controller = new StepUpController({} as any, svc());
    const res: any = await controller.options({ id: 'u1', role: 'admin' });
    expect(res.options.challenge).toBeTruthy();
    expect(res.options.allowCredentials).toEqual([{ id: 'cred-1', type: 'public-key', transports: ['usb'] }]);
    expect(res.options.userVerification).toBe('preferred');
  });

  it('options refuses an admin with no passkey enrolled', async () => {
    const { StepUpController } = require('../modules/auth/step-up.controller');
    const emptyModel: any = { find: jest.fn(() => ({ lean: async () => [] })) };
    const service = new StepUpService(emptyModel, redis);
    const controller = new StepUpController({} as any, service);
    await expect(controller.options({ id: 'u9', role: 'admin' })).rejects.toThrow('no_passkey');
  });
});
