import { GatewayTimeoutException, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { externalFetch, isSafeToRepeat, MAX_EXTERNAL_RETRIES, timedFetch } from './external-call';
import { runWithLogContext } from './structured-logger';

// A service that never answers until its request is aborted, like a hung gateway.
function hang(): jest.Mock {
  return jest.fn((_url: string, init?: RequestInit) => new Promise<Response>((_res, rej) => {
    init?.signal?.addEventListener('abort', () => rej(init.signal!.reason));
  }));
}
const ok = (status = 200) => ({ status, ok: status < 400 }) as Response;

describe('timedFetch', () => {
  const realFetch = global.fetch;
  const noWait = jest.fn(async () => undefined);
  afterEach(() => { global.fetch = realFetch; jest.restoreAllMocks(); noWait.mockClear(); });

  it('a slow service times out at the limit with a typed 504', async () => {
    global.fetch = hang() as any;
    const t0 = Date.now();
    await expect(timedFetch('http://x/slow', undefined, { timeoutMs: 80, timeoutCode: 'payment_gateway_timeout' }))
      .rejects.toMatchObject({ response: expect.objectContaining({ message: 'payment_gateway_timeout' }), status: 504 });
    const took = Date.now() - t0;
    expect(took).toBeGreaterThanOrEqual(70);
    expect(took).toBeLessThan(1000);
  });

  it('keeps the older 503 answer for externalFetch', async () => {
    global.fetch = hang() as any;
    await expect(externalFetch('http://x/slow', undefined, 50)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('a read is repeated at most twice (3 calls in all), with growing waits', async () => {
    const f = hang();
    global.fetch = f as any;
    await expect(timedFetch('http://x/get', undefined, { timeoutMs: 20, retries: 50, backoffMs: 100, sleep: noWait }))
      .rejects.toBeInstanceOf(GatewayTimeoutException);
    expect(f).toHaveBeenCalledTimes(1 + MAX_EXTERNAL_RETRIES);
    expect(noWait.mock.calls.map((c: any[]) => c[0])).toEqual([100, 200]);
  });

  it('a POST without an idempotency key is sent once', async () => {
    const f = hang();
    global.fetch = f as any;
    await expect(timedFetch('http://x/pay', { method: 'POST', body: '{}' }, { timeoutMs: 20, retries: 2, sleep: noWait }))
      .rejects.toBeInstanceOf(GatewayTimeoutException);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('a POST with an idempotency key may be repeated, still capped at two repeats', async () => {
    const f = hang();
    global.fetch = f as any;
    await expect(timedFetch('http://x/pay', { method: 'POST', headers: { 'Idempotency-Key': 'k1' } }, { timeoutMs: 20, retries: 2, sleep: noWait }))
      .rejects.toBeInstanceOf(GatewayTimeoutException);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('a 503 from the other side is repeated and a later success is returned', async () => {
    const f = jest.fn().mockResolvedValueOnce(ok(503)).mockResolvedValueOnce(ok(200));
    global.fetch = f as any;
    const res = await timedFetch('http://x/get', undefined, { retries: 2, sleep: noWait });
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('a 4xx answer is returned at once, never repeated', async () => {
    const f = jest.fn().mockResolvedValue(ok(400));
    global.fetch = f as any;
    expect((await timedFetch('http://x/get', undefined, { retries: 2, sleep: noWait })).status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('a network error that is not a timeout is rethrown unchanged after the repeats', async () => {
    const boom = new TypeError('fetch failed');
    const f = jest.fn().mockRejectedValue(boom);
    global.fetch = f as any;
    await expect(timedFetch('http://x/get', undefined, { retries: 1, sleep: noWait })).rejects.toBe(boom);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('logs the timeout with the request id and no URL', async () => {
    global.fetch = hang() as any;
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await runWithLogContext({ requestId: 'req-abc-123' }, () =>
      expect(timedFetch('http://secret-host/pay?token=SECRET', undefined, { timeoutMs: 20, label: 'moyasar.createPayment' })).rejects.toBeInstanceOf(GatewayTimeoutException));
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain('req-abc-123');
    expect(line).toContain('moyasar.createPayment');
    expect(line).not.toContain('SECRET');
    expect(line).not.toContain('secret-host');
  });

  it('decides what is safe to repeat', () => {
    expect(isSafeToRepeat()).toBe(true);
    expect(isSafeToRepeat({ method: 'get' })).toBe(true);
    expect(isSafeToRepeat({ method: 'POST' })).toBe(false);
    expect(isSafeToRepeat({ method: 'POST', headers: { 'idempotency-key': 'a' } })).toBe(true);
    expect(isSafeToRepeat({ method: 'POST', headers: new Headers({ 'Idempotency-Key': 'a' }) })).toBe(true);
    expect(isSafeToRepeat({ method: 'DELETE' })).toBe(false);
  });
});

// Source scan (5.): every outbound HTTP call under src carries a timeout.
describe('every outbound call has a timeout', () => {
  const SRC = path.resolve(__dirname, '..');
  const files: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'scripts' && e.name !== 'node_modules') walk(p); }
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) files.push(p);
    }
  })(SRC);

  /** The text of one call: from its opening parenthesis to the matching one. */
  function callText(src: string, open: number): string {
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')' && --depth === 0) return src.slice(open, i + 1);
    }
    return src.slice(open);
  }

  it('fetch( and axios calls name a timeout, or go through timedFetch / externalFetch', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const re = /(?<![\w.])(?:await\s+|=\s*|return\s+|\(\s*)fetch\(|axios(?:\.(?:get|post|put|patch|delete|request|head))?\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const open = src.indexOf('(', m[0].includes('fetch') ? m.index + m[0].indexOf('fetch') : m.index);
        const text = callText(src, open);
        if (/\bsignal\s*:|AbortSignal\.timeout|\btimeout\s*:|timeoutMs/.test(text)) continue;
        // a local helper named fetch (ops.controller) is not a network call
        if (/^\s*fetch\('/.test(src.slice(m.index, m.index + 12)) && f.endsWith('ops.controller.ts')) continue;
        offenders.push(`${path.relative(SRC, f)}: ${text.slice(0, 70).replace(/\s+/g, ' ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
