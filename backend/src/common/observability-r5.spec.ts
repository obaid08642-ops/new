/**
 * R5: route classes, the per-class metrics, a drift guard between what ops/ (Prometheus rules, Grafana dashboards) query and what /observability/metrics emits,
 * and the trace helpers.
 */
import * as fs from 'fs';
import * as path from 'path';
import { MetricsService } from './metrics.service';
import { ROUTE_CLASSES, routeClass } from './route-classes';
import { cronLeaseStats } from './scheduled-once';
import { currentTraceId, traced } from './trace';
import { buildLogRecord } from './structured-logger';
import './overload';   // registers nabd_overload_level
import './admission';  // registers nabd_admission_*

const OPS = path.resolve(__dirname, '..', '..', '..', 'ops');

/** The alert rules of a Prometheus rule file without a YAML dependency: `- alert: Name` and its `expr:` (inline or a `|` block). */
function rules(file: string): Array<{ alert: string; expr: string }> {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out: Array<{ alert: string; expr: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const a = /^\s*- alert:\s*(\S+)/.exec(lines[i]);
    if (!a) continue;
    let expr = '';
    for (let j = i + 1; j < lines.length && !/^\s*- alert:/.test(lines[j]); j++) {
      const e = /^(\s*)expr:\s*(.*)$/.exec(lines[j]);
      if (!e) continue;
      if (e[2].trim() === '|') { for (let k = j + 1; k < lines.length && (lines[k].startsWith(e[1] + ' ') || !lines[k].trim()); k++) expr += lines[k] + ' '; }
      else expr = e[2];
      break;
    }
    out.push({ alert: a[1], expr });
  }
  return out;
}

describe('route classes', () => {
  it.each([
    ['/api/v1/payments/:id/verify', 'payment'], ['/api/v1/finance/refunds/:id/execute', 'payment'], ['/api/v1/auth/otp/request', 'auth'],
    ['/api/v1/care/appointments', 'booking'], ['/api/v1/orders/:id', 'booking'], ['/api/v1/search', 'search'], ['/api/v1/medicines/:id', 'search'],
    ['/api/v1/health/liveness', 'public_read'], ['/api/v1/notifications', 'user_read'], ['/api/v1/livekit/token', 'realtime'],
    ['/api/v1/admin/reports/revenue', 'admin'], ['/api/v1/something-new', 'other'], ['/', 'other'], ['', 'other'],
  ])('%s is %s', (route, cls) => expect(routeClass(route)).toBe(cls));

  it('no segment is claimed by two classes, and every class has a target', () => {
    const seen = new Map<string, string>();
    for (const [cls, def] of Object.entries(ROUTE_CLASSES)) {
      expect(def.p95_ms).toBeGreaterThan(0);
      expect(def.availability).toBeGreaterThan(0.9);
      for (const s of def.segments) { expect(seen.get(s)).toBeUndefined(); seen.set(s, cls); }
    }
  });
});

describe('per-class metrics in the scrape', () => {
  it('aggregates the routes of a class and keeps errors and latency apart per class', () => {
    const m = new MetricsService();
    m.record('/api/v1/payments/1', 200, 120); m.record('/api/v1/payments/1/verify', 500, 900); m.record('/api/v1/moyasar/webhook', 200, 40);
    m.record('/api/v1/search', 200, 300);
    const out = m.scrape();
    expect(out).toContain('nabd_http_class_requests_total{class="payment"} 3');
    expect(out).toContain('nabd_http_class_errors_total{class="payment"} 1');
    expect(out).toContain('nabd_http_class_requests_total{class="search"} 1');
    expect(out).toContain('nabd_http_class_errors_total{class="search"} 0');
    expect(out).toMatch(/nabd_http_class_duration_ms_bucket\{class="payment",le="\+Inf"\} 3/);
    expect(out).toMatch(/nabd_http_class_p95_ms\{class="payment"\} \d+/);
    // exposition stays valid: one TYPE per metric name
    const types = out.split('\n').filter((l) => l.startsWith('# TYPE ')).map((l) => l.split(' ')[2]);
    expect(new Set(types).size).toBe(types.length);
  });

  it('the cron lease counters are exposed as counters', () => {
    cronLeaseStats.lost += 0;
    const out = new MetricsService().scrape();
    expect(out).toContain('# TYPE nabd_cron_lease_lost_total counter');
    expect(out).toMatch(/nabd_cron_lease_ran_total \d+/);
  });
});

describe('ops/ queries only use metrics the API really emits (drift guard)', () => {
  const emitted = (() => {
    const m = new MetricsService();
    for (const r of ['/api/v1/payments/1', '/api/v1/auth/x', '/api/v1/orders/1']) m.record(r, 200, 10);
    return new Set(m.scrape().split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(/[{ ]/)[0]));
  })();
  // _bucket/_sum/_count suffixes are Prometheus histogram conventions
  const known = (name: string) => emitted.has(name) || emitted.has(name.replace(/_(count)$/, '_total')) ;
  const metricsIn = (expr: string) => [...new Set(expr.match(/\bnabd_[a-z0-9_]+/g) ?? [])];

  it('every nabd_* metric in the Prometheus rules is emitted', () => {
    const rs = rules(path.join(OPS, 'prometheus', 'nabd-alerts.yml'));
    const missing: string[] = [];
    for (const r of rs) { expect(r.expr.length).toBeGreaterThan(0); for (const n of metricsIn(r.expr)) if (!known(n)) missing.push(`${r.alert}: ${n}`); }
    expect(missing).toEqual([]);
    expect(rs.map((r) => r.alert)).toEqual(expect.arrayContaining(['ApiAvailabilitySLOBurn', 'ClassP95High', 'PaymentErrorRatio', 'CronLeaseLost', 'OverloadStrained', 'OverloadShedding']));
  });

  it('every runbook_url in the Prometheus rules is a file in the repository', () => {
    const root = path.resolve(OPS, '..');
    const urls = [...fs.readFileSync(path.join(OPS, 'prometheus', 'nabd-alerts.yml'), 'utf8').matchAll(/runbook_url:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(5);
    for (const u of urls) expect(fs.existsSync(path.join(root, u))).toBe(true);
  });

  it.each(fs.readdirSync(path.join(OPS, 'grafana', 'dashboards')))('every nabd_* metric in dashboard %s is emitted and every panel has a query', (file) => {
    const d = JSON.parse(fs.readFileSync(path.join(OPS, 'grafana', 'dashboards', file), 'utf8'));
    const missing: string[] = [];
    for (const p of d.panels) {
      expect(p.targets?.length).toBeGreaterThan(0);
      for (const t of p.targets) for (const n of metricsIn(t.expr)) if (!known(n)) missing.push(`${p.title}: ${n}`);
    }
    expect(missing).toEqual([]);
  });

  it('the p95 targets in the Prometheus class rule are the ones in route-classes.ts', () => {
    const expr = rules(path.join(OPS, 'prometheus', 'nabd-alerts.yml')).find((r) => r.alert === 'ClassP95High')!.expr;
    for (const [cls, def] of Object.entries(ROUTE_CLASSES)) {
      if (cls === 'other') continue;
      expect(expr).toContain(`class="${cls}"} > ${def.p95_ms}`);
    }
  });
});

describe('tracing helpers', () => {
  it('traced() runs the function, returns its value and rethrows its error, with or without a Sentry client', async () => {
    await expect(traced('job', 'queue.process', async () => 42)).resolves.toBe(42);
    await expect(traced('job', 'queue.process', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });
  it('without an active span there is no trace id and log records stay as before (no trace_id key)', () => {
    expect(currentTraceId()).toBeUndefined();
    expect(buildLogRecord('info', 'x', {})).not.toHaveProperty('trace_id');
  });
});
