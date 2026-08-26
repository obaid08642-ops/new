/**
 * Multi-Provider AI Gateway & Fallback System
 * ─────────────────────────────────────────────────────────────────
 * Central routing layer for every AI feature in the platform.
 *
 * Providers (OpenAI-compatible unless noted):
 *   gemini (native SDK) · openai · groq · cerebras · openrouter · deepseek · qwen · replicate
 *
 * Modes (controlled from the admin dashboard, persisted in DB — no deploys):
 *   auto   — round-robin by priority with automatic fallback on
 *            rate-limit / connection failure / provider disabled
 *   manual — a pinned provider used exclusively
 *
 * Every provider record lives in the `ai_providers` collection:
 *   { key, enabled, api_key, model, vision_model, priority, daily_quota,
 *     used_today, usage_date, base_url }
 * Every request is logged to `ai_usage` (provider, model, feature, ms, ok, fell_back).
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AiProviderName =
  | 'gemini' | 'openai' | 'groq' | 'cerebras' | 'openrouter' | 'deepseek' | 'qwen' | 'replicate';

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
}

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { key: 'gemini', enabled: true, api_key: '', model: 'gemini-2.0-flash', vision_model: 'gemini-2.0-flash', priority: 1, daily_quota: 1500, used_today: 0, usage_date: '', note: 'native SDK + vision' },
  { key: 'groq', enabled: true, api_key: '', model: 'llama-3.3-70b-versatile', vision_model: 'meta-llama/llama-4-scout-17b-16e-instruct', priority: 2, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.groq.com/openai/v1', note: 'fastest inference' },
  { key: 'openai', enabled: true, api_key: '', model: 'gpt-4o-mini', vision_model: 'gpt-4o-mini', priority: 3, daily_quota: 500, used_today: 0, usage_date: '' },
  { key: 'deepseek', enabled: true, api_key: '', model: 'deepseek-chat', priority: 4, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://api.deepseek.com/v1' },
  { key: 'openrouter', enabled: true, api_key: '', model: 'meta-llama/llama-3.3-70b-instruct', vision_model: 'openai/gpt-4o-mini', priority: 5, daily_quota: 200, used_today: 0, usage_date: '', base_url: 'https://openrouter.ai/api/v1', note: 'aggregator fallback' },
  { key: 'cerebras', enabled: true, api_key: '', model: 'llama-4-scout-17b-16e-instruct', priority: 6, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.cerebras.ai/v1' },
  { key: 'qwen', enabled: true, api_key: '', model: 'qwen-plus', vision_model: 'qwen-vl-plus', priority: 7, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { key: 'replicate', enabled: false, api_key: '', model: 'stability-ai/sdxl', priority: 8, daily_quota: 100, used_today: 0, usage_date: '', note: 'image generation only — not a chat provider' },
];

export interface AiGenerateOptions {
  prompt: string | any[];
  feature: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface AiGenerateResult {
  text: string;
  provider: AiProviderName;
  model: string;
  elapsed_ms: number;
  fell_back: boolean;
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger('AiGateway');
  private genAI: GoogleGenerativeAI | null = null;
  private registryCache: { providers: ProviderConfig[]; mode: 'auto' | 'manual'; pinned: AiProviderName | null; at: number } | null = null;

  constructor(@InjectConnection() private readonly conn: Connection) {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  private get providers() { return this.conn.collection('ai_providers'); }
  private get settings() { return this.conn.collection('featureflags'); }

  // ── Registry bootstrap: seed env keys into DB once ──────────────────────
  private async ensureRegistry() {
    const count = await this.providers.countDocuments({});
    if (count > 0) return;
    const envKeys: Record<string, string> = {
      gemini: process.env.GEMINI_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      groq: process.env.GROQ_API_KEY || '',
      cerebras: process.env.CEREBRAS_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || '',
      qwen: process.env.QWEN_API_KEY || '',
      replicate: process.env.REPLICATE_API_TOKEN || '',
    };
    for (const p of DEFAULT_PROVIDERS) {
      await this.providers.updateOne(
        { key: p.key },
        { $set: { ...p, api_key: envKeys[p.key] || '' } },
        { upsert: true },
      );
    }
    await this.settings.updateOne(
      { key: 'ai_mode' },
      { $set: { key: 'ai_mode', value: 'auto', pinned_provider: null, enabled: true } },
      { upsert: true },
    );
    this.logger.log('AI provider registry seeded into DB');
  }

  /** Load registry + mode with a 20s cache. */
  private async loadRegistry(): Promise<{ providers: ProviderConfig[]; mode: 'auto' | 'manual'; pinned: AiProviderName | null }> {
    if (this.registryCache && Date.now() - this.registryCache.at < 20_000) {
      return { providers: this.registryCache.providers, mode: this.registryCache.mode, pinned: this.registryCache.pinned };
    }
    await this.ensureRegistry();
    const providers = (await this.providers.find({}).sort({ priority: 1 }).toArray()) as any[];
    const modeDoc: any = await this.settings.findOne({ key: 'ai_mode' });
    const mode = (modeDoc?.value === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual';
    const pinned = modeDoc?.pinned_provider || null;
    this.registryCache = { providers, mode, pinned, at: Date.now() };
    return { providers, mode, pinned };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Eligible providers in attempt order (auto: priority asc, quota-aware). */
  private async attemptChain(): Promise<ProviderConfig[]> {
    const { providers, mode, pinned } = await this.loadRegistry();
    const today = this.today();
    const usable = (p: ProviderConfig) =>
      p.enabled && p.api_key && (p.daily_quota === 0 || p.usage_date !== today || p.used_today < p.daily_quota);

    if (mode === 'manual' && pinned) {
      const p = providers.find((x: any) => x.key === pinned);
      return p && usable(p) ? [p] : providers.filter(usable);
    }
    return providers.filter(usable);
  }

  /** Unified generation with automatic fallback across the chain. */
  async generate(opts: AiGenerateOptions): Promise<AiGenerateResult> {
    const chain = await this.attemptChain();
    if (chain.length === 0) throw new Error('NO_AI_PROVIDER_AVAILABLE');

    let lastErr: any = null;
    let fellBack = false;
    for (const p of chain) {
      const start = Date.now();
      try {
        const text = p.key === 'gemini'
          ? await this.generateGemini(p, opts)
          : await this.generateOpenAiCompat(p, opts);
        const elapsed = Date.now() - start;
        await this.recordUsage(p, opts.feature, elapsed, true, fellBack);
        return { text, provider: p.key, model: this.modelFor(p, !!opts.imageBase64), elapsed_ms: elapsed, fell_back: fellBack };
      } catch (e: any) {
        const elapsed = Date.now() - start;
        await this.recordUsage(p, opts.feature, elapsed, false, fellBack, e.message?.slice(0, 160));
        const msg = String(e.message || '');
        // Rate limit / quota / connection → move to next provider automatically
        if (/429|rate.?limit|quota|insufficient|timeout|ECONN|ENOTFOUND|503|529|credit/i.test(msg)) {
          this.logger.warn(`[AI-Gateway] ${p.key} failed (${msg.slice(0, 60)}) → fallback`);
          fellBack = true;
          lastErr = e;
          continue;
        }
        // Non-transient errors: still try next but mark fallback
        fellBack = true;
        lastErr = e;
      }
    }
    throw lastErr || new Error('ALL_AI_PROVIDERS_FAILED');
  }

  private modelFor(p: ProviderConfig, vision = false): string {
    return vision ? (p.vision_model || p.model) : p.model;
  }

  private async generateGemini(p: ProviderConfig, opts: AiGenerateOptions): Promise<string> {
    if (!this.genAI) this.genAI = new GoogleGenerativeAI(p.api_key);
    const model = this.genAI.getGenerativeModel({ model: this.modelFor(p, !!opts.imageBase64) });
    const payload: any[] = Array.isArray(opts.prompt) ? opts.prompt : [opts.prompt];
    if (opts.imageBase64) {
      payload.push({ inlineData: { data: opts.imageBase64, mimeType: opts.mimeType || 'image/jpeg' } });
    }
    const result = await model.generateContent(payload);
    return result.response.text();
  }

  private async generateOpenAiCompat(p: ProviderConfig, opts: AiGenerateOptions): Promise<string> {
    const base = p.base_url || 'https://api.openai.com/v1';
    const content: any[] = [{ type: 'text', text: Array.isArray(opts.prompt) ? opts.prompt.join('\n') : opts.prompt }];
    if (opts.imageBase64) {
      content.push({ type: 'image_url', image_url: { url: `data:${opts.mimeType || 'image/jpeg'};base64,${opts.imageBase64}` } });
    }
    const headers: Record<string, string> = { Authorization: `Bearer ${p.api_key}`, 'Content-Type': 'application/json' };
    if (p.key === 'openrouter') {
      headers['HTTP-Referer'] = process.env.API_PUBLIC_URL || 'https://api.nabd.plus';
      headers['X-Title'] = 'Nabd';
    }
    const resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: this.modelFor(p, !!opts.imageBase64), messages: [{ role: 'user', content }], temperature: 0.3 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`${p.key}_http_${resp.status}: ${body.slice(0, 150)}`);
    }
    const json: any = await resp.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${p.key}_empty_response`);
    return text;
  }

  /** Daily-quota-aware usage recording + request log. */
  private async recordUsage(p: ProviderConfig, feature: string, ms: number, ok: boolean, fellBack: boolean, error?: string) {
    const today = this.today();
    await this.providers.updateOne(
      { key: p.key },
      [
        { $set: { used_today: { $cond: [{ $eq: ['$usage_date', today] }, { $add: ['$used_today', 1] }, 1] }, usage_date: today } },
      ] as any,
    ).catch(() => {});
    await this.conn.collection('ai_usage').insertOne({
      provider: p.key, model: this.modelFor(p), feature,
      elapsed_ms: ms, ok, fell_back: fellBack, error: error || null,
      createdAt: new Date(),
    }).catch(() => {});
  }

  // ── Admin management API ────────────────────────────────────────────────
  async listProviders() {
    await this.ensureRegistry();
    const providers = await this.providers.find({}).sort({ priority: 1 }).toArray();
    const modeDoc: any = await this.settings.findOne({ key: 'ai_mode' });
    return {
      mode: modeDoc?.value || 'auto',
      pinned_provider: modeDoc?.pinned_provider || null,
      providers: providers.map((p: any) => ({
        key: p.key, enabled: p.enabled, model: p.model, vision_model: p.vision_model,
        priority: p.priority, daily_quota: p.daily_quota, used_today: p.used_today,
        has_key: !!p.api_key, note: p.note,
      })),
    };
  }

  async updateProvider(key: AiProviderName, patch: Partial<Pick<ProviderConfig, 'enabled' | 'api_key' | 'model' | 'vision_model' | 'daily_quota' | 'priority'>>) {
    await this.ensureRegistry();
    await this.providers.updateOne({ key }, { $set: { ...patch, updatedAt: new Date() } });
    this.registryCache = null;
    return { ok: true, key, patch };
  }

  async setMode(mode: 'auto' | 'manual', pinned?: AiProviderName | null) {
    await this.settings.updateOne(
      { key: 'ai_mode' },
      { $set: { key: 'ai_mode', value: mode, pinned_provider: mode === 'manual' ? (pinned || null) : null, enabled: true, updatedAt: new Date() } },
      { upsert: true },
    );
    this.registryCache = null;
    return { ok: true, mode, pinned_provider: mode === 'manual' ? pinned : null };
  }

  async usageReport(days = 7) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    return this.conn.collection('ai_usage').aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { provider: '$provider', model: '$model', feature: '$feature' },
          calls: { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ['$ok', false] }, 1, 0] } },
          fallbacks: { $sum: { $cond: ['$fell_back', 1, 0] } },
          avg_ms: { $avg: '$elapsed_ms' },
        },
      },
      { $sort: { calls: -1 } },
      { $limit: 60 },
    ]).toArray();
  }
}
