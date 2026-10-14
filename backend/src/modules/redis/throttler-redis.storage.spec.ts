import { RedisThrottlerStorage } from './throttler-redis.storage';

/**
 * D-28/S-6: the throttle store is shared through Redis, and Redis is a
 * throttle dependency, never an availability dependency. If Redis is down the
 * API keeps answering, and each instance still enforces the limit with its own
 * in-memory counter (the sign-in and OTP limits never switch off).
 */
describe('RedisThrottlerStorage', () => {
  const hitUntilBlocked = async (svc: RedisThrottlerStorage) => {
    const first = await svc.increment('k', 60_000, 2, 60_000, 'default');
    await svc.increment('k', 60_000, 2, 60_000, 'default');
    const third = await svc.increment('k', 60_000, 2, 60_000, 'default');
    svc.onApplicationShutdown();
    return { first, third };
  };

  it('falls back to the in-memory counter when Redis is unreachable (fallback client has no eval)', async () => {
    const svc = new RedisThrottlerStorage({ getClient: () => ({ status: 'fallback' }) } as any);
    const { first, third } = await hitUntilBlocked(svc);
    expect(first).toMatchObject({ totalHits: 1, isBlocked: false });
    expect(third).toMatchObject({ totalHits: 3, isBlocked: true });
  });

  it('falls back to the in-memory counter when the Lua call itself throws', async () => {
    const svc = new RedisThrottlerStorage({
      getClient: () => ({
        status: 'ready',
        eval: async () => {
          throw new Error('redis down');
        },
      }),
    } as any);
    const { first, third } = await hitUntilBlocked(svc);
    expect(first).toMatchObject({ totalHits: 1, isBlocked: false });
    expect(third).toMatchObject({ totalHits: 3, isBlocked: true });
  });

  it('maps one shared Redis verdict onto the guard record both instances read', async () => {
    const evalMock = jest.fn(async () => [11, 59_000, 1, 59_000]);
    const svc = new RedisThrottlerStorage({
      getClient: () => ({ status: 'ready', eval: evalMock }),
    } as any);
    const rec = await svc.increment('abc', 60_000, 10, 60_000, 'default');
    expect(rec).toEqual({ totalHits: 11, timeToExpire: 59, isBlocked: true, timeToBlockExpire: 59 });
    // One atomic call, two keys: the counter and its block marker.
    const call = evalMock.mock.calls[0] as any[];
    expect(call[1]).toBe(2);
    expect(String(call[2])).toContain('throttle:default:abc');
  });
});
