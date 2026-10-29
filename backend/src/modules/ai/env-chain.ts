/**
 * The gateway's fallback chain for command-line jobs that have no database (catalogue classify / name fix / product translation).
 * Same provider list, order, models and error codes as `AiGatewayService`; the keys come from the environment only. A job never
 * talks to one hard-wired provider: it tries every provider whose key is set, in priority order, and moves on when one is rejected
 * (401/403), limited (429), down (5xx) or slow; a failing provider is parked in-process for a while.
 */
import { resolveModel, FREE_ONLY, MODEL_PREFERENCE, isFreeModel } from './ai-model-resolver';
import { AiProviderName, DEFAULT_PROVIDERS, NON_CHAT_PROVIDERS, PROVIDER_ENV_KEY, ProviderConfig, providerHttpErrorCode } from './ai-provider-catalog';

export type Caller = (prompt: string) => Promise<string>;

export interface EnvChainOptions {
  /** Model id for the PRIMARY provider only (AI_PROVIDER, else the first in priority): other providers keep their own default model. */
  model?: string;
  /** Test seam / clock. */
  now?: () => number;
  fetchImpl?: typeof fetch;
  /** Per call (default 60 s). A 20-item translation from a slow model (30-60 tokens/s) needs far longer than a chat answer. */
  timeoutMs?: number;
  /** The `ai_providers` records the live gateway uses: its model ids and base URLs win over the built-in defaults (an admin changes them when a provider retires a model). */
  registry?: RegistryRecord[];
}

/** The fields of an `ai_providers` record that decide WHERE and WITH WHAT a call goes (never the key). */
export interface RegistryRecord { key: string; model?: string; base_url?: string; enabled?: boolean }

const CHAT_PROVIDERS = DEFAULT_PROVIDERS.filter((p) => !NON_CHAT_PROVIDERS.has(p.key)).sort((a, b) => a.priority - b.priority);

/** Providers with a key in `env`, in the order they are tried (`AI_PROVIDER` first when it names one). */
export function envChainProviders(env: NodeJS.ProcessEnv, registry: RegistryRecord[] = []): ProviderConfig[] {
  const rec = new Map(registry.map((r) => [r.key, r]));
  const set = CHAT_PROVIDERS
    .filter((p) => String(env[PROVIDER_ENV_KEY[p.key]] || '').trim() !== '' && rec.get(p.key)?.enabled !== false)
    .map((p) => { const r = rec.get(p.key); return r ? { ...p, model: r.model || p.model, base_url: r.base_url || p.base_url } : p; });
  const pinned = String(env.AI_PROVIDER || '').toLowerCase();
  const first = set.find((p) => p.key === pinned);
  return first ? [first, ...set.filter((p) => p !== first)] : set;
}

export function providerVariableNames(): string[] {
  return CHAT_PROVIDERS.map((p) => PROVIDER_ENV_KEY[p.key]);
}

/** A 429 that says the account has no quota/credit left (OpenAI `insufficient_quota`) is not a rate limit: waiting never heals it. Only that one fact is taken from the body; the body itself is never kept. */
const QUOTA_BODY = /insufficient_quota|exceeded your current quota|billing/i;
async function failure(p: ProviderConfig, res: Response): Promise<Error> {
  if (res.status === 429) {
    const text = await res.text().then((t) => t.slice(0, 2000)).catch(() => '');
    if (QUOTA_BODY.test(text)) return new Error(`${p.key}_quota_exhausted`);
    return new Error(providerHttpErrorCode(p.key, 429));
  }
  await res.body?.cancel().catch(() => undefined);
  return new Error(providerHttpErrorCode(p.key, res.status));
}

async function callProvider(p: ProviderConfig, key: string, model: string, prompt: string, f: typeof fetch, timeoutMs = 60_000): Promise<string> {
  if (p.key === 'gemini') {
    const res = await f(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // The response body is never read into an error: a 401 body can carry part of the key.
    if (!res.ok) throw await failure(p, res);
    const body = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return body.candidates?.[0]?.content?.parts?.map((x) => x.text || '').join('') || '';
  }
  const base = p.base_url || 'https://api.openai.com/v1';
  const headers: Record<string, string> = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
  if (p.key === 'openrouter') { headers['HTTP-Referer'] = process.env.API_PUBLIC_URL || 'https://api.nabd.plus'; headers['X-Title'] = 'Nabd'; }
  const res = await f(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw await failure(p, res);
  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content || '';
}

/**
 * One provider's caller that survives a retired model: on a 404 it lists the provider's models with the same key, picks the first preferred one that exists
 * and retries once; the choice is kept for the next calls (`model()`). A free-only provider (OpenRouter) never starts from a paid id.
 */
function modelAwareCall(p: ProviderConfig, key: string, startModel: string, f: typeof fetch, timeoutMs?: number): { call: (prompt: string, ) => Promise<string>; model: () => string } {
  let model = FREE_ONLY.has(p.key) && !isFreeModel(startModel) ? (MODEL_PREFERENCE[p.key]?.[0] ?? startModel) : startModel;
  let resolving: Promise<string> | null = null;
  const call = async (prompt: string): Promise<string> => {
    try {
      return await callProvider(p, key, model, prompt, f, timeoutMs);
    } catch (e) {
      if (!/_http_404$/.test(String((e as Error)?.message || e))) throw e;
      resolving ??= resolveModel(p.key, p.base_url, key, model, f).finally(() => { resolving = null; });
      const next = await resolving.catch(() => null);
      if (!next || next === model) throw e;
      model = next;
      return callProvider(p, key, model, prompt, f, timeoutMs);
    }
  };
  return { call, model: () => model };
}

/** Throws at once when no provider key is set at all (the job says so and stops, nothing is sent). */
export function chainCallerFromEnv(env: NodeJS.ProcessEnv = process.env, opts: EnvChainOptions = {}): Caller {
  const providers = envChainProviders(env, opts.registry);
  if (!providers.length) throw new Error(`no AI provider variable is set (${providerVariableNames().join(', ')}): nothing was sent`);
  const now = opts.now ?? Date.now;
  const f = opts.fetchImpl ?? fetch;
  const parkedUntil = new Map<AiProviderName, number>();
  const callers = new Map(providers.map((p, i) => [p.key, modelAwareCall(p, String(env[PROVIDER_ENV_KEY[p.key]]).trim(), (i === 0 && opts.model) || p.model, f)]));
  return async (prompt) => {
    const failures: string[] = [];
    for (const [i, p] of providers.entries()) {
      if ((parkedUntil.get(p.key) ?? 0) > now()) continue;
      try {
        const text = await callers.get(p.key)!.call(prompt);
        if (!text.trim()) throw new Error(`${p.key}_empty_response`);
        return text;
      } catch (e) {
        const code = String((e as Error)?.message || e).replace(/\s+/g, ' ').slice(0, 60);
        // a rejected key does not heal in minutes; a limit or an outage usually does
        parkedUntil.set(p.key, now() + (code === 'ai_provider_auth_failed' ? 30 * 60_000 : 5 * 60_000));
        failures.push(`${p.key}:${code}`);
      }
    }
    throw new Error(`ai_chain_exhausted: ${failures.join(' ') || 'every provider is parked'}`);
  };
}

/**
 * One caller per provider whose key is set, for jobs that run the providers side by side (each within its own limits) instead of
 * one after the other. A caller throws the same error codes as the chain; it never parks or retries (the job's scheduler does).
 */
export function providerCallersFromEnv(env: NodeJS.ProcessEnv = process.env, opts: EnvChainOptions = {}): Array<{ provider: ProviderConfig; call: Caller; model: () => string }> {
  const providers = envChainProviders(env, opts.registry);
  if (!providers.length) throw new Error(`no AI provider variable is set (${providerVariableNames().join(', ')}): nothing was sent`);
  const f = opts.fetchImpl ?? fetch;
  return providers.map((provider, i) => {
    const key = String(env[PROVIDER_ENV_KEY[provider.key]]).trim();
    const aware = modelAwareCall(provider, key, (i === 0 && opts.model) || provider.model, f, opts.timeoutMs);
    return {
      provider,
      model: aware.model,
      call: async (prompt: string) => {
        const text = await aware.call(prompt);
        if (!text.trim()) throw new Error(`${provider.key}_empty_response`);
        return text;
      },
    };
  });
}
