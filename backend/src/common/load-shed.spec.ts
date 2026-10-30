import { classifyRequest, levelFor, limitsFromEnv, retryAfterSeconds, shouldShed, createLoadShed } from './load-shed';

describe('load shedding policy', () => {
  const limits = { lagMs: 200, inflight: 120 };

  it('levels follow the event-loop lag and the requests in flight', () => {
    expect(levelFor(0, 0, limits)).toBe(0);
    expect(levelFor(199, 119, limits)).toBe(0);
    expect(levelFor(200, 0, limits)).toBe(1);
    expect(levelFor(0, 120, limits)).toBe(1);
    expect(levelFor(400, 0, limits)).toBe(2);
    expect(levelFor(0, 240, limits)).toBe(2);
  });

  it('sheds anonymous reads at level 1 and signed-in reads at level 2; never the protected classes', () => {
    expect(shouldShed(0, 'anonymous_read')).toBe(false);
    expect(shouldShed(1, 'anonymous_read')).toBe(true);
    expect(shouldShed(1, 'user_read')).toBe(false);
    expect(shouldShed(2, 'user_read')).toBe(true);
    for (const level of [0, 1, 2] as const) expect(shouldShed(level, 'never')).toBe(false);
  });

  it.each([
    ['GET', '/api/v1/public/products/search?q=a', {}, 'anonymous_read'],
    ['GET', '/api/v1/care/doctors', { authorization: 'Bearer x' }, 'user_read'],
    ['GET', '/api/v1/care/doctors', { cookie: 'nabd_access=abc' }, 'user_read'],
    ['GET', '/api/v1/health/liveness', {}, 'never'],
    ['GET', '/health', {}, 'never'],
    ['GET', '/api/v1/auth/me', { authorization: 'Bearer x' }, 'never'],
    ['GET', '/api/v1/payments/abc', {}, 'never'],
    ['GET', '/api/v1/calls/1/token', {}, 'never'],
    ['GET', '/api/v1/admin/orders', {}, 'never'],
    ['GET', '/api/v1/provider/jobs', {}, 'never'],
    ['GET', '/socket.io/?EIO=4', {}, 'never'],
    ['POST', '/api/v1/cart/items', { authorization: 'Bearer x' }, 'never'],
    ['PATCH', '/api/v1/public/anything', {}, 'never'],
    ['DELETE', '/api/v1/chat/1', {}, 'never'],
  ])('%s %s %j is %s', (method, url, headers, want) => {
    expect(classifyRequest(method, url, headers as Record<string, unknown>)).toBe(want);
  });

  it('reads the limits from the environment and ignores nonsense', () => {
    expect(limitsFromEnv({ LOAD_SHED_LAG_MS: '150', LOAD_SHED_INFLIGHT: '60' } as never)).toEqual({ lagMs: 150, inflight: 60 });
    expect(limitsFromEnv({ LOAD_SHED_LAG_MS: 'x', LOAD_SHED_INFLIGHT: '-3' } as never)).toEqual({ lagMs: 200, inflight: 120 });
  });

  it('Retry-After is 3 to 7 seconds', () => {
    expect(retryAfterSeconds(0)).toBe(3);
    expect(retryAfterSeconds(0.999)).toBe(7);
  });
});

describe('load shedding middleware', () => {
  const res = () => {
    const h: Record<string, unknown> = {};
    const listeners: Record<string, () => void> = {};
    return { h, listeners, statusCode: 200, body: '', setHeader: (k: string, v: unknown) => { h[k] = v; }, end(b?: string) { this.body = b ?? ''; }, once: (ev: string, fn: () => void) => { listeners[ev] = fn; } };
  };

  it('answers 503 + Retry-After to an anonymous read once enough requests are in flight, and lets everything else through', () => {
    const shed = createLoadShed({ LOAD_SHED_INFLIGHT: '2' } as never);
    try {
      const open: Array<ReturnType<typeof res>> = [];
      const pass = (method: string, url: string, headers: Record<string, unknown> = {}) => {
        const r = res(); let called = false;
        shed.middleware({ method, url, headers }, r as never, () => { called = true; });
        return { r, called };
      };
      for (let i = 0; i < 2; i++) { const p = pass('GET', '/api/v1/search?q=a'); expect(p.called).toBe(true); open.push(p.r); }
      expect(shed.state.inflight).toBe(2);
      const blocked = pass('GET', '/api/v1/search?q=a');
      expect(blocked.called).toBe(false);
      expect(blocked.r.statusCode).toBe(503);
      expect(blocked.r.h['Cache-Control']).toBe('no-store');
      expect(Number(blocked.r.h['Retry-After'])).toBeGreaterThanOrEqual(3);
      expect(JSON.parse(blocked.r.body)).toMatchObject({ statusCode: 503, code: 'server_busy' });
      expect(shed.state.shed).toBe(1);
      // protected requests and writes still pass at this level
      const done = (p: { r: ReturnType<typeof res>; called: boolean }) => { expect(p.called).toBe(true); p.r.listeners.finish?.(); };
      done(pass('GET', '/api/v1/health/liveness'));
      done(pass('POST', '/api/v1/cart/items', { authorization: 'Bearer x' }));
      done(pass('GET', '/api/v1/care/appointments', { authorization: 'Bearer x' }));   // signed-in reads wait for level 2 (twice the limit)
      expect(shed.state.inflight).toBe(2);
      // a finished request frees its place
      open.forEach((r) => r.listeners.finish?.());
      expect(shed.state.inflight).toBe(0);
      expect(pass('GET', '/api/v1/search?q=a').called).toBe(true);
    } finally { shed.stop(); }
  });

  it('a stream is not counted as load', () => {
    const shed = createLoadShed({ LOAD_SHED_INFLIGHT: '1' } as never);
    try {
      for (let i = 0; i < 5; i++) shed.middleware({ method: 'GET', url: '/api/v1/medicines/stream', headers: {} }, res() as never, () => undefined);
      expect(shed.state.inflight).toBe(0);
    } finally { shed.stop(); }
  });
});
