import { DynamicRankingR9Service } from './product-ranking-r9.service';
import { RedisService } from '../redis/redis.service';

/**
 * 13.R9 focused spec (mocked, in-memory Redis fallback — no servers, no Mongo).
 * Proves: (1) B overtakes A on live purchase events, (2) per-actor velocity abuse is capped.
 */
describe('DynamicRankingR9Service (13.R9)', () => {
  let redis: RedisService;
  let svc: DynamicRankingR9Service;

  beforeEach(() => {
    redis = new RedisService(); // ready=false -> per-process in-memory fallback
    svc = new DynamicRankingR9Service(redis);
  });

  it('B overtakes A after live purchase events (smart mode)', async () => {
    for (let i = 0; i < 10; i += 1) {
      await svc.recordEvent({ event: 'view', productId: 'prod-A', actor: `viewer-a-${i}` });
    }
    for (let i = 0; i < 2; i += 1) {
      await svc.recordEvent({ event: 'view', productId: 'prod-B', actor: `viewer-b-${i}` });
    }

    let ranked = await svc.getRankedIds({ mode: 'smart' });
    expect(ranked.ids[0]).toBe('prod-A');

    await svc.recordEvent({ event: 'purchase', productId: 'prod-B', quantity: 2, actor: 'buyer-1' });

    ranked = await svc.getRankedIds({ mode: 'smart' });
    expect(ranked.ids[0]).toBe('prod-B');
    expect(ranked.ids).toContain('prod-A');
  });

  it('caps per-actor view velocity abuse (30/hour)', async () => {
    let counted = 0;
    let capped = 0;
    for (let i = 0; i < 40; i += 1) {
      // distinct product per attempt avoids the 10-min view dedupe; velocity cap is per-actor.
      const r = await svc.recordEvent({ event: 'view', productId: `spam-${i}`, actor: 'spammer-1' });
      if (r.counted) counted += 1;
      if (r.capped) capped += 1;
    }
    expect(counted).toBe(30);
    expect(capped).toBe(10);
  });
});
