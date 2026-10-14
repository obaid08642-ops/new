import { RedisThrottlerStorage } from './throttler-redis.storage';

/**
 * D-28/S-6: the throttle store is shared through Redis, and Redis is a
 * throttle dependency — never an availability dependency. If Redis is down,
 * the guard must allow traffic, not 500 the API.
 */
describe('RedisThrottlerStorage', () => {
  it('fails open when Redis is unreachable (fallback client has no eval)', async () => {
    const svc = new RedisThrottlerStorage({ getClient: () => ({ status: 'fallback' }) } as any);
    await expect(svc.increment('k', 60_000, 1, 60_000, 'default')).resolves.toEqual({
      totalHits: 0,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('fails open when the Lua call itself throws', async () => {
    const svc = new RedisThrottlerStorage({
      getClient: () => ({
        status: 'ready',
        eval: async () => {
          throw new Error('redis down');
        },
      }),
    } as any);
    await expect(svc.increment('k', 60_000, 1, 60_000, 'default')).resolves.toEqual({
      totalHits: 0,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
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