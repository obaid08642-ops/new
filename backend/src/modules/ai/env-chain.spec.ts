import { chainCallerFromEnv, envChainProviders, providerCallersFromEnv, providerVariableNames, RegistryRecord } from './env-chain';
import { DEFAULT_PROVIDERS, PROVIDER_ENV_KEY } from './ai-provider-catalog';

/** Batch jobs go through the same fallback chain as the gateway (owner request 2026-10-26): no job talks to one hard-wired provider. */
describe('env fallback chain (command-line jobs)', () => {
  const ok = (text: string) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }] }) });
  const bad = (status: number) => ({ ok: false, status, body: { cancel: async () => undefined }, json: async () => ({}) });
  const geminiOk = (text: string) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });

  function fetchBy(hosts: Record<string, () => unknown>) {
    const calls: string[] = [];
    const fetchImpl = jest.fn(async (url: string) => {
      const host = new URL(url).host;
      calls.push(host);
      return (hosts[host] ?? (() => ok(`from-${host}`)))();
    }) as unknown as typeof fetch;
    return { fetchImpl, calls };
  }

  it('says so and stops when no provider key is set', () => {
    expect(() => chainCallerFromEnv({})).toThrow(/no AI provider variable is set \(GEMINI_API_KEY.*OPENCODE_API_KEY.*\)/);
  });

  it('orders providers by priority and puts AI_PROVIDER first; Replicate is not a chat provider', () => {
    const env = { GROQ_API_KEY: 'a', GEMINI_API_KEY: 'b', OPENCODE_API_KEY: 'c', REPLICATE_API_TOKEN: 'd' };
    expect(envChainProviders(env).map((p) => p.key)).toEqual(['gemini', 'groq', 'opencode']);
    expect(envChainProviders({ ...env, AI_PROVIDER: 'opencode' }).map((p) => p.key)).toEqual(['opencode', 'gemini', 'groq']);
    expect(providerVariableNames()).not.toContain('REPLICATE_API_TOKEN');
    expect(providerVariableNames()).toContain('OPENCODE_API_KEY');
  });

  it('falls through 401, 429 and 5xx to the next provider and returns its text', async () => {
    const { fetchImpl, calls } = fetchBy({
      'generativelanguage.googleapis.com': () => bad(429),
      'api.groq.com': () => bad(401),
      'api.deepseek.com': () => bad(503),
    });
    const call = chainCallerFromEnv({ GEMINI_API_KEY: 'a', GROQ_API_KEY: 'b', DEEPSEEK_API_KEY: 'c', OPENCODE_API_KEY: 'd' }, { fetchImpl });
    await expect(call('hi')).resolves.toBe('from-opencode.ai');
    expect(calls).toEqual(['generativelanguage.googleapis.com', 'api.groq.com', 'api.deepseek.com', 'opencode.ai']);
  });

  it('parks a failing provider, then tries it again after the window', async () => {
    let t = 1_000;
    const { fetchImpl, calls } = fetchBy({ 'api.groq.com': () => bad(401) });
    const call = chainCallerFromEnv({ GROQ_API_KEY: 'a', DEEPSEEK_API_KEY: 'b' }, { fetchImpl, now: () => t });
    await call('one');
    await call('two');
    expect(calls.filter((h) => h === 'api.groq.com')).toHaveLength(1);
    t += 31 * 60_000;
    await call('three');
    expect(calls.filter((h) => h === 'api.groq.com')).toHaveLength(2);
  });

  it('applies the model override to the primary provider only', async () => {
    const seen: Array<{ host: string; model?: string }> = [];
    const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
      const host = new URL(url).host;
      seen.push({ host, model: host === 'api.groq.com' ? JSON.parse(String(init?.body)).model : url.split('/models/')[1]?.split(':')[0] });
      return host === 'generativelanguage.googleapis.com' ? bad(429) : ok('x');
    }) as unknown as typeof fetch;
    await chainCallerFromEnv({ GEMINI_API_KEY: 'a', GROQ_API_KEY: 'b' }, { fetchImpl, model: 'my-gemini-model' })('p');
    expect(seen[0].model).toBe('my-gemini-model');
    expect(seen[1].model).not.toBe('my-gemini-model');
  });

  it('an exhausted chain names providers and codes only, never a response body or a key', async () => {
    const key = `k-${'z'.repeat(24)}`;
    const { fetchImpl } = fetchBy({ 'api.groq.com': () => bad(401), 'api.deepseek.com': () => bad(500) });
    const call = chainCallerFromEnv({ GROQ_API_KEY: key, DEEPSEEK_API_KEY: key }, { fetchImpl });
    const err = await call('x').catch((e: Error) => e);
    expect(String((err as Error).message)).toBe('ai_chain_exhausted: groq:ai_provider_auth_failed deepseek:deepseek_http_500');
    expect(String((err as Error).message)).not.toContain(key);
  });

  it('reads Gemini text from the native response and treats an empty reply as a failure', async () => {
    const { fetchImpl } = fetchBy({ 'generativelanguage.googleapis.com': () => geminiOk('   ') });
    const call = chainCallerFromEnv({ GEMINI_API_KEY: 'a', GROQ_API_KEY: 'b' }, { fetchImpl });
    await expect(call('x')).resolves.toBe('from-api.groq.com');
  });
});

/**
 * 2026-10-28: the translation run got HTTP 404 from gemini, groq, deepseek and cerebras while the gateway worked: the per-provider callers used the
 * built-in model ids, the gateway uses the `ai_providers` records. Each caller must hit the same URL with the same model as the gateway does for that record.
 */
describe('per-provider callers go where the gateway goes', () => {
  const ENV = Object.fromEntries(['gemini', 'groq', 'openai', 'deepseek', 'openrouter', 'cerebras'].map((k) => [PROVIDER_ENV_KEY[k as keyof typeof PROVIDER_ENV_KEY], `key-${k}`]));
  // the records an admin changed after the built-in models were retired
  const REGISTRY: RegistryRecord[] = [
    { key: 'gemini', model: 'gemini-2.5-flash' },
    { key: 'groq', model: 'llama-3.1-8b-instant', base_url: 'https://api.groq.com/openai/v1' },
    { key: 'openai', model: 'gpt-4.1-mini' },
    { key: 'deepseek', model: 'deepseek-chat', base_url: 'https://api.deepseek.com/v1' },
    { key: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', base_url: 'https://openrouter.ai/api/v1' },
    { key: 'cerebras', model: 'llama3.1-8b', base_url: 'https://api.cerebras.ai/v1' },
  ];

  async function requestsOf(registry?: RegistryRecord[]) {
    const seen: Record<string, { url: string; model?: string }> = {};
    const fetchImpl = jest.fn(async (url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      const key = Object.keys(seen).length;
      seen[`#${key}`] = { url, model: body.model };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'x' } }], candidates: [{ content: { parts: [{ text: 'x' }] } }] }) };
    }) as unknown as typeof fetch;
    const callers = providerCallersFromEnv(ENV, { fetchImpl, registry });
    const byProvider: Record<string, { url: string; model?: string }> = {};
    for (const { provider, call } of callers) {
      const before = Object.keys(seen).length;
      await call('hi');
      byProvider[provider.key] = seen[`#${before}`];
    }
    return byProvider;
  }

  it('uses the gateway record: gemini models/<model>:generateContent, the others <base_url>/chat/completions with the record model', async () => {
    const got = await requestsOf(REGISTRY);
    expect(got.gemini.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    for (const r of REGISTRY.filter((x) => x.key !== 'gemini')) {
      const base = r.base_url || 'https://api.openai.com/v1';
      expect(got[r.key].url).toBe(`${base}/chat/completions`);
      expect(got[r.key].model).toBe(r.model);
    }
  });

  it('without records it falls back to the built-in catalogue, the same one the gateway seeds', async () => {
    const got = await requestsOf();
    for (const p of DEFAULT_PROVIDERS.filter((x) => got[x.key] && x.key !== 'gemini')) {
      expect(got[p.key].url).toBe(`${p.base_url || 'https://api.openai.com/v1'}/chat/completions`);
      expect(got[p.key].model).toBe(p.model);
    }
  });

  it('a provider the gateway has switched off is not called', () => {
    const keys = providerCallersFromEnv(ENV, { registry: [{ key: 'groq', enabled: false }] }).map((c) => c.provider.key);
    expect(keys).not.toContain('groq');
    expect(keys).toContain('gemini');
  });
});
