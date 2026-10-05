// b20ecd3 / X12: REDIS_QUEUE_URL and REDIS_CACHE_URL were read by nothing:
// RedisService (cache) and BullMQ (queues) both dialled REDIS_URL. Each role
// now dials its own URL and falls back to REDIS_URL (then REDIS_HOST/PORT).
const constructed: string[] = [];
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation((url: string) => {
    constructed.push(url);
    return { on: jest.fn(), quit: jest.fn().mockResolvedValue('OK') };
  });
});

import { RedisService } from '../modules/redis/redis.service';
import { bullConnectionFromEnv, resolveRedisRoles } from './redis-roles';

describe('Redis roles are wired (b20ecd3 / X12)', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    constructed.length = 0;
  });

  it('RedisService dials REDIS_CACHE_URL when it is set', async () => {
    process.env.REDIS_URL = 'redis://base:6379';
    process.env.REDIS_CACHE_URL = 'redis://cache:6390';
    const svc = new RedisService();
    svc.onModuleInit();
    expect(constructed).toEqual(['redis://cache:6390', 'redis://cache:6390', 'redis://cache:6390']);
    await svc.onModuleDestroy();
  });

  it('RedisService falls back to REDIS_URL', async () => {
    process.env.REDIS_URL = 'redis://base:6379';
    delete process.env.REDIS_CACHE_URL;
    const svc = new RedisService();
    svc.onModuleInit();
    expect(new Set(constructed)).toEqual(new Set(['redis://base:6379']));
    await svc.onModuleDestroy();
  });

  it('BullMQ connects to REDIS_QUEUE_URL, else REDIS_URL, else REDIS_HOST/PORT', () => {
    expect(bullConnectionFromEnv({ REDIS_URL: 'redis://base:6379', REDIS_QUEUE_URL: 'rediss://:p%40ss@queue:6380' }))
      .toEqual({ host: 'queue', port: 6380, password: 'p@ss', tls: {} });
    expect(bullConnectionFromEnv({ REDIS_URL: 'redis://base:6379' })).toEqual({ host: 'base', port: 6379, password: undefined });
    expect(bullConnectionFromEnv({ REDIS_HOST: 'h', REDIS_PORT: '7000', REDIS_PASSWORD: 'pw' })).toEqual({ host: 'h', port: 7000, password: 'pw' });
  });

  it('a cache-only override never moves the queue', () => {
    const roles = resolveRedisRoles({ REDIS_URL: 'redis://base:6379', REDIS_CACHE_URL: 'redis://cache:6390' });
    expect(roles.queueUrl).toBe('redis://base:6379');
    expect(roles.cacheUrl).toBe('redis://cache:6390');
  });
});
