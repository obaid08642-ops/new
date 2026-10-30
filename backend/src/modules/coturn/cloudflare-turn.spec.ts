import { CloudflareTurnService, CF_TURN_CACHE_MS, CF_TURN_TTL_SECONDS } from './cloudflare-turn.service';

const ok = (servers: unknown) => ({ ok: true, status: 200, json: async () => ({ iceServers: servers }) });
const CF = { urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u1', credential: 'c1' };

describe('Cloudflare TURN credentials', () => {
  beforeEach(() => { process.env.CF_TURN_KEY_ID = 'key-1'; process.env.CF_TURN_API_TOKEN = 'cf-secret-token'; });
  afterEach(() => { delete process.env.CF_TURN_KEY_ID; delete process.env.CF_TURN_API_TOKEN; });

  it('is off without both env values (no call, empty list)', async () => {
    delete process.env.CF_TURN_API_TOKEN;
    const f = jest.fn();
    expect(await new CloudflareTurnService(f as never).iceServers('u')).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('asks Cloudflare for a short-lived credential and returns only urls/username/credential', async () => {
    const f = jest.fn(async () => ok(CF));
    const out = await new CloudflareTurnService(f as never).iceServers('u');
    expect(out).toEqual([CF]);
    const [url, init] = f.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://rtc.live.cloudflare.com/v1/turn/keys/key-1/credentials/generate');
    expect(JSON.parse(init.body)).toEqual({ ttl: CF_TURN_TTL_SECONDS });
    expect(init.headers.Authorization).toBe('Bearer cf-secret-token');
    expect(JSON.stringify(out)).not.toContain('cf-secret-token');
  });

  it('caches per user for a few minutes, then asks again', async () => {
    let t = 1_000_000;
    const f = jest.fn(async () => ok(CF));
    const s = new CloudflareTurnService(f as never, () => t);
    await s.iceServers('a'); await s.iceServers('a');
    expect(f).toHaveBeenCalledTimes(1);
    await s.iceServers('b');
    expect(f).toHaveBeenCalledTimes(2);
    t += CF_TURN_CACHE_MS + 1;
    await s.iceServers('a');
    expect(f).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['an HTTP error', async () => ({ ok: false, status: 503, json: async () => ({}) })],
    ['a network error', async () => { throw new Error('ECONNRESET'); }],
    ['an answer without servers', async () => ok({})],
  ])('falls back to nothing (coturn only) on %s, and never throws', async (_n, impl) => {
    expect(await new CloudflareTurnService(impl as never).iceServers('u')).toEqual([]);
  });
});
