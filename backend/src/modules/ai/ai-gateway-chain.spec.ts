import { AiGatewayService } from './ai-gateway.service';

/** Owner request 2026-10-26: every AI feature falls through the providers in order; vision only through vision-capable ones. */
describe('AI gateway fallback chain', () => {
  const OLD_ENV = { ...process.env };
  const row = (key: string, priority: number, extra: Record<string, unknown> = {}) => ({
    key, enabled: true, api_key: `k-${key}`, model: `${key}-m`, priority, daily_quota: 0, used_today: 0, usage_date: '',
    base_url: `https://${key}.example.test/v1`, requests_per_minute: 0, ...extra,
  });

  function setup(rows: Array<Record<string, any>>) {
    const docs = rows.map((r) => ({ ...r }));
    const providers = {
      countDocuments: jest.fn(async () => docs.length),
      find: jest.fn(() => ({ sort: () => ({ toArray: async () => docs }), toArray: async () => docs })),
      updateOne: jest.fn(async () => ({ modifiedCount: 0 })),
    };
    const usage = { insertOne: jest.fn(async () => ({})) };
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'ai_providers') return providers;
        if (name === 'ai_usage') return usage;
        if (name === 'featureflags') return { findOne: jest.fn(async () => ({ key: 'ai_mode', value: 'auto' })), updateOne: jest.fn() };
        return { findOne: jest.fn(async () => null), find: () => ({ toArray: async () => [] }) };
      }),
    };
    return new AiGatewayService(conn, undefined as any);
  }

  const okBody = (text: string) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }], usage: { total_tokens: 5 } }) });
  const failBody = (status: number) => ({ ok: false, status, body: { cancel: async () => undefined }, json: async () => ({}) });
  let calls: string[];
  const mockFetch = (byHost: Record<string, () => unknown>) => {
    calls = [];
    (global as any).fetch = jest.fn(async (url: string) => {
      const host = new URL(url).host.split('.')[0];
      calls.push(host);
      return (byHost[host] ?? (() => okBody(`from-${host}`)))();
    });
  };

  beforeEach(() => { delete process.env.AI_KEYS_ENC_KEY; });
  afterEach(() => { process.env = { ...OLD_ENV }; jest.restoreAllMocks(); });

  it('falls through 429, 5xx and 401 to the next provider, in priority order', async () => {
    mockFetch({ groq: () => failBody(429), deepseek: () => failBody(503), openrouter: () => failBody(401) });
    const svc = setup([row('groq', 1), row('deepseek', 2), row('openrouter', 3), row('opencode', 4)]);
    const out = await svc.generate({ prompt: 'hi', feature: 't' });
    expect(calls).toEqual(['groq', 'deepseek', 'openrouter', 'opencode']);
    expect(out).toMatchObject({ provider: 'opencode', fell_back: true });
  });

  it('parks a rejected key (401) so the next request does not pay for it again', async () => {
    mockFetch({ groq: () => failBody(401) });
    const svc = setup([row('groq', 1), row('deepseek', 2)]);
    await svc.generate({ prompt: 'one', feature: 't' });
    await svc.generate({ prompt: 'two', feature: 't' });
    expect(calls.filter((c) => c === 'groq')).toHaveLength(1);
    expect(calls.filter((c) => c === 'deepseek')).toHaveLength(2);
  });

  it('a vision request only goes to providers with a vision model', async () => {
    mockFetch({});
    const svc = setup([row('deepseek', 1), row('opencode', 2), row('groq', 3, { vision_model: 'groq-v' })]);
    const out = await svc.generate({ prompt: 'read this', feature: 'prescription_ocr', imageBase64: 'AAAA', mimeType: 'image/png' });
    expect(calls).toEqual(['groq']);
    expect(out.provider).toBe('groq');
  });

  it('a vision request with no vision-capable provider is unavailable, not sent to a text-only one', async () => {
    mockFetch({});
    const svc = setup([row('deepseek', 1), row('opencode', 2)]);
    await expect(svc.generate({ prompt: 'x', feature: 'card_ocr', imageBase64: 'AAAA' })).rejects.toThrow('ai_provider_unavailable');
    expect(calls).toEqual([]);
  });

  it('Replicate (images, not chat) never joins a text chain', async () => {
    mockFetch({});
    const svc = setup([row('replicate', 1), row('groq', 2)]);
    const out = await svc.generate({ prompt: 'hi', feature: 't' });
    expect(calls).toEqual(['groq']);
    expect(out.provider).toBe('groq');
  });

  it('OpenCode is called on its OpenAI-compatible base URL with a bearer key', async () => {
    mockFetch({});
    const svc = setup([row('opencode', 1, { base_url: 'https://opencode.ai/inference/openai/v1' })]);
    await svc.generate({ prompt: 'hi', feature: 't' });
    const [url, init] = ((global as any).fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://opencode.ai/inference/openai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer k-opencode');
  });

  it('the admin view carries last ok, last error code, quota and vision support per provider', async () => {
    mockFetch({});
    const svc = setup([row('groq', 1, { vision_model: 'v', last_error_code: 'ai_provider_auth_failed', daily_quota: 10, used_today: 3, usage_date: new Date().toISOString().slice(0, 10) })]);
    const out = await svc.listProviders();
    expect(out.providers[0]).toMatchObject({ key: 'groq', has_key: true, last_error_code: 'ai_provider_auth_failed', quota_remaining: 7, supports_vision: true, chat: true });
  });
});
