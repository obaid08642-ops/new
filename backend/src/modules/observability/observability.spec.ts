/**
 * Phase 20 — observability.
 *
 * 20.2 Verify: RPS, latency percentiles and errors per route, event-loop delay
 * and heap, in an exposition a scraper can read.
 * 20.3 Verify: a search by request id works, and PII is masked.
 */
import { Logger } from '@nestjs/common';
import { MetricsService, normaliseRoute } from '../../common/metrics.service';
import { maskPii, logEvent, runWithLogContext, currentLogContext } from '../../common/structured-logger';

describe('Phase 20.2 metrics', () => {
  let m: MetricsService;
  beforeEach(() => { m = new MetricsService(); });

  it('counts requests, errors and latency per route', () => {
    m.record('/orders/1', 200, 10);
    m.record('/orders/2', 200, 20);
    m.record('/orders/3', 500, 30);
    const s = m.summary();
    expect(s.requests).toBe(3);
    expect(s.errors).toBe(1);
    expect(s.error_ratio).toBeCloseTo(0.3333, 3);
    expect(s.routes).toHaveLength(1);
    expect(s.routes[0].route).toBe('/orders/:id');
  });

  it('reports p50/p95/p99 from the histogram', () => {
    for (let i = 0; i < 100; i += 1) m.record('/x', 200, 10);
    for (let i = 0; i < 5; i += 1) m.record('/x', 200, 900);
    const r = m.summary().routes[0];
    expect(r.p50_ms).toBeLessThanOrEqual(100);
    expect(r.p95_ms).toBeGreaterThanOrEqual(r.p50_ms);
    expect(r.p99_ms).toBeGreaterThanOrEqual(r.p95_ms);
    // Nothing is invented: a percentile never claims more precision than the
    // buckets hold.
    expect([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]).toContain(r.p99_ms);
  });

  it('produces a Prometheus exposition a scraper can parse', () => {
    m.record('/orders', 200, 12);
    const text = m.scrape();
    expect(text).toContain('# TYPE nabd_http_requests_total counter');
    expect(text).toContain('nabd_uptime_seconds');
    expect(text).toContain('nabd_event_loop_lag_ms');
    expect(text).toContain('nabd_heap_used_bytes');
    expect(text).toContain('nabd_http_requests_total{route="/orders"} 1');
    expect(text).toContain('nabd_http_p95_ms{route="/orders"}');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('exposes event-loop delay and heap', () => {
    const s = m.summary();
    expect(typeof s.event_loop_lag_ms).toBe('number');
    expect(s.heap_used_bytes).toBeGreaterThan(0);
  });

  it('collapses ids so one path is one series, not thousands', () => {
    expect(normaliseRoute('/orders/123')).toBe('/orders/:id');
    expect(normaliseRoute('/orders/123/')).toBe('/orders/:id');
    expect(normaliseRoute('/users/9f2c1a44-0b1e-4c2a-9f77-2c0d9e1b4a55')).toBe('/users/:id');
    expect(normaliseRoute('/medicines?page=2')).toBe('/medicines');
    expect(normaliseRoute('')).toBe('unknown');
  });

  it('a route label cannot break out of its quotes', () => {
    m.record('/evil" route', 200, 1);
    const text = m.scrape();
    expect(text).toContain('route="/evil\\" route"');
    expect(text).not.toContain('route="/evil" route"');
  });

  it('every exposition line is well-formed Prometheus text', () => {
    // The regression this guards: a malformed label set is silently accepted by
    // a test that only spot-checks one line, then rejected by the real scraper.
    m.record('/orders/1', 200, 12);
    m.record('/orders/2', 500, 900);
    const lines = m.scrape().split('\n').filter((l) => l && !l.startsWith('#'));
    expect(lines.length).toBeGreaterThan(10);
    for (const line of lines) {
      const m2 = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})? (-?\d+(\.\d+)?)$/.exec(line);
      expect(m2).not.toBeNull();
      // Labels must be closed and quoted.
      if (m2?.[2]) expect(m2[2].endsWith('}')).toBe(true);
      expect(line).not.toContain('""');
    }
    const text = m.scrape();
    expect(text).toContain('nabd_http_duration_ms_bucket{route="/orders/:id",le="5"} 0');
    expect(text).toContain('nabd_http_duration_ms_bucket{route="/orders/:id",le="+Inf"} 2');
  });

  it('every declared metric has a HELP and a TYPE', () => {
    m.record('/orders', 200, 5);
    const text = m.scrape();
    const declared = [...text.matchAll(/^# TYPE (\S+)/gm)].map((x) => x[1]);
    expect(declared.length).toBeGreaterThan(8);
    for (const name of declared) {
      expect(text).toContain(`# HELP ${name} `);
    }
  });

  it('reset clears the counters', () => {
    m.record('/x', 500, 1);
    m.reset();
    expect(m.summary().requests).toBe(0);
  });
});

describe('Phase 20.3 structured logs and PII masking', () => {
  const lines: string[] = [];
  const fakeLogger = {
    log: (l: string) => lines.push(l),
    error: (l: string) => lines.push(l),
    warn: (l: string) => lines.push(l),
    debug: (l: string) => lines.push(l),
  } as unknown as Logger;

  beforeEach(() => { lines.length = 0; });

  it('masks a phone, an email and a national id by key', () => {
    const out = maskPii({ phone: '+966501234567', email: 'a@b.com', national_id: '1012345678', order: 'o1' }) as any;
    expect(out.phone).toBe('[redacted]');
    expect(out.email).toBe('[redacted]');
    expect(out.national_id).toBe('[redacted]');
    expect(out.order).toBe('o1');
  });

  it('masks medical fields, because 16.6 includes them', () => {
    const out = maskPii({ diagnosis: 'asthma', prescription: 'x', token: 'y', count: 3 }) as any;
    expect(out.diagnosis).toBe('[redacted]');
    expect(out.prescription).toBe('[redacted]');
    expect(out.token).toBe('[redacted]');
    expect(out.count).toBe(3);
  });

  it('masks a phone or email hiding under an innocuous key', () => {
    const out = maskPii({ note: 'call +966501234567', contact: 'a@b.com', label: 'fine' }) as any;
    expect(out.note).toBe('[redacted]');
    expect(out.contact).toBe('[redacted]');
    expect(out.label).toBe('fine');
  });

  it('walks nested objects and arrays', () => {
    const out = maskPii({ items: [{ phone: '1' }, { sku: 'a' }] }) as any;
    expect(out.items[0].phone).toBe('[redacted]');
    expect(out.items[1].sku).toBe('a');
  });

  it('carries the request id on every line, so a search by it works', () => {
    runWithLogContext({ requestId: 'req-123', userId: 'u-9' }, () => {
      logEvent('info', 'checkout_started', { cart_id: 'c1' }, fakeLogger);
      logEvent('warn', 'slow_call', { ms: 900 }, fakeLogger);
    });
    expect(lines).toHaveLength(2);
    const parsed = lines.map((l) => JSON.parse(l));
    for (const p of parsed) {
      expect(p.request_id).toBe('req-123');
      expect(p.user_id).toBe('u-9');
    }
    // The whole point of 20.3: one indexed field, not free text.
    expect(parsed.filter((p) => p.request_id === 'req-123')).toHaveLength(2);
  });

  it('logs one JSON object per line, with no PII in the output', () => {
    runWithLogContext({ requestId: 'req-2' }, () => {
      logEvent('error', 'payment_failed', { phone: '+966501234567', amount: 20 }, fakeLogger);
    });
    expect(lines[0]).not.toContain('+966501234567');
    const p = JSON.parse(lines[0]);
    expect(p.event).toBe('payment_failed');
    expect(p.level).toBe('error');
    expect(p.details.amount).toBe(20);
    expect(p.details.phone).toBe('[redacted]');
  });

  it('a line with no request id says so rather than inventing one', () => {
    logEvent('info', 'boot', {}, fakeLogger);
    expect(JSON.parse(lines[0]).request_id).toBeNull();
  });

  it('the context does not leak between requests', () => {
    runWithLogContext({ requestId: 'req-a' }, () => {
      expect(currentLogContext().requestId).toBe('req-a');
    });
    expect(currentLogContext().requestId).toBeUndefined();
  });
});