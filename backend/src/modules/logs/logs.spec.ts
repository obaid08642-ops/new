/**
 * Phase 20.3 follow-up — central structured logs.
 * Covers: the LoggerService masks PII; LOG_LEVEL is honoured; the app_logs TTL index and its siblings exist; only warn and
 * error are stored, within a rate limit and a size cap; the admin filters cannot be used to inject a Mongo operator;
 * and no console.* is left in backend/src.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LoggerService } from '../../common/logger.service';
import { LogRecord, addLogSink, buildLogRecord, logEvent, resolveLogLevel, runWithLogContext, setLogOutput } from '../../common/structured-logger';
import { APP_LOGS_INDEXES, APP_LOGS_TTL_SECONDS, LogsStoreService, ensureAppLogsIndexes, toStoredDoc } from './app-logs.store';
import { AdminLogsController, buildLogsFilter } from './admin-logs.controller';
import { FakeLogCollection, fakeLogConnection } from '../../../test/support/fake-log-collection';

const ENV_KEYS = ['LOG_LEVEL', 'NODE_ENV', 'PROCESS_ROLE', 'LOG_STORE_RATE_PER_MIN', 'LOG_STORE_MAX_DOCS', 'LOG_STORE_MAX_MB'] as const;
const saved: Record<string, string | undefined> = {};
let lines: string[] = [];
const out = () => lines.map((l) => JSON.parse(l));

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  delete process.env.LOG_LEVEL;
  process.env.NODE_ENV = 'test';
  lines = [];
  setLogOutput((l) => lines.push(l));
});
afterEach(() => {
  for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  setLogOutput();
});

describe('LOG_LEVEL', () => {
  it('defaults to debug outside production and info in production', () => {
    expect(resolveLogLevel({ NODE_ENV: 'development' })).toBe('debug');
    expect(resolveLogLevel({ NODE_ENV: 'test' })).toBe('debug');
    expect(resolveLogLevel({ NODE_ENV: 'production' })).toBe('info');
    expect(resolveLogLevel({})).toBe('debug');
  });

  it('takes debug|info|warn|error from LOG_LEVEL, in any case, and ignores a value it does not know', () => {
    for (const lvl of ['debug', 'info', 'warn', 'error'] as const) expect(resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: lvl })).toBe(lvl);
    expect(resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: ' WARN ' })).toBe('warn');
    // a typo must not silence the logs
    expect(resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: 'verbose-ish' })).toBe('info');
  });

  it('logEvent and the LoggerService drop what is below the level and keep the rest', () => {
    const app = new LoggerService();
    process.env.LOG_LEVEL = 'warn';
    logEvent('debug', 'd'); logEvent('info', 'i'); logEvent('warn', 'w'); logEvent('error', 'e');
    app.log('nest info'); app.debug('nest debug'); app.warn('nest warn'); app.error('nest error');
    expect(out().map((r) => r.event)).toEqual(['w', 'e', 'app_log', 'app_log']);
    expect(out().map((r) => r.level)).toEqual(['warn', 'error', 'warn', 'error']);

    lines = []; process.env.LOG_LEVEL = 'debug';
    logEvent('debug', 'd'); app.verbose('v');
    expect(out().map((r) => r.level)).toEqual(['debug', 'debug']);

    lines = []; process.env.LOG_LEVEL = 'error';
    logEvent('warn', 'w'); logEvent('error', 'e');
    expect(out().map((r) => r.event)).toEqual(['e']);
  });
});

describe('one structured line', () => {
  it('has every key, with the request, the user and the columns filled from context and fields', () => {
    const app = new LoggerService();
    runWithLogContext({ requestId: 'req-42', userId: 'u-7', role: 'admin' }, () => {
      logEvent('warn', 'slow_call', { module: 'orders', route: '/orders/:id', status: 200, duration_ms: 1800, items: 3 });
      app.error('boom', 'stack line 1\nstack line 2', 'OrdersService');
    });
    const [a, b] = out();
    expect(Object.keys(a).sort()).toEqual(['details', 'duration_ms', 'event', 'level', 'module', 'request_id', 'route', 'service', 'status', 'ts', 'user_id']);
    expect(a).toMatchObject({ level: 'warn', service: 'backend', module: 'orders', event: 'slow_call', request_id: 'req-42', user_id: 'u-7', route: '/orders/:id', status: 200, duration_ms: 1800 });
    expect(a.details).toEqual({ items: 3 });
    expect(new Date(a.ts).toISOString()).toBe(a.ts);
    expect(b).toMatchObject({ level: 'error', module: 'OrdersService', event: 'app_log', request_id: 'req-42', user_id: 'u-7' });
    expect(b.details.message).toBe('boom');
    expect(b.details.stack).toContain('stack line 1');
  });

  it('says worker when PROCESS_ROLE is worker, and a missing request id is null', () => {
    process.env.PROCESS_ROLE = 'worker';
    logEvent('info', 'cron_tick');
    expect(out()[0]).toMatchObject({ service: 'worker', request_id: null, user_id: null, route: null, status: null, duration_ms: null, details: null });
  });

  it('keeps the event of a line written the old way (JSON text through Logger)', () => {
    new LoggerService().log(JSON.stringify({ ts: 'x', level: 'info', event: 'legacy_event', request_id: 'r', order: 'o1' }), 'HTTP');
    // the request id of the old line becomes the column, the rest stays in details
    expect(out()[0]).toMatchObject({ event: 'legacy_event', module: 'HTTP', request_id: 'r' });
    expect(out()[0].details).toEqual({ order: 'o1' });
  });
});

describe('PII is masked before anything is written', () => {
  it('masks a phone, an e-mail and a national id in details, by key and by value, through logEvent', () => {
    logEvent('error', 'payment_failed', { phone: '+966501234567', email: 'a@b.com', national_id: '1012345678', note: 'call 0501234567 now', amount: 20, nested: { token: 't', diagnosis: 'asthma', ok: 1 } });
    const r = out()[0];
    expect(lines[0]).not.toMatch(/966501234567|a@b\.com|1012345678|0501234567|asthma/);
    expect(r.details).toEqual({ phone: '[redacted]', email: '[redacted]', national_id: '[redacted]', note: '[redacted]', amount: 20, nested: { token: '[redacted]', diagnosis: '[redacted]', ok: 1 } });
  });

  it('masks PII that arrives as free text through the Nest Logger path', () => {
    const app = new LoggerService();
    app.warn('user a.b@example.com asked for +966501234567', 'Auth');
    app.error(new Error('failed for 1012345678'));
    expect(lines.join('\n')).not.toMatch(/example\.com|966501234567|1012345678/);
    expect(out()[0].details.message).toBe('[redacted]');
  });
});

describe('app_logs: the TTL index and the others exist', () => {
  it('creates a 30-day TTL index on ts and indexes on level, module and request_id', async () => {
    const col = new FakeLogCollection();
    expect(await ensureAppLogsIndexes(col)).toEqual([]);
    const ttl = col.indexes.find((i) => i.name === 'ts_ttl');
    expect(ttl).toMatchObject({ key: { ts: 1 }, expireAfterSeconds: 30 * 24 * 60 * 60 });
    expect(APP_LOGS_TTL_SECONDS).toBe(2_592_000);
    for (const field of ['level', 'module', 'request_id']) expect(col.indexes.some((i) => Object.keys(i.key)[0] === field)).toBe(true);
    expect(APP_LOGS_INDEXES.filter((i) => 'expireAfterSeconds' in i)).toHaveLength(1);
  });

  it('a failing index is reported, not thrown (the API must still boot)', async () => {
    const problems = await ensureAppLogsIndexes({ createIndex: async () => { throw new Error('IndexOptionsConflict'); } });
    expect(problems).toHaveLength(APP_LOGS_INDEXES.length);
  });

  it('ts is stored as a Date (a TTL index ignores a string) and a huge details is cut', () => {
    const rec = buildLogRecord('error', 'x', { blob: 'z'.repeat(9000) });
    const doc = toStoredDoc(rec) as any;
    expect(doc.ts).toBeInstanceOf(Date);
    expect(doc.details.truncated).toBe(true);
    expect(JSON.stringify(doc.details).length).toBeLessThan(4200);
  });
});

describe('storing: warn and error only, bounded, fail-open', () => {
  const make = () => { const col = new FakeLogCollection(); const store = new LogsStoreService(fakeLogConnection(col)); return { col, store }; };
  const rec = (level: LogRecord['level'], event = 'e'): LogRecord => buildLogRecord(level, event);

  it('keeps warn and error, drops info and debug', async () => {
    const { col, store } = make();
    for (const l of ['debug', 'info', 'warn', 'error'] as const) store.accept(rec(l));
    await store.flush();
    expect(col.docs.map((d) => d.level)).toEqual(['warn', 'error']);
  });

  it('writes a batch with one insertMany', async () => {
    const { col, store } = make();
    for (let i = 0; i < 25; i += 1) store.accept(rec('error', `e${i}`));
    await store.flush();
    expect(col.insertManyCalls).toBe(1);
    expect(col.docs).toHaveLength(25);
  });

  it('an error storm stops at the per-minute budget and counts what it dropped', async () => {
    process.env.LOG_STORE_RATE_PER_MIN = '50';
    const { col, store } = make();
    for (let i = 0; i < 400; i += 1) store.accept(rec('error', `storm${i}`));
    await store.flush();
    expect(col.docs).toHaveLength(50);
    expect(store.dropped).toBe(350);
  });

  it('a database that is down loses the lines and nothing else', async () => {
    const { col, store } = make();
    col.failInserts = true;
    store.accept(rec('error'));
    await expect(store.flush()).resolves.toBe(0);
    expect(store.dropped).toBe(1);
  });

  it('the size cap deletes the oldest lines until the collection is under it', async () => {
    process.env.LOG_STORE_MAX_DOCS = '100';
    const col = new FakeLogCollection();
    for (let i = 0; i < 300; i += 1) col.docs.push({ _id: i + 1, ts: new Date(2026, 0, 1, 0, 0, i), level: 'error', event: `old${i}` });
    const store = new LogsStoreService(fakeLogConnection(col));
    const deleted = await store.trim();
    expect(col.docs.length).toBeLessThanOrEqual(100);
    expect(deleted).toBe(300 - col.docs.length);
    expect(col.docs.every((d) => d._id > 150)).toBe(true);   // the newest survive
  });

  it('is wired as a sink: a warn through logEvent lands in the collection', async () => {
    const { col, store } = make();
    const off = addLogSink((r) => store.accept(r));
    try {
      runWithLogContext({ requestId: 'rq-1' }, () => { logEvent('warn', 'sinked', { module: 'unit' }); logEvent('info', 'not stored'); });
      await store.flush();
    } finally { off(); }
    expect(col.docs).toHaveLength(1);
    expect(col.docs[0]).toMatchObject({ event: 'sinked', module: 'unit', request_id: 'rq-1' });
  });
});

describe('admin filters', () => {
  it('builds the filter from level, module, request_id, from/to and a text search', () => {
    const f: any = buildLogsFilter({ level: 'error', module: 'orders', request_id: 'r-1', from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z', q: 'timeout' });
    expect(f).toMatchObject({ level: 'error', module: 'orders', request_id: 'r-1' });
    expect(f.ts.$gte).toEqual(new Date('2026-10-01T00:00:00Z'));
    expect(f.ts.$lte).toEqual(new Date('2026-10-02T00:00:00Z'));
    expect(f.$or).toHaveLength(5);
  });

  it('escapes the text search, so q cannot be a regex or an operator', () => {
    const f: any = buildLogsFilter({ q: '.*(a+)+$' });
    const rx = f.$or[0].event.$regex as string;
    expect(new RegExp(rx).test('xyz')).toBe(false);
    expect(new RegExp(rx).test('has .*(a+)+$ inside')).toBe(true);
  });

  it('lists newest first with a page, and one request in order', async () => {
    const col = new FakeLogCollection();
    for (let i = 0; i < 7; i += 1) col.docs.push({ _id: i + 1, ts: new Date(2026, 9, 1, 0, 0, i), level: i % 2 ? 'error' : 'warn', service: 'backend', module: 'm', event: `e${i}`, request_id: i < 3 ? 'same' : `other${i}`, details: { phone: '0501234567' } });
    const ctl = new AdminLogsController(new LogsStoreService(fakeLogConnection(col)));
    const page = await ctl.list({ page: 2, page_size: 3 } as any);
    expect(page).toMatchObject({ page: 2, page_size: 3, total: 7, pages: 3, retention_days: 30 });
    expect(page.data.map((r: any) => r.event)).toEqual(['e3', 'e2', 'e1']);
    expect(page.data[0].details.phone).toBe('[redacted]');
    const only = await ctl.list({ level: 'error' } as any);
    expect(only.data.every((r: any) => r.level === 'error')).toBe(true);
    const req = await ctl.byRequest('same');
    expect(req.data.map((r: any) => r.event)).toEqual(['e0', 'e1', 'e2']);
    await expect(ctl.byRequest('bad id!')).rejects.toThrow('invalid_request_id');
    await expect(ctl.list({ from: '2026-10-05T00:00:00Z', to: '2026-10-01T00:00:00Z' } as any)).rejects.toThrow('from_after_to');
  });
});

describe('no console.* is left in backend/src', () => {
  const root = join(__dirname, '..', '..');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return name === 'scripts' || name === 'node_modules' ? [] : walk(p);
      return /\.ts$/.test(name) && !/\.spec\.ts$/.test(name) ? [p] : [];
    });

  it('uses logEvent / the LoggerService instead (src/scripts and specs excluded)', () => {
    const offenders = walk(root).filter((f) => /\bconsole\.(log|warn|error|info|debug)\s*\(/.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
    expect(offenders.map((f) => f.slice(root.length))).toEqual([]);
  });
});
