import {
  AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, parseRetryAfter, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor,
} from './requestPolicy';

describe('request policy (15.1)', () => {
  it('uses 15 s by default, 60 s for an upload, 45 s for the AI routes, and a caller value when given', () => {
    expect(timeoutFor('/orders/mine', undefined)).toBe(DEFAULT_TIMEOUT_MS);
    expect(timeoutFor('/profile/photo', new FormData())).toBe(UPLOAD_TIMEOUT_MS);
    expect(timeoutFor('/ai/assistant', '{}')).toBe(AI_TIMEOUT_MS);
    expect(timeoutFor('/airport/transfer', undefined)).toBe(DEFAULT_TIMEOUT_MS);
    expect(timeoutFor('/ai/assistant', '{}', 5000)).toBe(5000);
  });

  it('retries a safe read, or a write with the caller\'s own key; never a write whose key the client invented', () => {
    expect(planRetries('GET', false)).toEqual({ retryTransport: true, retryGateway: true });
    expect(planRetries(undefined, false).retryTransport).toBe(true);
    expect(planRetries('POST', true).retryTransport).toBe(true);
    expect(planRetries('POST', false)).toEqual({ retryTransport: false, retryGateway: false });
    expect(planRetries('DELETE', false).retryTransport).toBe(false);
  });

  it('429 is retried for everyone; 502, 503 and 504 only when the plan allows; 500 and 4xx never', () => {
    const no = planRetries('POST', false);
    const yes = planRetries('GET', false);
    expect(shouldRetryStatus(429, no)).toBe(true);
    expect(shouldRetryStatus(503, no)).toBe(false);
    expect(shouldRetryStatus(503, yes)).toBe(true);
    expect(shouldRetryStatus(502, yes)).toBe(true);
    expect(shouldRetryStatus(504, yes)).toBe(true);
    expect(shouldRetryStatus(500, yes)).toBe(false);
    expect(shouldRetryStatus(400, yes)).toBe(false);
  });

  it('reads Retry-After as seconds or as a date, and ignores anything else', () => {
    expect(parseRetryAfter('3')).toBe(3000);
    expect(parseRetryAfter(' 0 ')).toBe(0);
    const now = Date.parse('2026-10-22T10:00:00Z');
    expect(parseRetryAfter('Thu, 22 Oct 2026 10:00:05 GMT', now)).toBe(5000);
    expect(parseRetryAfter('Thu, 22 Oct 2026 09:00:00 GMT', now)).toBe(0);
    expect(parseRetryAfter('soon')).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
  });

  it('waits what Retry-After says (capped), else backs off exponentially with jitter inside a bound', () => {
    expect(retryDelayMs(0, '2')).toBe(2000);
    expect(retryDelayMs(0, '600')).toBe(30_000);
    expect(retryAfterTooLong('600')).toBe(true);
    expect(retryAfterTooLong('5')).toBe(false);
    expect(retryDelayMs(0, null, () => 0.999)).toBeLessThan(500);
    expect(retryDelayMs(1, null, () => 0.999)).toBeLessThan(1000);
    expect(retryDelayMs(2, null, () => 0)).toBe(0);
    expect(retryDelayMs(20, null, () => 0.999)).toBeLessThan(8000);
  });
});
