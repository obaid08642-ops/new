import { describe, expect, it } from 'vitest';
import {
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  backoffDelayMs,
  classifyRequestKind,
  hasIdempotencyKey,
  isOffline,
  isRetrySafe,
  isRetryableStatus,
  parseRetryAfter,
  readHeader,
  timeoutForKind,
  TIMEOUTS,
} from '../policy';

describe('15.1 policy — timeouts', () => {
  it('uses the plan budgets: 15 s default, 60 s upload, 45 s AI', () => {
    expect(timeoutForKind('default')).toBe(15_000);
    expect(timeoutForKind('upload')).toBe(60_000);
    expect(timeoutForKind('ai')).toBe(45_000);
    expect(TIMEOUTS).toEqual({ default: 15_000, upload: 60_000, ai: 45_000 });
  });
});

describe('15.1 policy — request classification', () => {
  it('treats a multipart body as an upload', () => {
    expect(
      classifyRequestKind('/api/admin/admin/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data; boundary=abc' },
      }),
    ).toBe('upload');
  });

  it('treats the AI gateway and image-suggestion routes as AI calls', () => {
    expect(classifyRequestKind('/api/admin/ai/admin/gateway')).toBe('ai');
    expect(classifyRequestKind('/api/admin/ai/content-review/queue')).toBe('ai');
    expect(classifyRequestKind('/api/admin/medicines/admin/image-suggestions?status=pending')).toBe('ai');
  });

  it('leaves an ordinary admin list read on the default budget', () => {
    expect(classifyRequestKind('/api/admin/admin/ops/queues', { method: 'GET' })).toBe('default');
  });

  it('does not mistake a non-AI word containing "ai" for an AI route', () => {
    expect(classifyRequestKind('/api/admin/admin/maintenance/queue')).toBe('default');
    expect(classifyRequestKind('/api/admin/admin/campaigns')).toBe('default');
  });
});

describe('15.1 policy — safe retry', () => {
  it('accepts GET, HEAD and OPTIONS with no key', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'get']) {
      expect(isRetrySafe(method, undefined)).toBe(true);
    }
  });

  it('rejects every unsafe method with no key', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isRetrySafe(method, undefined)).toBe(false);
      expect(isRetrySafe(method, { 'idempotency-key': '   ' })).toBe(false);
    }
  });

  it('accepts an unsafe method only with a real key, from any header shape', () => {
    expect(isRetrySafe('POST', { 'idempotency-key': 'k-1' })).toBe(true);
    expect(isRetrySafe('POST', new Headers({ 'Idempotency-Key': 'k-1' }))).toBe(true);
    expect(isRetrySafe('POST', [['idempotency-key', 'k-1']])).toBe(true);
  });

  it('reads a header case-insensitively from each supported shape', () => {
    expect(readHeader({ 'Idempotency-Key': 'k' }, 'idempotency-key')).toBe('k');
    expect(readHeader(new Headers({ 'IDEMPOTENCY-KEY': 'k' }), 'idempotency-key')).toBe('k');
    expect(readHeader([['Idempotency-Key', 'k']], 'idempotency-key')).toBe('k');
    expect(readHeader(undefined, 'idempotency-key')).toBeNull();
    expect(hasIdempotencyKey(undefined)).toBe(false);
  });

  it('retries only transient statuses', () => {
    for (const status of [408, 425, 429, 500, 502, 503, 504]) {
      expect(isRetryableStatus(status)).toBe(true);
    }
    for (const status of [200, 201, 400, 401, 403, 404, 409, 422, 501]) {
      expect(isRetryableStatus(status)).toBe(false);
    }
  });
});

describe('15.1 policy — Retry-After and backoff', () => {
  it('parses delta-seconds and an HTTP date', () => {
    const now = Date.parse('2026-10-04T12:00:00Z');
    expect(parseRetryAfter('3', now)).toBe(3000);
    expect(parseRetryAfter(new Date(now + 4000).toUTCString(), now)).toBe(4000);
    expect(parseRetryAfter(new Date(now - 4000).toUTCString(), now)).toBe(0);
  });

  it('returns null for an absent or unparseable header', () => {
    const now = Date.now();
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter('  ', now)).toBeNull();
    expect(parseRetryAfter('soon', now)).toBeNull();
    expect(parseRetryAfter('-5', now)).toBeNull();
  });

  it('grows exponentially with equal jitter, and is deterministic for a fixed RNG', () => {
    expect(backoffDelayMs(1, { random: () => 0 })).toBe(BASE_BACKOFF_MS / 2);
    expect(backoffDelayMs(1, { random: () => 1 })).toBe(BASE_BACKOFF_MS);
    expect(backoffDelayMs(2, { random: () => 0 })).toBe(BASE_BACKOFF_MS);
    expect(backoffDelayMs(2, { random: () => 1 })).toBe(BASE_BACKOFF_MS * 2);
  });

  it('caps the exponential window at 4 s however many attempts have failed', () => {
    expect(backoffDelayMs(20, { random: () => 1 })).toBe(MAX_BACKOFF_MS);
  });

  it('lets Retry-After win outright over backoff', () => {
    expect(backoffDelayMs(1, { retryAfterMs: 1234, random: () => 1 })).toBe(1234);
    expect(backoffDelayMs(1, { retryAfterMs: 10 * 60_000, random: () => 1 })).toBe(60_000);
  });
});

describe('15.1 policy — offline detection', () => {
  it('treats only an explicit onLine === false as offline', () => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
    expect(isOffline()).toBe(true);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
    expect(isOffline()).toBe(false);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    expect(isOffline()).toBe(false);
  });
});