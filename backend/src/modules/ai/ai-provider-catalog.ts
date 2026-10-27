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
  // Free-tier windows (owner decision 2026-10-26: every AI feature runs on free plans). The day and the month are counted in
  // `reset_tz` (the provider's own reset zone); a window that is used up keeps the provider out of the chain until it resets.
  requests_per_month?: number;  // 0/absent = not counted by month
  tokens_per_month?: number;    // 0/absent = not counted by month
  reset_tz?: string;            // IANA zone of the provider's daily/monthly reset (default UTC)
  month_requests?: number;
  month_tokens?: number;
  month_key?: string;           // YYYY-MM in reset_tz
  /** Text requests prefer providers WITHOUT this flag, so the vision-capable provider's quota is kept for images. */
  reserve_for_vision?: boolean;
  /** Where the limits above come from (official URL + date), and whether the numbers were read from that page. */
  limits_source?: string;
  limits_verified?: boolean;
  // Health, shown in the admin: a rejected key (401/403) sets needs_attention until a new key is saved or a call succeeds.
  needs_attention?: boolean;
  attention_reason?: string;
  attention_at?: Date;
  last_ok_at?: Date;
  last_error_code?: string;
  last_error_at?: Date;
}

const BASE_PROVIDERS: ProviderConfig[] = [
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

const CHECKED = 'checked 2026-10-26 from the official page';
/**
 * Free-tier facts per provider, from the official documentation (read 2026-10-26 through a page summary, not verbatim; re-check
 * before relying on a number). `limits_verified: true` only where the NUMBERS below were on the official page. Everything else
 * keeps the conservative defaults above and is flagged unverified in the admin: Gemini and Groq publish their per-model free
 * limits only inside their consoles (AI Studio, console.groq.com/settings/limits), so an admin must copy them there.
 */
const LIMIT_META: Partial<Record<AiProviderName, Partial<ProviderConfig>>> = {
  gemini: { reset_tz: 'America/Los_Angeles', reserve_for_vision: true, limits_verified: false, limits_source: `https://ai.google.dev/gemini-api/docs/rate-limits (${CHECKED}): daily quota resets at midnight Pacific; per-model free limits are shown only in AI Studio` },
  groq: { reset_tz: 'UTC', limits_verified: false, limits_source: `https://console.groq.com/docs/rate-limits (${CHECKED}): limits are shown only in console.groq.com/settings/limits; 429 sends retry-after (seconds) and x-ratelimit-reset-requests (duration); the daily reset time is not stated, UTC assumed` },
  openai: { reset_tz: 'UTC', limits_verified: false, limits_source: 'paid provider: limits depend on the account tier' },
  deepseek: { reset_tz: 'UTC', limits_verified: false, limits_source: `https://api-docs.deepseek.com/quick_start/rate_limit (${CHECKED}): concurrency limits only (HTTP 429 when exceeded), no free tier stated` },
  openrouter: { reset_tz: 'UTC', requests_per_minute: 20, requests_per_day: 50, daily_quota: 50, limits_verified: true, limits_source: `https://openrouter.ai/docs/api-reference/limits (${CHECKED}): ':free' models 20 requests/minute and 50/day with under 10 credits bought (1000/day with at least 10); the day is the UTC day` },
  cerebras: { reset_tz: 'UTC', requests_per_minute: 5, requests_per_day: 0, daily_quota: 0, tokens_per_day: 1_000_000, limits_verified: true, limits_source: `https://inference-docs.cerebras.ai/support/rate-limits (${CHECKED}): free trial 5 requests/minute and 1M tokens/day per model; capacity replenishes continuously, so UTC day is a safe approximation` },
  qwen: { reset_tz: 'UTC', reserve_for_vision: true, limits_verified: false, limits_source: `https://www.alibabacloud.com/help/en/model-studio/new-free-quota (${CHECKED}): a one-time free quota per model (typically 1M tokens, 90 days from activation), not a monthly allowance; rate limits not read` },
  opencode: { reset_tz: 'UTC', limits_verified: false, limits_source: `https://opencode.ai/docs/zen (${CHECKED}): pay-as-you-go; the free models are only for the OpenCode client; rate limits not stated` },
  replicate: { reset_tz: 'UTC', limits_verified: false, limits_source: `https://replicate.com/docs/topics/predictions/rate-limits (${CHECKED}): no free tier; not a chat provider` },
};

export const DEFAULT_PROVIDERS: ProviderConfig[] = BASE_PROVIDERS.map((p) => ({ ...p, ...LIMIT_META[p.key] }));

/** Maps a provider HTTP failure to a stable code. 401/403 are `ai_provider_auth_failed`; nothing from the response body is kept. */
export function providerHttpErrorCode(providerKey: string, status: number): string {
  if (status === 401 || status === 403) return 'ai_provider_auth_failed';
  return `${providerKey}_http_${status}`;
}
