/**
 * When a provider retires a model, every call to it answers 404 although the key and the URL are right (2026-10-29: groq llama-3.3-70b-versatile,
 * gemini-2.0-flash, cerebras llama-4-scout). The provider's own model list says which ids exist today; the first one of a short preference list
 * (current free-tier chat models, best first) that is in the list is used. Nothing here prints a key or a response body.
 */
import type { AiProviderName } from './ai-provider-catalog';

/** Best first. Matched by exact id; a provider with no entry keeps its configured model. These are rankings over the provider's live list, not assumptions that an id exists. */
export const MODEL_PREFERENCE: Partial<Record<AiProviderName, readonly string[]>> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.0-flash-lite'],
  // non-reasoning chat models first: a reasoning model (gpt-oss, qwen3) can spend its whole token budget thinking and return empty content
  groq: ['llama-3.1-8b-instant', 'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3-32b'],
  cerebras: ['llama3.1-8b', 'llama-3.3-70b', 'llama-4-scout-17b-16e-instruct', 'gpt-oss-120b', 'qwen-3-32b'],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5-mini'],
  deepseek: ['deepseek-chat'],
  // OpenRouter's free chat models on 2026-10-29 (its public list, `:free` ids). Chat-native ones first: the reasoning-first ones answer slowly (79 s) and can come back empty.
  openrouter: ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'poolside/laguna-s-2.1:free', 'poolside/laguna-xs-2.1:free', 'nvidia/nemotron-3.5-lightning:free'],
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

/** The preferred ids that `available` has, best first, minus `exclude`. A free-only provider (OpenRouter) is limited to its preference list: an arbitrary free model is never used. */
export function rankedModels(provider: AiProviderName, available: string[], exclude: ReadonlySet<string> = new Set()): string[] {
  const set = new Set(FREE_ONLY.has(provider) ? available.filter(isFreeModel) : available);
  return (MODEL_PREFERENCE[provider] ?? []).filter((id) => set.has(id) && !exclude.has(id));
}

/** Ids that are not chat models (embeddings, speech, safety classifiers, images, rerankers): never picked by the unlisted-preference fallback. */
const NON_CHAT_ID = /embed|whisper|guard|tts|moderation|audio|rerank|image|transcri|speech/i;

/** The first listed chat model that is not in `exclude`; for a provider whose list has none of its preferred ids. Never for a free-only provider (it could bill). */
export function firstListedChatModel(provider: AiProviderName, available: string[], exclude: ReadonlySet<string> = new Set()): string | null {
  if (FREE_ONLY.has(provider)) return null;
  return available.find((id) => !NON_CHAT_ID.test(id) && !exclude.has(id)) ?? null;
}

/** How many of the provider's preferred ids its list has (a count only). */
export const countPreferredListed = (provider: AiProviderName, available: string[]): number => rankedModels(provider, available).length;

/** The model to use among `available`: the first preferred id it has; else the configured id when it is listed (never for a free-only provider unless preferred). null = nothing usable. */
export function pickModel(provider: AiProviderName, available: string[], configured?: string): string | null {
  const ranked = rankedModels(provider, available);
  if (ranked.length) return ranked[0];
  if (!FREE_ONLY.has(provider) && configured && available.includes(configured)) return configured;
  return null;
}

export function modelsRequest(provider: AiProviderName, baseUrl: string | undefined, key: string): { url: string; headers: Record<string, string> } {
  if (provider === 'gemini') return { url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', headers: { 'x-goog-api-key': key } };
  return { url: `${baseUrl || 'https://api.openai.com/v1'}/models`, headers: { authorization: `Bearer ${key}` } };
}

/** The provider's model ids and the HTTP status of the list call (a number only; no body is kept). ids is null when the call failed. */
export async function fetchModelList(provider: AiProviderName, baseUrl: string | undefined, key: string, f: typeof fetch, timeoutMs = 20_000): Promise<{ status: number; ids: string[] | null }> {
  const { url, headers } = modelsRequest(provider, baseUrl, key);
  try {
    const res = await f(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) { await res.body?.cancel().catch(() => undefined); return { status: res.status, ids: null }; }
    return { status: res.status, ids: parseModelList(provider, await res.json()) };
  } catch {
    return { status: 0, ids: null };
  }
}

/** Lists the provider's models and picks one. Throws only the fixed codes `<key>_models_http_<status>` / `<key>_no_usable_model`. */
export async function resolveModel(provider: AiProviderName, baseUrl: string | undefined, key: string, configured: string | undefined, f: typeof fetch, timeoutMs = 20_000): Promise<string> {
  const { status, ids } = await fetchModelList(provider, baseUrl, key, f, timeoutMs);
  if (!ids) throw new Error(`${provider}_models_http_${status}`);
  const picked = pickModel(provider, ids, configured);
  if (!picked) throw new Error(`${provider}_no_usable_model`);
  return picked;
}
