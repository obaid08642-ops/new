import { chainCallerFromEnv, envChainProviders, providerVariableNames } from './env-chain';

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
