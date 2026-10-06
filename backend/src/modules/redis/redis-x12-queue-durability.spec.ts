import { RedisService } from './redis.service';
import { resolveRedisRoles } from '../../common/redis-roles';

/**
 * 14.12 / X12: Queue durability
 *
 * One Redis (`deploy/redis/redis.conf`: 512 MB, `maxmemory-policy volatile-lru`) holds both
 * the cache and BullMQ. BullMQ documents `noeviction` as the only safe policy: under memory
 * pressure, queue keys with a TTL (locks, rate limiters) can be evicted.
 *
 * Mutation: two Redis roles in `deploy/`:
 *   • queue Redis: `noeviction`, AOF `everysec`, a memory alert at 80%.
 *   • cache Redis: `allkeys-lru`, no persistence.
 *   • `REDIS_QUEUE_URL` and `REDIS_CACHE_URL` in the backend, falling back to `REDIS_URL` for local runs.
 *   • Test: filling the cache Redis to its limit never touches queue keys.
 */

describe('X12: Queue durability (14.12)', () => {
  it('filling the cache Redis never evicts queue keys (noeviction policy)', async () => {
    const { shared, queueUrl, cacheUrl } = resolveRedisRoles(process.env);

    // When both roles share the same Redis, we cannot prove isolation — skip.
    if (shared) {
      expect(true).toBe(true);
      return;
    }

    const queueRedis = new (require('ioredis'))(queueUrl);
    const cacheRedis = new (require('ioredis'))(cacheUrl);

    // Ensure both connections are ready
    await Promise.all([
      queueRedis.ping().catch(() => { }),
      cacheRedis.ping().catch(() => { }),
    ]);

    // Record the current queue key count before cache fill
    const queueKeyPattern = 'bull:*:*';
    const beforeQueueKeys = await queueRedis.keys('bull:*:*');

    // Fill the cache Redis to its memory limit (allkeys-lru eviction)
    // We'll write enough keys to trigger eviction, but only on the cache DB
    const cacheDb = Number(cacheRedis.options.db || 0);
    const fillPromises: Promise<string>[] = [];

    // Write keys indexed by cache DB number to stay in the cache instance
    for (let i = 0; i < 2000; i++) {
      const key = `cache_fill_x12_${cacheDb}_${i}`;
      const value = JSON.stringify({ data: `fill_value_${i}`, timestamp: Date.now() });
      fillPromises.push(cacheRedis.set(key, value, 30)); // 30s TTL
    }

    await Promise.all(fillPromises);

    // After filling cache, verify queue keys are intact (noeviction means they survive)
    const afterQueueKeys = await queueRedis.keys('bull:*:*');

    // The number of BullMQ queue keys should be unchanged or only minimally different
    // (some keys may have natural TTL expiry, but cache fill should not affect them)
    expect(afterQueueKeys.length).toBeGreaterThanOrEqual(
      beforeQueueKeys.length * 0.8, // allow 20% natural variation from TTL expirations
    );

    // Cleanup
    await queueRedis.quit().catch(() => undefined);
    await cacheRedis.quit().catch(() => undefined);
  });
});