/** 16.12 - "per-user rate limits on expensive actions": one budget per account, not per IP. */
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRateLimitGuard, UserRateLimit, effectiveSpec, USER_RATE_LIMIT_KEY } from './user-rate-limit';

class FakeRedis {
  counts = new Map<string, number>();
  async checkRateLimit(key: string, limit: number) {
    const n = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, n);
    return { allowed: n <= limit, remaining: Math.max(0, limit - n) };
  }
}

class Handler { upload() { return 1; } }
UserRateLimit('upload', 3, 3600)(Handler.prototype, 'upload', Object.getOwnPropertyDescriptor(Handler.prototype, 'upload')!);

function ctx(user?: { id: string }, ip = '1.1.1.1') {
  const headers: Record<string, string> = {};
  const c = {
    getHandler: () => Handler.prototype.upload, getClass: () => Handler,
    switchToHttp: () => ({ getRequest: () => ({ user, ip }), getResponse: () => ({ setHeader: (k: string, v: string) => { headers[k] = v; } }) }),
  } as unknown as ExecutionContext;
  return { c, headers };
}

describe('UserRateLimitGuard', () => {
  const guard = (redis: FakeRedis | undefined) => new UserRateLimitGuard(new Reflector(), redis as never);

  it('lets an account use its budget and then answers 429 rate_limited with Retry-After', async () => {
    const g = guard(new FakeRedis());
    for (let i = 0; i < 3; i++) expect(await g.canActivate(ctx({ id: 'u1' }).c)).toBe(true);
    const { c, headers } = ctx({ id: 'u1' });
    const err = await g.canActivate(c).catch((e) => e as HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect((err as HttpException).getResponse()).toMatchObject({ code: 'rate_limited', bucket: 'upload' });
    expect(headers['Retry-After']).toBe('3600');
  });

  it('is per account: another account on the same address has its own budget', async () => {
    const g = guard(new FakeRedis());
    for (let i = 0; i < 3; i++) await g.canActivate(ctx({ id: 'u1' }, '9.9.9.9').c);
    await expect(g.canActivate(ctx({ id: 'u1' }, '9.9.9.9').c)).rejects.toBeInstanceOf(HttpException);
    expect(await g.canActivate(ctx({ id: 'u2' }, '9.9.9.9').c)).toBe(true);
  });

  it('a script that changes address does not get a fresh budget for the same account', async () => {
    const g = guard(new FakeRedis());
    for (let i = 0; i < 3; i++) await g.canActivate(ctx({ id: 'u1' }, `10.0.0.${i}`).c);
    await expect(g.canActivate(ctx({ id: 'u1' }, '10.0.0.99').c)).rejects.toBeInstanceOf(HttpException);
  });

  it('a visitor who is not signed in is counted by address', async () => {
    const g = guard(new FakeRedis());
    for (let i = 0; i < 3; i++) await g.canActivate(ctx(undefined, '2.2.2.2').c);
    await expect(g.canActivate(ctx(undefined, '2.2.2.2').c)).rejects.toBeInstanceOf(HttpException);
    expect(await g.canActivate(ctx(undefined, '3.3.3.3').c)).toBe(true);
  });

  it('does nothing on a handler without the decorator or without Redis', async () => {
    expect(await guard(undefined).canActivate(ctx({ id: 'u1' }).c)).toBe(true);
    const plain = { getHandler: () => function other() {}, getClass: () => class Other {}, switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }) } as unknown as ExecutionContext;
    expect(await guard(new FakeRedis()).canActivate(plain)).toBe(true);
  });

  it('the environment can tune the budget; a malformed value is ignored, never "unlimited"', () => {
    const spec = { bucket: 'upload', limit: 30, windowSeconds: 3600 };
    expect(effectiveSpec(spec, { USER_RATE_LIMIT_UPLOAD: '60/7200' } as never)).toMatchObject({ limit: 60, windowSeconds: 7200 });
    for (const bad of ['0/3600', 'abc', '10/0', '10', '-5/60', '99999999/60']) expect(effectiveSpec(spec, { USER_RATE_LIMIT_UPLOAD: bad } as never)).toEqual(spec);
    expect(Reflect.getMetadata(USER_RATE_LIMIT_KEY, Handler.prototype.upload)).toMatchObject({ bucket: 'upload' });
  });
});
