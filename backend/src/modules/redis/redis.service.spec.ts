import { RedisService } from './redis.service';

describe('RedisService fallback client', () => {
  it('implements expire for cache and rate-limit callers while Redis is unavailable', async () => {
    const service: any = Object.create(RedisService.prototype);
    service.ready = false;
    service.memKv = new Map();
    service.memHash = new Map();
    service.memSets = new Map();
    service.memZset = new Map();

    const client = service.getClient();
    await client.set('rate-limit:patient-1', '1');
    await expect(client.expire('rate-limit:patient-1', 60)).resolves.toBeUndefined();
    await expect(client.ttl('rate-limit:patient-1')).resolves.toBeGreaterThan(0);
  });
});
