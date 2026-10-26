/**
 * The gateway's fallback chain for command-line jobs that have no database (catalogue classify / name fix / product translation).
 * Same provider list, order, models and error codes as `AiGatewayService`; the keys come from the environment only. A job never
 * talks to one hard-wired provider: it tries every provider whose key is set, in priority order, and moves on when one is rejected
 * (401/403), limited (429), down (5xx) or slow; a failing provider is parked in-process for a while.
 */
import { AiProviderName, DEFAULT_PROVIDERS, NON_CHAT_PROVIDERS, PROVIDER_ENV_KEY, ProviderConfig, providerHttpErrorCode } from './ai-provider-catalog';

export type Caller = (prompt: string) => Promise<string>;

export interface EnvChainOptions {
  /** Model id for the PRIMARY provider only (AI_PROVIDER, else the first in priority): other providers keep their own default model. */
  model?: string;
  /** Test seam / clock. */
  now?: () => number;
  fetchImpl?: typeof fetch;
}

const CHAT_PROVIDERS = DEFAULT_PROVIDERS.filter((p) => !NON_CHAT_PROVIDERS.has(p.key)).sort((a, b) => a.priority - b.priority);

/** Providers with a key in `env`, in the order they are tried (`AI_PROVIDER` first when it names one). */
export function envChainProviders(env: NodeJS.ProcessEnv): ProviderConfig[] {
  const set = CHAT_PROVIDERS.filter((p) => String(env[PROVIDER_ENV_KEY[p.key]] || '').trim() !== '');
  const pinned = String(env.AI_PROVIDER || '').toLowerCase();
  const first = set.find((p) => p.key === pinned);
  return first ? [first, ...set.filter((p) => p !== first)] : set;
}

export function providerVariableNames(): string[] {
  return CHAT_PROVIDERS.map((p) => PROVIDER_ENV_KEY[p.key]);
}

async function callProvider(p: ProviderConfig, key: string, model: string, prompt: string, f: typeof fetch): Promise<string> {
  if (p.key === 'gemini') {
    const res = await f(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
      signal: AbortSignal.timeout(60_000),
    });
    // The response body is never read into an error: a 401 body can carry part of the key.
    if (!res.ok) { await res.body?.cancel().catch(() => undefined); throw new Error(providerHttpErrorCode(p.key, res.status)); }
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
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { await res.body?.cancel().catch(() => undefined); throw new Error(providerHttpErrorCode(p.key, res.status)); }
  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content || '';
}

/** Throws at once when no provider key is set at all (the job says so and stops, nothing is sent). */
export function chainCallerFromEnv(env: NodeJS.ProcessEnv = process.env, opts: EnvChainOptions = {}): Caller {
  const providers = envChainProviders(env);
  if (!providers.length) throw new Error(`no AI provider variable is set (${providerVariableNames().join(', ')}): nothing was sent`);
  const now = opts.now ?? Date.now;
  const f = opts.fetchImpl ?? fetch;
  const parkedUntil = new Map<AiProviderName, number>();
  return async (prompt) => {
    const failures: string[] = [];
    for (const [i, p] of providers.entries()) {
      if ((parkedUntil.get(p.key) ?? 0) > now()) continue;
      const key = String(env[PROVIDER_ENV_KEY[p.key]]).trim();
      const model = (i === 0 && opts.model) || p.model;
      try {
        const text = await callProvider(p, key, model, prompt, f);
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
