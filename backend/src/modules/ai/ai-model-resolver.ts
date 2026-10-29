/**
 * When a provider retires a model, every call to it answers 404 although the key and the URL are right (2026-10-29: groq llama-3.3-70b-versatile,
 * gemini-2.0-flash, cerebras llama-4-scout). The provider's own model list says which ids exist today; the first one of a short preference list
 * (current free-tier chat models, best first) that is in the list is used. Nothing here prints a key or a response body.
 */
import type { AiProviderName } from './ai-provider-catalog';

/** Best first. Matched by exact id; a provider with no entry keeps its configured model. These are rankings over the provider's live list, not assumptions that an id exists. */
export const MODEL_PREFERENCE: Partial<Record<AiProviderName, readonly string[]>> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.0-flash-lite'],
  groq: ['llama-3.1-8b-instant', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile'],
  cerebras: ['gpt-oss-120b', 'llama3.1-8b', 'qwen-3-32b', 'llama-3.3-70b', 'llama-4-scout-17b-16e-instruct'],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5-mini'],
  deepseek: ['deepseek-chat'],
  openrouter: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free', 'openai/gpt-oss-20b:free', 'qwen/qwen3-32b:free', 'deepseek/deepseek-chat-v3-0324:free'],
};

/** OpenRouter bills every model that is not free: only ids ending in `:free` are ever used. */
export const FREE_ONLY: ReadonlySet<AiProviderName> = new Set<AiProviderName>(['openrouter']);

export const isFreeModel = (id: string): boolean => id.endsWith(':free');

/** Gemini lists `models/<id>` with the methods each supports; the others list `{data:[{id}]}`. */
export function parseModelList(provider: AiProviderName, body: unknown): string[] {
  const b = (body ?? {}) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>; data?: Array<{ id?: string }> };
  if (provider === 'gemini') {
    return (b.models ?? []).filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m.name ?? '').replace(/^models\//, '')).filter(Boolean);
  }
  return (b.data ?? []).map((m) => String(m.id ?? '')).filter(Boolean);
}

/** The model to use among `available`: the first preferred id that exists; for a free-only provider only `:free` ids qualify, else the first free id listed. null = nothing usable. */
export function pickModel(provider: AiProviderName, available: string[], configured?: string): string | null {
  const free = FREE_ONLY.has(provider);
  const usable = free ? available.filter(isFreeModel) : available;
  const set = new Set(usable);
  for (const id of MODEL_PREFERENCE[provider] ?? []) if (set.has(id)) return id;
  if (configured && set.has(configured)) return configured;
  return free ? (usable[0] ?? null) : null;
}

export function modelsRequest(provider: AiProviderName, baseUrl: string | undefined, key: string): { url: string; headers: Record<string, string> } {
  if (provider === 'gemini') return { url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', headers: { 'x-goog-api-key': key } };
  return { url: `${baseUrl || 'https://api.openai.com/v1'}/models`, headers: { authorization: `Bearer ${key}` } };
}

/** Lists the provider's models and picks one. Throws only the fixed codes `<key>_models_http_<status>` / `<key>_no_usable_model`. */
export async function resolveModel(provider: AiProviderName, baseUrl: string | undefined, key: string, configured: string | undefined, f: typeof fetch, timeoutMs = 20_000): Promise<string> {
  const { url, headers } = modelsRequest(provider, baseUrl, key);
  const res = await f(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) { await res.body?.cancel().catch(() => undefined); throw new Error(`${provider}_models_http_${res.status}`); }
  const picked = pickModel(provider, parseModelList(provider, await res.json()), configured);
  if (!picked) throw new Error(`${provider}_no_usable_model`);
  return picked;
}
