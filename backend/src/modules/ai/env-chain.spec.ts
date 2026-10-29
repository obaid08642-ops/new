import { isQuotaBody, cleanModelId, chainCallerFromEnv, envChainProviders, providerCallersFromEnv, providerVariableNames, RegistryRecord } from './env-chain';
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
    { key: 'openrouter', model: 'google/gemma-4-31b-it:free', base_url: 'https://openrouter.ai/api/v1' },
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

/** 2026-10-29: groq, gemini and cerebras answered 404 because the model ids were retired; OpenAI answered 429 insufficient_quota (not a rate limit); OpenRouter 402 on paid models. */
describe('retired models, empty accounts, free-only OpenRouter', () => {
  const res = (status: number, body: unknown = {}, text = '') => ({ ok: status < 300, status, json: async () => body, text: async () => text, body: { cancel: async () => undefined } });
  const chat = (content: string) => res(200, { choices: [{ message: { content } }] });

  it('a 404 lists the provider models with the same key, retries once with the first preferred one, and keeps it', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string, init: { body?: string }) => {
      if (url.endsWith('/models')) return res(200, { data: [{ id: 'llama-3.1-8b-instant' }, { id: 'other' }] });
      const model = JSON.parse(init.body as string).model as string;
      calls.push(model);
      return model === 'llama-3.3-70b-versatile' ? res(404) : chat('ok');
    }) as unknown as typeof fetch;
    const [groq] = providerCallersFromEnv({ GROQ_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'groq', model: 'llama-3.3-70b-versatile' }] });
    await expect(groq.call('hi')).resolves.toBe('ok');
    expect(groq.model()).toBe('llama-3.1-8b-instant');
    await groq.call('again');
    expect(calls).toEqual(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.1-8b-instant']);   // the second call does not 404 again
  });

  it('when the list has nothing usable the 404 stays a 404 (no endless retry)', async () => {
    const fetchImpl = (async (url: string) => (url.endsWith('/models') ? res(200, { data: [{ id: 'unrelated' }] }) : res(404))) as unknown as typeof fetch;
    const [groq] = providerCallersFromEnv({ GROQ_API_KEY: 'k' }, { fetchImpl });
    await expect(groq.call('hi')).rejects.toThrow('groq_http_404');
  });

  it('Gemini: 404 -> models list -> generateContent with the new model', async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      if (url.includes('/v1beta/models?')) return res(200, { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
      return url.includes('gemini-2.0-flash:') ? res(404) : res(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
    }) as unknown as typeof fetch;
    const [g] = providerCallersFromEnv({ GEMINI_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'gemini', model: 'gemini-2.0-flash' }] });
    await expect(g.call('hi')).resolves.toBe('ok');
    expect(urls[urls.length - 1]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  });

  it('OpenRouter never starts from a paid model', async () => {
    const models: string[] = [];
    const fetchImpl = (async (_u: string, init: { body: string }) => { models.push(JSON.parse(init.body).model); return chat('ok'); }) as unknown as typeof fetch;
    const [or] = providerCallersFromEnv({ OPENROUTER_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' }] });
    await or.call('hi');
    expect(models[0].endsWith(':free')).toBe(true);
  });

  it('a 429 whose body says insufficient_quota is its own code; a plain 429 stays a rate limit; no body text is kept', async () => {
    const quota = (async () => res(429, {}, '{"error":{"code":"insufficient_quota","message":"You exceeded your current quota sk-SECRET"}}')) as unknown as typeof fetch;
    const rate = (async () => res(429, {}, 'Rate limit reached')) as unknown as typeof fetch;
    const [a] = providerCallersFromEnv({ OPENAI_API_KEY: 'k' }, { fetchImpl: quota });
    const err = (await a.call('x').catch((e) => e)) as Error;
    expect(err.message).toBe('openai_quota_exhausted');
    expect(err.message).not.toContain('SECRET');
    const [b] = providerCallersFromEnv({ OPENAI_API_KEY: 'k' }, { fetchImpl: rate });
    await expect(b.call('x')).rejects.toThrow('openai_http_429');
  });

  it('only the error CODE insufficient_quota is a quota; a Groq rate-limit text that links to billing is a rate limit', () => {
    const groqRate = '{"error":{"message":"Rate limit reached for model `llama-3.1-8b-instant` in organization `org_x` on tokens per minute (TPM): Limit 6000. Visit https://console.groq.com/settings/billing to upgrade your plan.","type":"tokens","code":"rate_limit_exceeded"}}';
    expect(isQuotaBody(groqRate)).toBe(false);
    expect(isQuotaBody('{"error":{"message":"You exceeded your current quota, please check your plan and billing details.","type":"insufficient_quota","code":"insufficient_quota"}}')).toBe(true);
    expect(isQuotaBody('{"error":{"type":"insufficient_quota"}}')).toBe(true);
    expect(isQuotaBody('{"code":"insufficient_quota"}')).toBe(true);
    expect(isQuotaBody('billing quota exceeded')).toBe(false);
    expect(isQuotaBody('')).toBe(false);
  });

  it('a Groq-style 429 stays a rate limit end to end', async () => {
    const body = '{"error":{"message":"Rate limit reached. Visit https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}';
    const fetchImpl = (async () => res(429, {}, body)) as unknown as typeof fetch;
    const [g] = providerCallersFromEnv({ GROQ_API_KEY: 'k' }, { fetchImpl });
    await expect(g.call('x')).rejects.toThrow('groq_http_429');
  });

  it('a stored id with the models/ prefix or spaces is cleaned before it is put in the URL', async () => {
    expect(cleanModelId(' models/gemini-2.5-flash ')).toBe('gemini-2.5-flash');
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => { urls.push(url); return res(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }); }) as unknown as typeof fetch;
    const [g] = providerCallersFromEnv({ GEMINI_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'gemini', model: 'models/gemini-2.5-flash' }] });
    await g.call('hi');
    expect(urls[0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  });

  it('gpt-oss gets reasoning_effort low (so its content is not empty); other models do not', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchImpl = (async (_u: string, init: { body: string }) => { bodies.push(JSON.parse(init.body)); return chat('ok'); }) as unknown as typeof fetch;
    const [a] = providerCallersFromEnv({ GROQ_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'groq', model: 'openai/gpt-oss-20b' }] });
    await a.call('x');
    const [b] = providerCallersFromEnv({ GROQ_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'groq', model: 'llama-3.1-8b-instant' }] });
    await b.call('x');
    expect(bodies[0].reasoning_effort).toBe('low');
    expect(bodies[1].reasoning_effort).toBeUndefined();
  });

  it('a 402 on one model tries the next preferred model the list has before giving up (cerebras gpt-oss-120b -> llama3.1-8b)', async () => {
    const tried: string[] = [];
    const fetchImpl = (async (url: string, init: { body?: string }) => {
      if (url.endsWith('/models')) return res(200, { data: [{ id: 'gpt-oss-120b' }, { id: 'llama3.1-8b' }] });
      const m = JSON.parse(init.body as string).model as string; tried.push(m);
      return m === 'gpt-oss-120b' ? res(402) : chat('ok');
    }) as unknown as typeof fetch;
    const [c] = providerCallersFromEnv({ CEREBRAS_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'cerebras', model: 'gpt-oss-120b' }] });
    await expect(c.call('x')).resolves.toBe('ok');
    expect(c.model()).toBe('llama3.1-8b');
    expect(tried).toEqual(['gpt-oss-120b', 'llama3.1-8b']);
  });

  it('when every candidate is refused the original error is thrown (a real 402 retires the provider upstream)', async () => {
    const fetchImpl = (async (url: string) => (url.endsWith('/models') ? res(200, { data: [{ id: 'llama3.1-8b' }] }) : res(402))) as unknown as typeof fetch;
    const [c] = providerCallersFromEnv({ CEREBRAS_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'cerebras', model: 'gpt-oss-120b' }] });
    await expect(c.call('x')).rejects.toThrow('cerebras_http_402');
  });

  it('when the model list cannot be read the preferred ids are tried directly (Gemini 404 with a key that cannot list)', async () => {
    const tried: string[] = [];
    const fetchImpl = (async (url: string) => {
      if (url.includes('/v1beta/models?')) return res(403);
      tried.push(url);
      return url.includes('gemini-2.5-flash:') ? res(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) : res(404);
    }) as unknown as typeof fetch;
    const [g] = providerCallersFromEnv({ GEMINI_API_KEY: 'k' }, { fetchImpl, registry: [{ key: 'gemini', model: 'gemini-2.0-flash' }] });
    await expect(g.call('x')).resolves.toBe('ok');
    expect(await g.listStatus()).toBe(403);
  });

  it('OpenRouter with a stored arbitrary free model starts from the preferred one; with none of the preferred listed it fails with a fixed code', async () => {
    const models: string[] = [];
    const ok = (async (_u: string, init: { body: string }) => { models.push(JSON.parse(init.body).model); return chat('ok'); }) as unknown as typeof fetch;
    const [a] = providerCallersFromEnv({ OPENROUTER_API_KEY: 'k' }, { fetchImpl: ok, registry: [{ key: 'openrouter', model: 'recursive/flint-v1.0:free' }] });
    await a.call('x');
    expect(models[0]).toBe('google/gemma-4-31b-it:free');
    const none = (async (url: string) => (url.endsWith('/models') ? res(200, { data: [{ id: 'recursive/flint-v1.0:free' }] }) : res(404))) as unknown as typeof fetch;
    const [b] = providerCallersFromEnv({ OPENROUTER_API_KEY: 'k' }, { fetchImpl: none });
    await expect(b.call('x')).rejects.toThrow('openrouter_no_preferred_free_model');
  });
});
