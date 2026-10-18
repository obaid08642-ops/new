import { HttpException } from '@nestjs/common';
import { LoginLockService, lockSeconds } from './login-lock.service';
import { RedisService } from '../modules/redis/redis.service';

/** 16.2: progressive lockout. A real in-memory RedisService (no server), so the counters and the TTLs behave as in production. */
function build() {
  const redis = new RedisService();
  return { svc: new LoginLockService(redis), redis };
}
const locked = async (p: Promise<unknown>) => p.then(() => null, (e: HttpException) => e);

describe('lockSeconds', () => {
  it('doubles from a minute up to fifteen minutes', () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(lockSeconds)).toEqual([60, 120, 240, 480, 900, 900, 900]);
  });
});

describe('LoginLockService (16.2)', () => {
  it('lets four wrong passwords through, then locks the fifth for a minute from that address', async () => {
    const { svc } = build();
    for (let i = 0; i < 4; i += 1) {
      await svc.assertNotLocked('a@b.test', '1.1.1.1');
      expect(await svc.recordFailure('a@b.test', '1.1.1.1')).toBe(0);
    }
    expect(await svc.recordFailure('a@b.test', '1.1.1.1')).toBe(60);
    const err = await locked(svc.assertNotLocked('a@b.test', '1.1.1.1'));
    expect(err?.getStatus()).toBe(429);
    expect(err?.getResponse()).toMatchObject({ message: 'login_locked', code: 'login_locked' });
    expect((err?.getResponse() as any).retry_after_seconds).toBeGreaterThan(0);
  });

  it('the lock grows with every further failure', async () => {
    const { svc } = build();
    const seconds: number[] = [];
    for (let i = 0; i < 8; i += 1) seconds.push(await svc.recordFailure('a@b.test', '1.1.1.1'));
    expect(seconds.slice(4)).toEqual([60, 120, 240, 480]);
  });

  it('an unknown identifier is locked exactly like a real one: nothing tells them apart', async () => {
    const { svc } = build();
    for (let i = 0; i < 5; i += 1) await svc.recordFailure('nobody@nowhere.test', '9.9.9.9');
    const err = await locked(svc.assertNotLocked('nobody@nowhere.test', '9.9.9.9'));
    expect(err?.getResponse()).toMatchObject({ message: 'login_locked' });
  });

  it('a lock from one address does not lock the owner on another network, but twenty failures from anywhere do', async () => {
    const { svc } = build();
    for (let i = 0; i < 6; i += 1) await svc.recordFailure('owner@b.test', '6.6.6.6');
    expect(await locked(svc.assertNotLocked('owner@b.test', '6.6.6.6'))).not.toBeNull();
    expect(await locked(svc.assertNotLocked('owner@b.test', '2.2.2.2'))).toBeNull();
    for (let i = 0; i < 14; i += 1) await svc.recordFailure('owner@b.test', `7.7.7.${i}`);
    expect(await locked(svc.assertNotLocked('owner@b.test', '2.2.2.2'))).not.toBeNull();
  });

  it('the same identifier typed with other capitals or spaces counts once', async () => {
    const { svc } = build();
    for (let i = 0; i < 5; i += 1) await svc.recordFailure(i % 2 ? ' A@B.test ' : 'a@b.test', '1.1.1.1');
    expect(await locked(svc.assertNotLocked('A@b.TEST', '1.1.1.1'))).not.toBeNull();
  });

  it('a correct password clears the counters and the lock', async () => {
    const { svc } = build();
    for (let i = 0; i < 5; i += 1) await svc.recordFailure('a@b.test', '1.1.1.1');
    await svc.recordSuccess('a@b.test', '1.1.1.1');
    expect(await locked(svc.assertNotLocked('a@b.test', '1.1.1.1'))).toBeNull();
    expect(await svc.recordFailure('a@b.test', '1.1.1.1')).toBe(0);
  });

  it('keeps no address or phone in a Redis key', async () => {
    const { svc, redis } = build();
    await svc.recordFailure('someone@private.test', '203.0.113.9');
    const keys = await redis.keys('auth:login:*');
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) { expect(k).not.toContain('private.test'); expect(k).not.toContain('203.0.113.9'); }
  });
});
