/**
 * The AI providers the gateway knows, and where each one's key comes from in the environment. One list for the gateway
 * (registry seed + env sync), the DTOs and the command-line scripts, so a provider is added in one place.
 */
export const AI_PROVIDER_NAMES = ['gemini', 'openai', 'groq', 'cerebras', 'openrouter', 'deepseek', 'qwen', 'replicate', 'opencode'] as const;
export type AiProviderName = (typeof AI_PROVIDER_NAMES)[number];

/** Environment variable that holds each provider's key (`.env.production` on the server). */
export const PROVIDER_ENV_KEY: Readonly<Record<AiProviderName, string>> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  qwen: 'QWEN_API_KEY',
  replicate: 'REPLICATE_API_TOKEN',
  opencode: 'OPENCODE_API_KEY',
};

/**
 * Providers that are registered (key, quota, admin view) but are NOT chat providers, so they never join a text or vision
 * chain: Replicate runs predictions (images), it has no OpenAI-style `/chat/completions`.
 */
export const NON_CHAT_PROVIDERS: ReadonlySet<AiProviderName> = new Set<AiProviderName>(['replicate']);

export interface ProviderConfig {

  key: AiProviderName;
  enabled: boolean;
  api_key: string;
  model: string;
  vision_model?: string;
  priority: number;          // lower = tried first in auto mode
  daily_quota: number;       // requests/day allowed (0 = unlimited)
  used_today: number;
  usage_date: string;        // YYYY-MM-DD for daily reset
  base_url?: string;
  note?: string;
  // P13-R21: free tiers also limit per minute; token budgets cap spend.
  requests_per_minute: number; // 0 = unlimited
  requests_per_day: number;     // 0 = unlimited (in addition to daily_quota)
  tokens_per_day: number;       // 0 = unlimited
  tokens_used_today?: number;
  tokens_usage_date?: string;
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { key: 'gemini', enabled: true, api_key: '', model: 'gemini-2.0-flash', vision_model: 'gemini-2.0-flash', priority: 1, daily_quota: 1500, used_today: 0, usage_date: '', requests_per_minute: 30, requests_per_day: 1500, tokens_per_day: 1000000, note: 'native SDK + vision' },
  { key: 'groq', enabled: true, api_key: '', model: 'llama-3.3-70b-versatile', vision_model: 'meta-llama/llama-4-scout-17b-16e-instruct', priority: 2, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.groq.com/openai/v1', requests_per_minute: 30, requests_per_day: 1000, tokens_per_day: 500000, note: 'fastest inference' },
  { key: 'openai', enabled: true, api_key: '', model: 'gpt-4o-mini', vision_model: 'gpt-4o-mini', priority: 3, daily_quota: 500, used_today: 0, usage_date: '', requests_per_minute: 60, requests_per_day: 10000, tokens_per_day: 2000000 },
  { key: 'deepseek', enabled: true, api_key: '', model: 'deepseek-chat', priority: 4, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://api.deepseek.com/v1', requests_per_minute: 30, requests_per_day: 500, tokens_per_day: 500000 },
  { key: 'openrouter', enabled: true, api_key: '', model: 'meta-llama/llama-3.3-70b-instruct', vision_model: 'openai/gpt-4o-mini', priority: 5, daily_quota: 200, used_today: 0, usage_date: '', base_url: 'https://openrouter.ai/api/v1', requests_per_minute: 20, requests_per_day: 200, tokens_per_day: 200000, note: 'aggregator fallback' },
  { key: 'cerebras', enabled: true, api_key: '', model: 'llama-4-scout-17b-16e-instruct', priority: 6, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.cerebras.ai/v1', requests_per_minute: 30, requests_per_day: 1000, tokens_per_day: 500000 },
  { key: 'qwen', enabled: true, api_key: '', model: 'qwen-plus', vision_model: 'qwen-vl-plus', priority: 7, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', requests_per_minute: 30, requests_per_day: 500, tokens_per_day: 500000 },
  // OpenCode Zen: OpenAI-compatible chat completions (docs: opencode.ai/docs/zen). The docs say the free models are only for the
  // OpenCode client, so this uses a paid model id; the model, quota and limits are editable in the admin.
  { key: 'opencode', enabled: true, api_key: '', model: 'deepseek-v4.1-flash', priority: 9, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://opencode.ai/inference/openai/v1', requests_per_minute: 20, requests_per_day: 500, tokens_per_day: 500000, note: 'OpenCode Zen (OpenAI-compatible); text only' },
  { key: 'replicate', enabled: false, api_key: '', model: 'stability-ai/sdxl', priority: 8, daily_quota: 100, used_today: 0, usage_date: '', requests_per_minute: 10, requests_per_day: 100, tokens_per_day: 0, note: 'image generation only — not a chat provider' },
];


/** Maps a provider HTTP failure to a stable code. 401/403 are `ai_provider_auth_failed`; nothing from the response body is kept. */
export function providerHttpErrorCode(providerKey: string, status: number): string {
  if (status === 401 || status === 403) return 'ai_provider_auth_failed';
  return `${providerKey}_http_${status}`;
}
