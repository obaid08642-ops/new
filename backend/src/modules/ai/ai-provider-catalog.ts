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
