import { apiReachable, refreshOutcome } from '../session';

describe('refreshOutcome', () => {
  it('keeps the session when the network or the server fails, ends it only when the session is refused', () => {
    expect(refreshOutcome(null)).toBe('unreachable');
    for (const status of [408, 429, 500, 502, 503, 504]) expect(refreshOutcome({ ok: false, status })).toBe('unreachable');
    for (const status of [400, 401, 403, 404]) expect(refreshOutcome({ ok: false, status })).toBe('denied');
    expect(refreshOutcome({ ok: true, status: 201 })).toBe('ok');
  });
});

describe('apiReachable', () => {
  it('is true for any answer of the app\'s own API, also an error status', async () => {
    const f = jest.fn(async () => ({ status: 503 })) as unknown as typeof fetch;
    expect(await apiReachable('https://api.example/api/v1', f)).toBe(true);
    expect((f as unknown as jest.Mock).mock.calls[0][0]).toBe('https://api.example/api/v1/health/liveness');
  });
  it('is false when the request fails', async () => {
    const f = jest.fn(async () => { throw new TypeError('Network request failed'); }) as unknown as typeof fetch;
    expect(await apiReachable('https://api.example/api/v1', f)).toBe(false);
  });
});
