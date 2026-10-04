import { ServiceUnavailableException } from '@nestjs/common';
import { classifyRequest, shouldShed } from './shed-classifier';
import { LoadSheddingGuard } from './load-shedding.guard';

/**
 * 14.17 — load-shedding spec. All metrics are mocked (no server, no timers).
 * Verifies: shedable routes 503 under load, everything critical passes.
 */
describe('14.17 LoadSheddingGuard (mocked metrics)', () => {
  const OVERLOADED = { eventLoopDelayMs: 500, heapUsedBytes: 10, heapTotalBytes: 100 };
  const HEALTHY = { eventLoopDelayMs: 5, heapUsedBytes: 10, heapTotalBytes: 100 };
  const THRESHOLDS = { maxEventLoopDelayMs: 100, maxHeapUsedRatio: 0.85 };

  const ctxFor = (path: string) => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      header: (k: string, v: string) => {
        headers[k] = v;
      },
      headers,
    };
    return {
      res,
      ctx: {
        switchToHttp: () => ({ getRequest: () => ({ path, url: path }), getResponse: () => res }),
      } as any,
    };
  };

  const guardUnderLoad = () =>
    new LoadSheddingGuard({
      thresholds: THRESHOLDS,
      retryAfterSeconds: 5,
      getSnapshot: () => ({ ...OVERLOADED }),
    });

  it('classifies low-priority routes as shedable', () => {
    expect(classifyRequest('/api/v1/recommendations/for-you')).toBe('shedable');
    expect(classifyRequest('/api/v1/analytics/events')).toBe('shedable');
    expect(classifyRequest('/api/v1/engagement/nudges')).toBe('shedable');
    expect(classifyRequest('/api/v1/admin/reports/daily')).toBe('shedable');
  });

  it('classifies critical routes as never-shed', () => {
    for (const p of [
      '/api/v1/auth/login',
      '/api/v1/checkout',
      '/api/v1/payments/webhook/moyasar',
      '/api/v1/sos',
      '/api/v1/ambulance/dispatch',
      '/api/v1/emergency/alert',
      '/api/v1/calls/ice',
      '/api/v1/provider/orders/ord_1/accept',
    ]) {
      expect(classifyRequest(p)).toBe('never-shed');
    }
  });

  it('never-shed wins even if listed as shedable (overlap)', () => {
    expect(classifyRequest('/api/v1/auth/login', ['/api/v1/auth'])).toBe('never-shed');
    expect(
      shouldShed('/api/v1/auth/login', OVERLOADED, THRESHOLDS, ['/api/v1/auth']),
    ).toBe(false);
  });

  it('503 + Retry-After for shedable routes under load', () => {
    const { ctx, res } = ctxFor('/api/v1/recommendations/for-you');
    expect(() => guardUnderLoad().canActivate(ctx)).toThrow(ServiceUnavailableException);
    expect(res.headers['Retry-After']).toBe('5');
  });

  it('passes shedable routes when healthy', () => {
    const { ctx } = ctxFor('/api/v1/recommendations/for-you');
    const g = new LoadSheddingGuard({
      thresholds: THRESHOLDS,
      getSnapshot: () => ({ ...HEALTHY }),
    });
    expect(g.canActivate(ctx)).toBe(true);
  });

  it('NEVER sheds critical routes under load', () => {
    const g = guardUnderLoad();
    for (const p of [
      '/api/v1/auth/refresh',
      '/api/v1/checkout',
      '/api/v1/webhooks/payments',
      '/api/v1/sos',
      '/api/v1/ambulance/fleet/nearby',
      '/api/v1/calls/abc123',
      '/api/v1/provider/orders/ord_1/accept',
      '/api/v1/orders/ord_9', // normal route: also passes under load
    ]) {
      expect(g.canActivate(ctxFor(p).ctx)).toBe(true);
    }
  });

  it('fails open when the metrics source throws', () => {
    const { ctx } = ctxFor('/api/v1/recommendations/for-you');
    const g = new LoadSheddingGuard({
      thresholds: THRESHOLDS,
      getSnapshot: () => {
        throw new Error('metrics down');
      },
    });
    expect(g.canActivate(ctx)).toBe(true);
  });
});
