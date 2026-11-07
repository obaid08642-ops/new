/** R16: overload level with hysteresis, admission control by route class (also under real concurrency over HTTP), per-class read budgets, priority-aware global limit, auto-degrade. */
import express from 'express';
import request from 'supertest';
import { of, NEVER, delay as rxDelay } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { OVERLOAD, OverloadGovernor, autoDegraded, resetOverloadForTests } from './overload';
import { ADMISSION, AdmissionMiddleware, admissionStats, admit } from './admission';
import { READ_BUDGET_MS, RouteTimeoutInterceptor } from './route-timeout.interceptor';
import { AdaptiveConcurrencyInterceptor } from './adaptive-concurrency.interceptor';
import { shouldDegrade } from './killswitches/killswitches.helper';

const sig = (loop = 0, heap = 0) => ({ loop, heap, eventLoopDelayMs() { return this.loop; }, heapUsedRatio() { return this.heap; } });

describe('OverloadGovernor', () => {
  it('levels by event-loop lag, heap and low-priority fill; escalates at once; leaves a level only after the calm period', () => {
    let t = 1_000_000; const s = sig(); let fill = 0;
    const g = new OverloadGovernor(s as any, () => t, () => fill);
    expect(g.level()).toBe(0);
    t += 600; s.loop = 160; expect(g.level()).toBe(1);
    t += 600; s.loop = 300; expect(g.level()).toBe(2);
    t += 600; s.loop = 10; expect(g.level()).toBe(2);                       // calm for 0.6 s: stays
    t += OVERLOAD.calmMs - 1_000; expect(g.level()).toBe(2);                // not yet 30 s
    t += 1_500; expect(g.level()).toBe(0);                                  // 30 s of calm: back to healthy
    t += 600; s.heap = 0.81; expect(g.level()).toBe(1);
    t += 600; s.heap = 0.9; expect(g.level()).toBe(2);
    t += OVERLOAD.calmMs + 1; s.heap = 0.1; fill = 0.95; expect(g.level()).toBe(1);   // the low-priority budget nearly full is "strained"
  });
  it('is evaluated at most every 500 ms (hot path)', () => {
    let t = 5_000_000; let calls = 0; const s = { eventLoopDelayMs: () => { calls++; return 0; }, heapUsedRatio: () => 0 };
    const g = new OverloadGovernor(s as any, () => t);
    for (let i = 0; i < 100; i++) g.level();
    expect(calls).toBe(1);
    t += 600; g.level(); expect(calls).toBe(2);
  });
});

describe('auto-degrade', () => {
  it('level 1 switches off recommendations, nudges, analytics and suggestions; level 2 adds the live map and AI; payment/booking features are never on the list', async () => {
    for (const f of ['recommendations', 'nudges', 'analyticsIngestion', 'searchSuggestions']) { expect(autoDegraded(f, 0)).toBe(false); expect(autoDegraded(f, 1)).toBe(true); }
    expect(autoDegraded('liveMap', 1)).toBe(false); expect(autoDegraded('liveMap', 2)).toBe(true); expect(autoDegraded('ai', 2)).toBe(true);
    for (const f of ['payments', 'checkout', 'booking', 'auth', 'calls']) expect(autoDegraded(f, 2)).toBe(false);
  });
  it('shouldDegrade = overload OR the admin kill switch', async () => {
    const flags = (v: boolean | null) => ({ isEnabled: async () => v }) as any;
    resetOverloadForTests(new OverloadGovernor(sig(0, 0) as any, Date.now));
    expect(await shouldDegrade('recommendations', flags(true))).toBe(false);
    expect(await shouldDegrade('recommendations', flags(false))).toBe(true);             // killed by the admin
    resetOverloadForTests(new OverloadGovernor(sig(200, 0) as any, Date.now));            // strained
    expect(await shouldDegrade('recommendations', flags(true))).toBe(true);              // degraded by the load although the flag says on
    expect(await shouldDegrade('liveMap', flags(true))).toBe(false);
    resetOverloadForTests(undefined);
  });
});

describe('admit()', () => {
  beforeEach(() => { admissionStats.lowInflight = 0; admissionStats.byClass = {}; });
  it('critical classes are never refused, whatever the load', () => {
    admissionStats.lowInflight = 10_000;
    for (const url of ['/api/v1/payments/1/verify', '/api/v1/auth/login', '/api/v1/care/appointments', '/api/v1/livekit/token']) {
      expect(admit(url.includes('payments') ? 'payment' : url.includes('auth') ? 'auth' : url.includes('livekit') ? 'realtime' : 'booking', 'GET', url, 2)).toBe('ok');
    }
  });
  it('low reads are refused at the shared cap and at their own cap; low writes and the always-open paths are not', () => {
    admissionStats.lowInflight = ADMISSION.totalLow;
    expect(admit('search', 'GET', '/api/v1/search?q=a', 0)).toBe('cap');
    expect(admit('search', 'POST', '/api/v1/search/log', 0)).toBe('ok');
    expect(admit('other', 'GET', '/api/v1/config', 0)).toBe('ok');
    expect(admit('public_read', 'GET', '/api/v1/health/liveness', 0)).toBe('ok');
    admissionStats.lowInflight = 1; admissionStats.byClass.admin = ADMISSION.perClass.admin;
    expect(admit('admin', 'GET', '/api/v1/admin/reports/revenue', 0)).toBe('cap');
    expect(admit('search', 'GET', '/api/v1/search', 0)).toBe('ok');                      // another class still has room
  });
  it('the overload level sheds whole classes of reads', () => {
    expect(admit('admin', 'GET', '/api/v1/admin/x', 1)).toBe('level');
    expect(admit('search', 'GET', '/api/v1/search', 1)).toBe('ok');
    for (const c of ['search', 'public_read', 'user_read', 'other', 'admin'] as const) expect(admit(c, 'GET', '/api/v1/x', 2)).toBe('level');
    expect(admit('user_read', 'GET', '/api/v1/auth/me', 2)).toBe('ok');
  });
});

describe('under real concurrency over HTTP', () => {
  it('250 searches at once against a slow handler cannot slow or refuse 40 payments: payments all succeed fast, searches are capped at the budget and the rest get 503 + Retry-After', async () => {
    admissionStats.lowInflight = 0; admissionStats.byClass = {};
    resetOverloadForTests(new OverloadGovernor(sig(0, 0) as any, Date.now));
    const app = express();
    const mw = new AdmissionMiddleware();
    app.use((req, res, next) => mw.use(req, res, next));
    let inside = 0; let maxInside = 0;
    app.get('/api/v1/search', async (_req, res) => { inside++; maxInside = Math.max(maxInside, inside); await new Promise((r) => setTimeout(r, 300)); inside--; res.json({ ok: true }); });
    app.post('/api/v1/payments/pay', async (_req, res) => { await new Promise((r) => setTimeout(r, 20)); res.json({ paid: true }); });
    const server = app.listen(0); const base = request(server);
    try {
      const searches = Array.from({ length: 250 }, () => base.get('/api/v1/search').then((r) => r));
      await new Promise((r) => setTimeout(r, 50));                                      // the searches are in flight
      const payments = await Promise.all(Array.from({ length: 40 }, async () => { const t0 = Date.now(); const r = await base.post('/api/v1/payments/pay'); return { status: r.status, ms: Date.now() - t0 }; }));
      const results = await Promise.all(searches);
      expect(payments.every((p) => p.status === 200)).toBe(true);
      const ms = payments.map((p) => p.ms).sort((a, b) => a - b);
      // The client and server share one event loop here (290 sockets), so absolute latency is inflated (~250 ms even for a plain express app with no admission);
      // this bound only proves payments are not stuck behind the search backlog. The guarantees are the status, the cap and the release checked below.
      expect(ms[Math.floor(ms.length * 0.95)]).toBeLessThan(1000);
      const ok = results.filter((r) => r.status === 200).length; const busy = results.filter((r) => r.status === 503);
      expect(maxInside).toBeLessThanOrEqual(ADMISSION.totalLow);
      expect(ok).toBeGreaterThan(0); expect(busy.length).toBeGreaterThan(100);
      expect(busy[0].headers['retry-after']).toBe(String(ADMISSION.retryAfterSeconds));
      expect(busy[0].body.error).toBe('server_busy');
      expect(admissionStats.lowInflight).toBe(0);                                       // everything released
    } finally { server.close(); resetOverloadForTests(undefined); }
  });
});

describe('RouteTimeoutInterceptor', () => {
  const ctx = (method: string, url: string, sse = false) => {
    const handler = function h() {}; if (sse) Reflect.defineMetadata('__sse__', '/x', handler);
    return { getType: () => 'http', getHandler: () => handler, switchToHttp: () => ({ getRequest: () => ({ method, originalUrl: url }), getResponse: () => ({ setHeader() {} }) }) } as any;
  };
  const run = (c: any, source: any) => firstValueFrom(new RouteTimeoutInterceptor().intercept(c, { handle: () => source }) as any);
  const saved = { ...READ_BUDGET_MS };
  afterEach(() => Object.assign(READ_BUDGET_MS, saved));
  it('a slow GET past its class budget is answered 504 request_timeout; a fast one passes', async () => {
    READ_BUDGET_MS.search = 40;
    await expect(run(ctx('GET', '/api/v1/search?q=x'), of('late').pipe(rxDelay(200)))).rejects.toMatchObject({ status: 504 });
    await expect(run(ctx('GET', '/api/v1/search?q=x'), of('fast').pipe(rxDelay(5)))).resolves.toBe('fast');
  });
  it('writes, streams, SSE and realtime are never timed out', async () => {
    READ_BUDGET_MS.search = 20; READ_BUDGET_MS.payment = 20; READ_BUDGET_MS.other = 20;
    await expect(run(ctx('POST', '/api/v1/payments/pay'), of('done').pipe(rxDelay(100)))).resolves.toBe('done');
    await expect(run(ctx('GET', '/api/v1/notifications/stream'), of('s').pipe(rxDelay(100)))).resolves.toBe('s');
    await expect(run(ctx('GET', '/api/v1/other/x', true), of('sse').pipe(rxDelay(100)))).resolves.toBe('sse');
    await expect(run(ctx('GET', '/api/v1/livekit/rooms'), of('rt').pipe(rxDelay(100)))).resolves.toBe('rt');
    await expect(run(ctx('GET', '/api/v1/admin/reports/export'), of('x').pipe(rxDelay(100)))).resolves.toBe('x');
  });
});

describe('AdaptiveConcurrencyInterceptor is priority-aware', () => {
  const ctx = (url: string) => ({ switchToHttp: () => ({ getRequest: () => ({ url, originalUrl: url }) }) }) as any;
  const next = { handle: () => NEVER } as any;
  it('at the limit a search is refused with 503 but a payment, sign-in or booking is still admitted (up to twice the limit)', () => {
    const i: any = new AdaptiveConcurrencyInterceptor(); i.limit = 50; i.active = 50;
    expect(() => i.intercept(ctx('/api/v1/search'), next)).toThrow(/at capacity/);
    for (const u of ['/api/v1/payments/pay', '/api/v1/auth/login', '/api/v1/care/appointments']) expect(() => i.intercept(ctx(u), next)).not.toThrow();
    i.active = 100;
    expect(() => i.intercept(ctx('/api/v1/payments/pay'), next)).toThrow(/at capacity/);
  });
});
