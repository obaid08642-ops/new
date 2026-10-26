import { AiGatewayService } from './ai-gateway.service';
import { dayKey, monthKey } from './ai-windows';

/** Owner decision 2026-10-26: free plans only. Two chains by capability; windows used up keep a provider out until they reset. */
describe('AI gateway free-tier routing', () => {
  const OLD_ENV = { ...process.env };
  const row = (key: string, priority: number, extra: Record<string, unknown> = {}) => ({
    key, enabled: true, api_key: `k-${key}`, model: `${key}-m`, priority, daily_quota: 0, used_today: 0, usage_date: '',
    base_url: `https://${key}.example.test/v1`, requests_per_minute: 0, reset_tz: 'UTC', ...extra,
  });

  function setup(rows: Array<Record<string, any>>) {
    const docs = rows.map((r) => ({ ...r }));
    const usage: any[] = [];
    const providers = {
      countDocuments: jest.fn(async () => docs.length),
      find: jest.fn(() => ({ sort: () => ({ toArray: async () => docs.map((d) => ({ ...d })).sort((a, b) => a.priority - b.priority) }), toArray: async () => docs })),
      updateOne: jest.fn(async (f: any, u: any) => {
        const d = docs.find((x) => x.key === f.key);
        if (f.reset_tz?.$exists === false && d?.reset_tz !== undefined) return { modifiedCount: 0 }; // the metadata backfill only touches rows without it
        if (d && u.$set && !Array.isArray(u)) Object.assign(d, u.$set);
        return { modifiedCount: 1 };
      }),
    };
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'ai_providers') return providers;
        if (name === 'ai_usage') return { insertOne: jest.fn(async (d: any) => { usage.push(d); return {}; }), aggregate: () => ({ toArray: async () => [] }) };
        if (name === 'featureflags') return { findOne: jest.fn(async () => ({ key: 'ai_mode', value: 'auto' })), updateOne: jest.fn() };
        return { findOne: jest.fn(async () => null), find: () => ({ toArray: async () => [] }) };
      }),
    };
    const svc = new AiGatewayService(conn, undefined as any);
    return { svc, docs, usage };
  }

  const ok = (text: string) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ choices: [{ message: { content: text } }], usage: { total_tokens: 5 } }) });
  const fail = (status: number, h: Record<string, string> = {}) => ({ ok: false, status, headers: { get: (n: string) => h[n.toLowerCase()] ?? null }, body: { cancel: async () => undefined } });
  let calls: string[];
  const mockFetch = (byHost: Record<string, () => unknown> = {}) => {
    calls = [];
    (global as any).fetch = jest.fn(async (url: string) => {
      const host = new URL(url).host.split('.')[0];
      calls.push(host);
      return (byHost[host] ?? (() => ok(`from-${host}`)))();
    });
  };

  beforeEach(() => { delete process.env.AI_KEYS_ENC_KEY; });
  afterEach(() => { process.env = { ...OLD_ENV }; jest.restoreAllMocks(); });

  it('text requests use the providers without vision reservation first, the reserved ones last', async () => {
    mockFetch({ deepseek: () => fail(500), cerebras: () => fail(500), groq: () => fail(500), opencode: () => fail(500), openrouter: () => fail(500) });
    const { svc } = setup([
      row('gemini', 1, { vision_model: 'g-v', reserve_for_vision: true }), row('groq', 2, { vision_model: 'q-v' }),
      row('deepseek', 4), row('openrouter', 5), row('cerebras', 6), row('qwen', 7, { vision_model: 'qw-v', reserve_for_vision: true }), row('opencode', 9),
    ]);
    const gemini = jest.fn(async () => { throw new Error('gemini_down'); });
    (svc as any).generateGemini = gemini;
    await svc.generate({ prompt: 'hello', feature: 'assistant' });
    expect(calls).toEqual(['groq', 'deepseek', 'openrouter', 'cerebras', 'opencode', 'qwen']);
    expect(gemini).toHaveBeenCalledTimes(1); // the reserved Gemini is the very last resort (after qwen it was tried)
  });

  it('vision requests use only vision providers, in priority order', async () => {
    mockFetch({ qwen: () => fail(500) });
    const { svc } = setup([row('gemini', 1, { vision_model: 'g-v', reserve_for_vision: true }), row('deepseek', 4), row('qwen', 7, { vision_model: 'qw-v' }), row('groq', 2, { vision_model: 'q-v' })]);
    // gemini goes through the SDK (not fetch): disable it for this test so the order of the fetch-based ones is visible
    (svc as any).generateGemini = jest.fn(async () => { throw new Error('gemini_down'); });
    await svc.generate({ prompt: 'read', feature: 'prescription_ocr', imageBase64: 'AAAA' });
    expect(calls).toEqual(['groq']);
  });

  it('a used-up day window keeps the provider out until its reset; a new day brings it back', async () => {
    mockFetch();
    const today = dayKey('UTC');
    const { svc, docs } = setup([row('groq', 1, { daily_quota: 3, used_today: 3, usage_date: today }), row('deepseek', 2)]);
    await svc.generate({ prompt: 'a', feature: 't' });
    expect(calls).toEqual(['deepseek']);
    docs[0].usage_date = '2000-01-01'; // the window moved on
    (svc as any).registryCache = null;
    await svc.generate({ prompt: 'b', feature: 't' });
    expect(calls).toEqual(['deepseek', 'groq']);
  });

  it('a used-up month window (requests or tokens) keeps the provider out', async () => {
    mockFetch();
    const month = monthKey('UTC');
    const { svc } = setup([
      row('groq', 1, { requests_per_month: 100, month_requests: 100, month_key: month }),
      row('deepseek', 2, { tokens_per_month: 1000, month_tokens: 1200, month_key: month }),
      row('opencode', 3),
    ]);
    const out = await svc.generate({ prompt: 'a', feature: 't' });
    expect(out.provider).toBe('opencode');
  });

  it('counts the day in the provider zone', async () => {
    mockFetch();
    const pacificToday = dayKey('America/Los_Angeles');
    const { svc } = setup([row('groq', 1, { daily_quota: 1, used_today: 1, usage_date: pacificToday, reset_tz: 'America/Los_Angeles' }), row('deepseek', 2)]);
    expect((await svc.generate({ prompt: 'a', feature: 't' })).provider).toBe('deepseek');
  });

  it('a 429 with Retry-After parks the provider for that wait', async () => {
    mockFetch({ groq: () => fail(429, { 'retry-after': '120' }) });
    const { svc } = setup([row('groq', 1), row('deepseek', 2)]);
    await svc.generate({ prompt: 'a', feature: 't' });
    const until = await (svc as any).parkedUntil('groq');
    expect(until - Date.now()).toBeGreaterThan(110_000);
    expect(until - Date.now()).toBeLessThanOrEqual(120_000);
    await svc.generate({ prompt: 'b', feature: 't' });
    expect(calls.filter((c) => c === 'groq')).toHaveLength(1);
  });

  it('a rejected key (401) is parked for 30 minutes and flagged for the admin; saving a new key clears it', async () => {
    mockFetch({ groq: () => fail(401) });
    const { svc, docs } = setup([row('groq', 1), row('deepseek', 2)]);
    jest.spyOn((svc as any).logger, 'error').mockImplementation(() => undefined);
    await svc.generate({ prompt: 'a', feature: 't' });
    expect(docs[0]).toMatchObject({ needs_attention: true, attention_reason: 'ai_provider_auth_failed' });
    expect((await (svc as any).parkedUntil('groq')) - Date.now()).toBeGreaterThan(29 * 60_000);
    expect((await svc.listProviders()).providers.find((p: any) => p.key === 'groq')).toMatchObject({ needs_attention: true });
    process.env.AI_KEYS_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    await svc.updateProvider('groq', { api_key: 'new-key-value-1234' });
    expect(docs[0].needs_attention).toBe(false);
    expect(await (svc as any).parkedUntil('groq')).toBeNull();
  });

  it('5xx parks only after 2 in a row (a success in between resets the count)', async () => {
    let n = 0;
    mockFetch({ groq: () => (++n % 2 === 0 ? ok('from-groq') : fail(503)) });
    const { svc } = setup([row('groq', 1), row('deepseek', 2)]);
    await svc.generate({ prompt: 'a', feature: 't' }); // groq 503 → deepseek
    expect(await (svc as any).parkedUntil('groq')).toBeNull();
    await svc.generate({ prompt: 'b', feature: 't' }); // groq ok → counter reset
    n = 0;
    await svc.generate({ prompt: 'c', feature: 't' }); // groq 503 (1st again) → deepseek
    expect(await (svc as any).parkedUntil('groq')).toBeNull();

    mockFetch({ groq: () => fail(503) });
    const second = setup([row('groq', 1), row('deepseek', 2)]);
    await second.svc.generate({ prompt: 'a', feature: 't' });
    await second.svc.generate({ prompt: 'b', feature: 't' });
    expect((await (second.svc as any).parkedUntil('groq')) - Date.now()).toBeGreaterThan(290_000);
    await second.svc.generate({ prompt: 'c', feature: 't' });
    expect(calls.filter((c) => c === 'groq')).toHaveLength(2); // parked after the second failure
  });

  it('ai_usage says who served the request and why the others were skipped or failed', async () => {
    mockFetch({ groq: () => fail(429) });
    const { svc, usage } = setup([row('groq', 1), row('deepseek', 2), row('openrouter', 3, { enabled: false }), row('qwen', 4, { api_key: '' }), row('replicate', 5)]);
    await svc.generate({ prompt: 'a', feature: 'assistant' });
    const served = usage.find((u) => u.ok);
    expect(served).toMatchObject({ provider: 'deepseek', served_by: 'deepseek', vision: false });
    expect(served.skipped).toEqual(expect.arrayContaining([
      { provider: 'openrouter', reason: 'disabled' }, { provider: 'qwen', reason: 'no_key' }, { provider: 'replicate', reason: 'not_chat' },
    ]));
    expect(served.failed).toEqual([{ provider: 'groq', code: 'groq_http_429' }]);
  });

  it('the admin view shows chains, day/month usage against the limit, next reset and health', async () => {
    mockFetch();
    const today = dayKey('UTC');
    const { svc } = setup([row('groq', 1, { vision_model: 'v', daily_quota: 10, used_today: 4, usage_date: today, requests_per_month: 200, month_requests: 50, month_key: monthKey('UTC'), last_error_code: 'groq_http_429', limits_source: 'https://example.test/limits', limits_verified: true })]);
    const g: any = (await svc.listProviders()).providers[0];
    expect(g).toMatchObject({ chains: ['vision', 'text'], text_tier: 'preferred', has_key: true, last_error_code: 'groq_http_429', limits_verified: true });
    expect(g.day).toMatchObject({ used: 4, limit: 10 });
    expect(g.month).toMatchObject({ used: 50, limit: 200 });
    expect(new Date(g.day.resets_at).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(g.month.resets_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('recording usage counts the day and the month', async () => {
    mockFetch();
    const { svc } = setup([row('groq', 1)]);
    const spy = jest.spyOn((svc as any).providers, 'updateOne');
    await svc.generate({ prompt: 'a', feature: 't' });
    const pipeline = spy.mock.calls.map((c: any) => c[1]).find((u: any) => Array.isArray(u))[0].$set;
    expect(Object.keys(pipeline)).toEqual(expect.arrayContaining(['used_today', 'month_requests', 'month_tokens', 'month_key']));
  });
});
