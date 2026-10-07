/**
 * 15.1 required verifications, exercised against the real `httpRequest`:
 *   1. the timeout fires;
 *   2. a retry honours `Retry-After`;
 *   3. no retry for a non-idempotent POST without an idempotency key.
 *
 * Nothing inside the policy is mocked: `fetch`, the clock and `sleep` are its
 * injection points, and every assertion is made against the calls the client
 * actually made.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApiError, httpJson, httpRequest } from '../client';
import { TIMEOUTS } from '../policy';

interface Call {
  url: string;
  init: RequestInit;
}

function recordingFetch(responses: Array<() => Response | Promise<Response>>) {
  const calls: Call[] = [];
  let index = 0;
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const factory = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return factory();
  });
  return { impl: impl as unknown as typeof fetch, calls, count: () => impl.mock.calls.length };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const neverSleep = () => Promise.resolve();

function sleepLog() {
  const slept: number[] = [];
  return { slept, sleep: async (ms: number) => void slept.push(ms) };
}

describe('15.1 — one API client per app (admin BFF client)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('verification 1 — the timeout fires', () => {
    it('aborts the in-flight request at the default budget and reports a timeout', async () => {
      vi.useFakeTimers();
      let observedSignal: AbortSignal | undefined;
      const fetchImpl = vi.fn((_url: string, init: RequestInit) => {
        observedSignal = init.signal as AbortSignal;
        return new Promise<Response>((_resolve, reject) => {
          observedSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      });

      const pending = httpRequest('/api/admin/admin/ops/queues', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: neverSleep,
        maxAttempts: 1,
      });
      const assertion = expect(pending).rejects.toMatchObject({ kind: 'timeout', status: 0, code: 'SERVICE_UNAVAILABLE' });
      await vi.advanceTimersByTimeAsync(TIMEOUTS.default + 1);
      await assertion;

      expect(observedSignal?.aborted).toBe(true);
    });

    it('uses 60 s for an upload and 45 s for AI, not the 15 s default', async () => {
      vi.useFakeTimers();
      const abortedAt: number[] = [];
      let clock = 0;
      const fetchImpl = vi.fn((_url: string, init: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            abortedAt.push(clock);
            reject(new DOMException('aborted', 'AbortError'));
          });
        });
      });

      const upload = httpRequest('/api/admin/admin/catalog/import', {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=x' },
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: neverSleep,
        maxAttempts: 1,
      });
      const ai = httpRequest('/api/admin/ai/admin/gateway', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: neverSleep,
        maxAttempts: 1,
      });
      const settled = Promise.allSettled([upload, ai]);

      await vi.advanceTimersByTimeAsync(TIMEOUTS.default);
      clock = TIMEOUTS.default;
      expect(abortedAt).toHaveLength(0); // neither gave up at the 15 s default

      await vi.advanceTimersByTimeAsync(TIMEOUTS.ai - TIMEOUTS.default);
      clock = TIMEOUTS.ai;
      expect(abortedAt).toHaveLength(1); // the AI request gave up at 45 s

      await vi.advanceTimersByTimeAsync(TIMEOUTS.upload - TIMEOUTS.ai);
      clock = TIMEOUTS.upload;
      await settled;
      expect(abortedAt).toHaveLength(2); // the upload gave up at 60 s
    });

    it('gives an offline device a connection next step without touching the network', async () => {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
      const fetchImpl = vi.fn();
      await expect(
        httpRequest('/api/admin/admin/ops/queues', { fetchImpl: fetchImpl as unknown as typeof fetch }),
      ).rejects.toMatchObject({ kind: 'offline', status: 0, code: 'SERVICE_UNAVAILABLE' });
      expect(fetchImpl).not.toHaveBeenCalled();
      await expect(
        httpRequest('/api/admin/admin/ops/queues', { fetchImpl: fetchImpl as unknown as typeof fetch, locale: 'en' }),
      ).rejects.toMatchObject({ nextStep: 'Check your connection, then try again.' });
    });
  });

  describe('verification 2 — a retry honours Retry-After', () => {
    it('waits exactly as long as the backend asked before the second attempt', async () => {
      const { impl, count } = recordingFetch([
        () => json({ code: 'RATE_LIMITED' }, 429, { 'retry-after': '2' }),
        () => json({ ok: true }),
      ]);
      const { slept, sleep } = sleepLog();

      const response = await httpRequest('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep });

      expect(response.status).toBe(200);
      expect(count()).toBe(2);
      expect(slept).toEqual([2000]);
    });

    it('reads Retry-After as an HTTP date as well as delta-seconds', async () => {
      const now = Date.parse('2026-10-04T12:00:00Z');
      const { impl } = recordingFetch([
        () => json({}, 503, { 'retry-after': new Date(now + 5_000).toUTCString() }),
        () => json({ ok: true }),
      ]);
      const { slept, sleep } = sleepLog();

      await httpRequest('/api/admin/admin/ops/queues', { fetchImpl: impl, now: () => now, sleep });

      expect(slept).toEqual([5000]);
    });

    it('clamps an absurd Retry-After so a handler is never parked for minutes', async () => {
      const { impl } = recordingFetch([
        () => json({}, 429, { 'retry-after': '3600' }),
        () => json({ ok: true }),
      ]);
      const { slept, sleep } = sleepLog();

      await httpRequest('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep });

      expect(slept).toEqual([60_000]);
    });

    it('falls back to exponential backoff with jitter when Retry-After is absent', async () => {
      const { impl } = recordingFetch([() => json({}, 503), () => json({}, 503), () => json({ ok: true })]);
      const { slept, sleep } = sleepLog();

      await httpRequest('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep });

      // Attempt 1: 300 ms window → 150..300. Attempt 2: 600 ms window → 300..600.
      expect(slept).toHaveLength(2);
      expect(slept[0]).toBeGreaterThanOrEqual(150);
      expect(slept[0]).toBeLessThanOrEqual(300);
      expect(slept[1]).toBeGreaterThanOrEqual(300);
      expect(slept[1]).toBeLessThanOrEqual(600);
    });
  });

  describe('verification 3 — no retry for a non-idempotent POST without a key', () => {
    it('returns the first 503 instead of replaying the write', async () => {
      const { impl, count } = recordingFetch([() => json({ code: 'SERVICE_UNAVAILABLE' }, 503)]);

      const response = await httpRequest('/api/admin/admin/orders/42/refund', {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
        fetchImpl: impl,
        sleep: neverSleep,
      });

      expect(response.status).toBe(503);
      expect(count()).toBe(1);
    });

    it('does not replay a POST after a transport failure either', async () => {
      const { impl, count } = recordingFetch([() => Promise.reject(new TypeError('fetch failed'))]);

      await expect(
        httpRequest('/api/admin/admin/orders/42/refund', {
          method: 'POST',
          body: JSON.stringify({ amount: 10 }),
          fetchImpl: impl,
          sleep: neverSleep,
        }),
      ).rejects.toMatchObject({ kind: 'network' });
      expect(count()).toBe(1);
    });

    it('does retry the same POST when the caller supplies an idempotency key', async () => {
      const { impl, count } = recordingFetch([() => json({}, 503), () => json({ ok: true })]);

      const response = await httpRequest('/api/admin/admin/orders/42/refund', {
        method: 'POST',
        headers: { 'idempotency-key': 'refund-order-42-attempt-1' },
        body: JSON.stringify({ amount: 10 }),
        fetchImpl: impl,
        sleep: neverSleep,
      });

      expect(response.status).toBe(200);
      expect(count()).toBe(2);
      // Every attempt must carry the SAME key or the backend cannot deduplicate.
      const keys = (impl as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls.map((call) =>
        new Headers(call[1].headers).get('idempotency-key'),
      );
      expect(keys).toEqual(['refund-order-42-attempt-1', 'refund-order-42-attempt-1']);
    });

    it('retries safe methods without any key', async () => {
      const { impl, count } = recordingFetch([() => json({}, 500), () => json({ ok: true })]);
      const response = await httpRequest('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep: neverSleep });
      expect(response.status).toBe(200);
      expect(count()).toBe(2);
    });

    it('never retries a 4xx that is not a transient status', async () => {
      const { impl, count } = recordingFetch([() => json({ code: 'INVALID_INPUT' }, 400)]);
      const response = await httpRequest('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep: neverSleep });
      expect(response.status).toBe(400);
      expect(count()).toBe(1);
    });
  });

  describe('cancellation — the request dies with the screen', () => {
    it('rethrows AbortError when the caller aborts mid-flight', async () => {
      const controller = new AbortController();
      const fetchImpl = vi.fn((_url: string, init: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      });

      const pending = httpRequest('/api/admin/admin/ops/queues', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        signal: controller.signal,
      });
      controller.abort();

      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('does not start at all when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const fetchImpl = vi.fn();
      await expect(
        httpRequest('/api/admin/admin/ops/queues', {
          fetchImpl: fetchImpl as unknown as typeof fetch,
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });

  describe('error catalogue mapping', () => {
    it('carries a localized catalogue code, message and next step on every failure', async () => {
      const { impl } = recordingFetch([() => json({ code: 'RATE_LIMITED', message: 'حاول لاحقاً' }, 429)]);
      await expect(
        httpJson('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep: neverSleep }),
      ).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        catalogMessage: 'محاولات كثيرة جداً. يرجى التمهل.',
        nextStep: 'انتظر قليلاً ثم حاول مرة أخرى.',
        status: 429,
      });
    });

    it('maps a status with no catalogue code onto UNKNOWN_ERROR rather than inventing text', async () => {
      const { impl } = recordingFetch([() => json({}, 418)]);
      await expect(
        httpJson('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep: neverSleep }),
      ).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        catalogMessage: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
        nextStep: 'إذا استمرت المشكلة، تواصل مع الدعم.',
      });
    });

    it('keeps the server message as the display text but always exposes the catalogue fields', async () => {
      const { impl } = recordingFetch([() => json({ code: 'INSUFFICIENT_PERMISSION', message: 'نقطة مخصصة' }, 403)]);
      const error = await httpJson('/api/admin/admin/rbac/roles', { fetchImpl: impl, sleep: neverSleep }).catch(
        (reason: unknown) => reason,
      );

      expect(error).toBeInstanceOf(AdminApiError);
      const apiError = error as AdminApiError;
      expect(apiError.message).toBe('نقطة مخصصة');
      expect(apiError.catalogMessage).toBe('ليس لديك صلاحية لتنفيذ هذا الإجراء.');
      expect(apiError.nextStep).toBe('تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.');
    });

    it('leaves the response body unread so res.ok / res.json() call sites keep working', async () => {
      const { impl } = recordingFetch([() => json({ data: [1, 2] })]);
      const response = await httpRequest('/api/admin/admin/ops/queues', { fetchImpl: impl, sleep: neverSleep });
      expect(response.ok).toBe(true);
      await expect(response.json()).resolves.toEqual({ data: [1, 2] });
    });
  });
});