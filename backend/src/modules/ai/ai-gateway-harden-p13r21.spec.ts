import { AiGatewayService } from './ai-gateway.service';

// P13-R21: one hardened gateway (the duplicate AiProviderService is dead
// code — nothing imports it). Red on the base: no per-minute/token limits,
// no cooldown failover, plaintext keys, no PII strip, no cache, no test-key,
// no medical disclaimer, no Gemini timeout.
describe('P13-R21 hardened AI gateway', () => {
  const OLD_ENV = { ...process.env };

  function setup(opts: { keys?: Record<string, string>; mode?: any } = {}) {
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    const providers = [
      { key: 'gemini', enabled: true, api_key: opts.keys?.gemini ?? 'g-key', model: 'gemini-2.0-flash', priority: 1, daily_quota: 1500, used_today: 0, usage_date: '', requests_per_minute: 60, requests_per_day: 10000, tokens_per_day: 1000000 },
      { key: 'groq', enabled: true, api_key: opts.keys?.groq ?? 'q-key', model: 'llama-3.3-70b-versatile', priority: 2, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.groq.com/openai/v1', requests_per_minute: 60, requests_per_day: 10000, tokens_per_day: 1000000 },
    ];
    const usage: any[] = [];
    const updated: any[] = [];
    const store = new Map<string, { v: string; exp: number }>();
    const redis: any = {
      incr: jest.fn(async (k: string) => { const c = Number(store.get(k)?.v || 0) + 1; store.set(k, { v: String(c), exp: 0 }); return c; }),
      expire: jest.fn(async () => 1),
      get: jest.fn(async (k: string) => store.get(k)?.v ?? null),
      set: jest.fn(async (k: string, v: string) => { store.set(k, { v, exp: 0 }); }),
      setex: jest.fn(async (k: string, _s: number, v: string) => { store.set(k, { v, exp: 0 }); return 'OK'; }),
      del: jest.fn(async (k: string) => { store.delete(k); return 1; }),
    };
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'ai_providers') {
          return {
            countDocuments: jest.fn(async () => providers.length),
            find: jest.fn(() => ({ sort: () => ({ toArray: async () => providers }), toArray: async () => providers })),
            findOne: jest.fn(async (q: any) => providers.find((p) => p.key === q?.key) || null),
            updateOne: jest.fn(async (f: any, u: any) => { updated.push({ f, u }); return { modifiedCount: 1 }; }),
          };
        }
        if (name === 'featureflags') {
          return {
            findOne: jest.fn(async (q: any) => (q?.key === 'ai_mode' ? { key: 'ai_mode', value: opts.mode?.value || 'auto', pinned_provider: opts.mode?.pinned || null, purpose_overrides: {} } : null)),
            updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
          };
        }
        if (name === 'ai_usage') {
          return {
            insertOne: jest.fn(async (d: any) => { usage.push(d); return { insertedId: 'u1' }; }),
            aggregate: jest.fn(() => ({ toArray: async () => [] })),
          };
        }
        return { findOne: jest.fn(async () => null) };
      }),
    };
    const svc = new AiGatewayService(conn, redis);
    return { svc, conn, redis, providers, usage, updated, store };
  }

  const OLD_FETCH = global.fetch;
  afterEach(() => {
    process.env = { ...OLD_ENV };
    (global as any).fetch = OLD_FETCH;
    jest.restoreAllMocks();
  });

  it('fails closed with 503 when no provider key is configured (never an empty 201)', async () => {
    const { svc } = setup({ keys: { gemini: '', groq: '' } });
    await expect(svc.generate({ prompt: 'hi', feature: 'triage' })).rejects.toThrow('ai_provider_unavailable');
  });

  it('429 on provider 1 fails over to provider 2 with a cooldown', async () => {
    const { svc } = setup();
    (global as any).fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate_limit_exceeded' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok2' } }] }) });
    const out: any = await svc.generate({ prompt: 'translate x', feature: 'translation' });
    expect(out).toMatchObject({ text: 'ok2', provider: 'groq', fell_back: true });
  });

  it('a provider over its per-minute limit is skipped', async () => {
    const { svc, store } = setup();
    store.set(`ai:rpm:gemini:${new Date().toISOString().slice(0, 16)}`, { v: '9999', exp: 0 });
    (global as any).fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok2' } }] }) });
    const out: any = await svc.generate({ prompt: 'translate x', feature: 'translation' });
    expect(out.provider).toBe('groq');
  });

  it('stores API keys encrypted and masks them in listings', async () => {
    const { svc, updated } = setup();
    await svc.updateProvider('groq', { api_key: 'q-NEW' } as any);
    const set = updated[updated.length - 1].u.$set;
    expect(String(set.api_key)).toMatch(/^enc:/);
    expect(String(set.api_key)).not.toContain('q-NEW');
    const listed: any = await svc.listProviders();
    const groq = listed.providers.find((p: any) => p.key === 'groq');
    expect(JSON.stringify(groq)).not.toContain('q-key');
    expect(groq.has_key).toBe(true);
  });

  it('strips names, phones and IDs before calling the provider', async () => {
    const { svc } = setup();
    const bodies: any[] = [];
    (global as any).fetch = jest.fn(async (_u: any, o: any) => {
      bodies.push(JSON.parse(o.body).messages[0].content);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'done' } }] }) };
    });
    await svc.generate({ prompt: 'My name is Ahmed Obaid, phone +966501234567, iqama 1234567890', feature: 'triage' });
    const sent = bodies.map((b) => JSON.stringify(b)).join(' ');
    expect(sent).not.toContain('Ahmed Obaid');
    expect(sent).not.toContain('+966501234567');
    expect(sent).not.toContain('1234567890');
  });

  it('caches identical translation requests', async () => {
    const { svc } = setup();
    // NOTE: the global fetch mock also intercepts the Gemini SDK's internal
    // fetch, so only groq-bound calls are counted here.
    const fetch = jest.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 't' } }] }) }));
    (global as any).fetch = fetch;
    const first: any = await svc.generate({ prompt: 'hello', feature: 'translation', cacheTtlSec: 3600 } as any);
    const second: any = await svc.generate({ prompt: 'hello', feature: 'translation', cacheTtlSec: 3600 } as any);
    expect(second.cached).toBe(true);
    expect(second.text).toBe(first.text);
    const groqCalls = fetch.mock.calls.filter((c: any[]) => String(c[0]).includes('groq'));
    expect(groqCalls).toHaveLength(1);
  });

  it('testKey probes a key without storing it', async () => {
    const { svc, updated } = setup();
    (global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({ models: [{ id: 'm' }] }) }));
    const out: any = await svc.testKey('groq', 'probe-key');
    expect(out.ok).toBe(true);
    expect(updated).toHaveLength(0);
  });

  it('health answers carry the medical disclaimer', async () => {
    const { svc } = setup();
    (global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'rest' } }] }) }));
    const out: any = await svc.generate({ prompt: 'fever?', feature: 'triage', health: true } as any);
    expect(out.text).toContain('ليست تشخيصاً');
  });
});
