import { ExecutionContext, HttpException, UnauthorizedException } from '@nestjs/common';
import { AiUserQuotaGuard } from './ai-user-quota.guard';

const ctx = (user: any) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;

describe('AiUserQuotaGuard (a paid AI call per signed-in user per day)', () => {
  const saved = process.env.AI_USER_DAILY_QUOTA;
  afterEach(() => { if (saved === undefined) delete process.env.AI_USER_DAILY_QUOTA; else process.env.AI_USER_DAILY_QUOTA = saved; });

  it('the limit is 20 by default and AI_USER_DAILY_QUOTA only when it is a positive whole number', () => {
    delete process.env.AI_USER_DAILY_QUOTA;
    expect(AiUserQuotaGuard.dailyLimit()).toBe(20);
    for (const bad of ['', '0', '-3', 'abc', '2.5x']) { process.env.AI_USER_DAILY_QUOTA = bad; expect(AiUserQuotaGuard.dailyLimit()).toBe(bad === '2.5x' ? 2 : 20); }
    process.env.AI_USER_DAILY_QUOTA = '7';
    expect(AiUserQuotaGuard.dailyLimit()).toBe(7);
  });

  it('a call without a signed-in user id is refused', async () => {
    const guard = new AiUserQuotaGuard({ checkRateLimit: jest.fn() } as any);
    await expect(guard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(ctx({ id: '' }))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(ctx({ id: 42 }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('counts under the user id and the UTC day for 24 hours, and lets the call through while under the limit', async () => {
    process.env.AI_USER_DAILY_QUOTA = '5';
    const checkRateLimit = jest.fn().mockResolvedValue({ allowed: true });
    const guard = new AiUserQuotaGuard({ checkRateLimit } as any);
    await expect(guard.canActivate(ctx({ id: 'u1' }))).resolves.toBe(true);
    expect(checkRateLimit).toHaveBeenCalledWith(`ai-user:u1:${new Date().toISOString().slice(0, 10)}`, 5, 86_400);
  });

  it('past the limit it answers 429 ai_quota_exceeded', async () => {
    const guard = new AiUserQuotaGuard({ checkRateLimit: jest.fn().mockResolvedValue({ allowed: false }) } as any);
    const err = await guard.canActivate(ctx({ id: 'u1' })).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(err.getResponse()).toEqual({ code: 'ai_quota_exceeded', message: 'ai_quota_exceeded' });
  });

  it('without Redis the call is not blocked (the gateway has its own limits)', async () => {
    await expect(new AiUserQuotaGuard().canActivate(ctx({ id: 'u1' }))).resolves.toBe(true);
  });
});
