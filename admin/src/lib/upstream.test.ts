import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpstreamError, upstreamFailure, upstreamFetch } from './upstream';

const URL_ = 'http://backend.test/api/v1/admin/orders';
const ok = () => new Response('{}', { status: 200 });
const refused = (status: number, retryAfter?: string) => new Response(null, { status, headers: retryAfter ? { 'retry-after': retryAfter } : {} });
/** A backend that never answers; the call ends with an AbortError when its signal fires. */
const hang = (_url: unknown, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
  init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
});

describe('admin BFF upstreamFetch (15.1)', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('a backend that does not answer in time throws a timeout; a write without a key is not replayed', async () => {
    const fetchMock = vi.fn(hang);
    vi.stubGlobal('fetch', fetchMock);
    const error = await upstreamFetch(URL_, { method: 'POST', body: '{}', timeoutMs: 30 }).catch((e) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect(error.kind).toBe('timeout');
    expect(upstreamFailure(error)).toEqual({ status: 504, code: 'admin_backend_timeout' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a read that times out is tried once more', async () => {
    const fetchMock = vi.fn(hang);
    vi.stubGlobal('fetch', fetchMock);
    const error = await upstreamFetch(URL_, { timeoutMs: 30 }).catch((e) => e);
    expect(error.kind).toBe('timeout');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a lost connection is unavailable (502), not a timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const error = await upstreamFetch(URL_, { method: 'POST', body: '{}' }).catch((e) => e);
    expect(error.kind).toBe('unavailable');
    expect(upstreamFailure(error)).toEqual({ status: 502, code: 'admin_backend_unavailable' });
  });

  it('timeoutMs: 0 leaves an event stream open (no timeout)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    await upstreamFetch(URL_, { timeoutMs: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe('with a clock we control', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));

    it('a retry honours Retry-After (not at 999 ms, at 1000 ms)', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(refused(429, '1')).mockResolvedValueOnce(ok());
      vi.stubGlobal('fetch', fetchMock);
      const result = upstreamFetch(URL_);
      await vi.advanceTimersByTimeAsync(999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(2);
      expect((await result).status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('no retry for a write without the browser\'s key on 503; with the key it is tried again with the same key', async () => {
      const no = vi.fn().mockResolvedValue(refused(503));
      vi.stubGlobal('fetch', no);
      expect((await upstreamFetch(URL_, { method: 'POST', body: '{}' })).status).toBe(503);
      expect(no).toHaveBeenCalledTimes(1);

      const yes = vi.fn().mockResolvedValueOnce(refused(503)).mockResolvedValueOnce(ok());
      vi.stubGlobal('fetch', yes);
      const result = upstreamFetch(URL_, { method: 'POST', body: '{}', callerKey: true, headers: { 'idempotency-key': 'admin-attempt-0001' } });
      await vi.advanceTimersByTimeAsync(2000);
      expect((await result).status).toBe(200);
      const keys = yes.mock.calls.map(([, init]) => new Headers(init.headers).get('idempotency-key'));
      expect(keys).toEqual(['admin-attempt-0001', 'admin-attempt-0001']);
    });

    it('a browser that goes away stops the call and its wait', async () => {
      const controller = new AbortController();
      const fetchMock = vi.fn().mockResolvedValue(refused(503, '3'));
      vi.stubGlobal('fetch', fetchMock);
      const result = upstreamFetch(URL_, { signal: controller.signal }).catch((e) => e);
      await vi.advanceTimersByTimeAsync(500);
      controller.abort();
      const error = await result;
      expect(error).toBeInstanceOf(UpstreamError);
      expect(error.kind).toBe('aborted');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
