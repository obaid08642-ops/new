/**
 * Multi-provider AI abstraction — switch providers WITHOUT code changes.
 *
 * Env contract:
 *   AI_PROVIDER            = gemini | openai | openrouter | groq   (default: gemini)
 *   AI_MODEL               = optional global model override
 *   AI_VISION_MODEL        = optional global vision-model override
 *
 *   GEMINI_API_KEY         (+ GEMINI_MODEL,        default gemini-2.0-flash)
 *   OPENAI_API_KEY         (+ OPENAI_MODEL,        default gpt-4o-mini)
 *   OPENROUTER_API_KEY     (+ OPENROUTER_MODEL,    default meta-llama/llama-3.3-70b-instruct)
 *   GROQ_API_KEY           (+ GROQ_MODEL,          default llama-3.3-70b-versatile
 *                            + GROQ_VISION_MODEL,  default meta-llama/llama-4-scout-17b-16e-instruct)
 *
 * OpenAI / OpenRouter / Groq share the OpenAI-compatible chat-completions
 * API, so one HTTP path serves all three; Gemini keeps its native SDK path
 * (best multimodal support). If a text prompt is sent to a provider whose
 * key is missing, the service automatically falls back to any configured
 * provider (gemini first) so features never hard-fail on misconfiguration.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AiProviderName = 'gemini' | 'openai' | 'openrouter' | 'groq';

export interface AiGenerateOptions {
  prompt: string | any[];
  feature: string;
  imageBase64?: string;
  mimeType?: string;
  jsonExpected?: boolean;
}

export interface AiGenerateResult {
  text: string;
  provider: AiProviderName;
  model: string;
  elapsed_ms: number;
}

const OPENAI_COMPAT: Record<string, { base: string; keyEnv: string; modelEnv: string; defaultModel: string }> = {
  openai: {
    base: 'https://api.openai.com/v1',
    keyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
  },
  openrouter: {
    base: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
  },
  groq: {
    base: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    modelEnv: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile',
  },
};

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger('AiProviderService');
  private genAI: GoogleGenerativeAI | null = null;
  private cachedProvider: { name: AiProviderName; at: number } | null = null;

  constructor(@InjectConnection() private readonly conn: Connection) {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Active provider resolution (runtime, cached 30s):
   *   1. DB flag `ai_provider` (set from the ADMIN dashboard — no deploy needed)
   *   2. AI_PROVIDER env fallback (default gemini)
   */
  get activeProvider(): AiProviderName {
    if (this.cachedProvider && Date.now() - this.cachedProvider.at < 30_000) {
      return this.cachedProvider.name;
    }
    let name: AiProviderName = (process.env.AI_PROVIDER || 'gemini').toLowerCase() as AiProviderName;
    try {
      // NOTE: intentionally fire-and-forget refresh; reads are cheap and cached
      this.conn.collection('featureflags').findOne({ key: 'ai_provider' }).then((doc: any) => {
        if (doc?.value && ['gemini', 'openai', 'openrouter', 'groq'].includes(doc.value)) {
          this.cachedProvider = { name: doc.value, at: Date.now() };
        } else {
          this.cachedProvider = { name, at: Date.now() };
        }
      }).catch(() => {});
    } catch { /* env fallback */ }
    if (!['gemini', 'openai', 'openrouter', 'groq'].includes(name)) name = 'gemini';
    return this.cachedProvider?.name || name;
  }

  /** Admin: switch the active provider at runtime (persists to DB flag). */
  async setActiveProvider(provider: AiProviderName) {
    if (!['gemini', 'openai', 'openrouter', 'groq'].includes(provider)) {
      throw new Error('INVALID_PROVIDER');
    }
    await this.conn.collection('featureflags').updateOne(
      { key: 'ai_provider' },
      { $set: { key: 'ai_provider', value: provider, enabled: true, updatedAt: new Date() } },
      { upsert: true },
    );
    this.cachedProvider = { name: provider, at: Date.now() };
    return { ok: true, active_provider: provider };
  }

  /** Track usage per provider/model/feature for the admin usage report. */
  private trackUsage(provider: AiProviderName, model: string, feature: string, elapsedMs: number, ok: boolean, tokens?: { prompt?: number; completion?: number }) {
    this.conn.collection('ai_usage').insertOne({
      provider, model, feature,
      elapsed_ms: elapsedMs,
      ok,
      prompt_tokens: tokens?.prompt || null,
      completion_tokens: tokens?.completion || null,
      createdAt: new Date(),
    }).catch(() => {});
  }

  /** Admin: usage report grouped by provider/model/feature. */
  async usageReport(days = 7) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    return this.conn.collection('ai_usage').aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { provider: '$provider', model: '$model', feature: '$feature' },
          calls: { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ['$ok', false] }, 1, 0] } },
          avg_ms: { $avg: '$elapsed_ms' },
          prompt_tokens: { $sum: { $ifNull: ['$prompt_tokens', 0] } },
          completion_tokens: { $sum: { $ifNull: ['$completion_tokens', 0] } },
        },
      },
      { $sort: { calls: -1 } },
      { $limit: 50 },
    ]).toArray();
  }

  /** Providers in fallback order: active first, then any other configured one. */
  private providerChain(): AiProviderName[] {
    const chain: AiProviderName[] = [this.activeProvider];
    for (const p of ['gemini', 'openai', 'openrouter', 'groq'] as AiProviderName[]) {
      if (p !== this.activeProvider && this.hasKey(p)) chain.push(p);
    }
    return chain.filter((p) => this.hasKey(p));
  }

  private hasKey(p: AiProviderName): boolean {
    if (p === 'gemini') return !!process.env.GEMINI_API_KEY;
    return !!process.env[OPENAI_COMPAT[p].keyEnv];
  }

  private modelFor(p: AiProviderName, vision = false): string {
    if (vision && process.env.AI_VISION_MODEL) return process.env.AI_VISION_MODEL;
    if (process.env.AI_MODEL) return process.env.AI_MODEL;
    if (p === 'gemini') return process.env.GEMINI_MODEL || (vision ? 'gemini-2.0-flash' : 'gemini-2.0-flash');
    if (vision && p === 'groq') return process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
    return process.env[OPENAI_COMPAT[p].modelEnv] || OPENAI_COMPAT[p].defaultModel;
  }

  /** Unified generation with automatic cross-provider fallback. */
  async generate(opts: AiGenerateOptions): Promise<AiGenerateResult> {
    const chain = this.providerChain();
    if (chain.length === 0) throw new Error('NO_AI_PROVIDER_CONFIGURED');

    let lastErr: any = null;
    for (const provider of chain) {
      const start = Date.now();
      try {
        const text = provider === 'gemini'
          ? await this.generateGemini(opts)
          : await this.generateOpenAiCompat(provider, opts);
        const model = this.modelFor(provider, !!opts.imageBase64);
        this.trackUsage(provider, model, opts.feature, Date.now() - start, true);
        this.logger.log(`[AI][${opts.feature}] provider=${provider} model=${model} time=${Date.now() - start}ms`);
        return { text, provider, model, elapsed_ms: Date.now() - start };
      } catch (e: any) {
        this.trackUsage(provider, this.modelFor(provider, !!opts.imageBase64), opts.feature, Date.now() - start, false);
        this.logger.warn(`[AI][${opts.feature}] provider=${provider} failed: ${e.message}`);
        lastErr = e;
      }
    }
    throw lastErr || new Error('ALL_AI_PROVIDERS_FAILED');
  }

  private async generateGemini(opts: AiGenerateOptions): Promise<string> {
    if (!this.genAI) throw new Error('gemini_not_configured');
    const model = this.genAI.getGenerativeModel({ model: this.modelFor('gemini', !!opts.imageBase64) });
    const payload: any[] = Array.isArray(opts.prompt) ? opts.prompt : [opts.prompt];
    if (opts.imageBase64) {
      payload.push({ inlineData: { data: opts.imageBase64, mimeType: opts.mimeType || 'image/jpeg' } });
    }
    const result = await model.generateContent(payload);
    return result.response.text();
  }

  private async generateOpenAiCompat(provider: AiProviderName, opts: AiGenerateOptions): Promise<string> {
    const conf = OPENAI_COMPAT[provider];
    const apiKey = process.env[conf.keyEnv];
    if (!apiKey) throw new Error(`${provider}_not_configured`);

    const content: any[] = [{ type: 'text', text: Array.isArray(opts.prompt) ? opts.prompt.join('\n') : opts.prompt }];
    if (opts.imageBase64) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:${opts.mimeType || 'image/jpeg'};base64,${opts.imageBase64}` },
      });
    }

    const resp = await fetch(`${conf.base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelFor(provider, !!opts.imageBase64),
        messages: [{ role: 'user', content }],
        temperature: 0.3,
      }),
    });
    if (!resp.ok) throw new Error(`${provider}_http_${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const json: any = await resp.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${provider}_empty_response`);
    return text;
  }

  /** Current runtime config — exposed to the admin config portal. */
  getConfig() {
    return {
      active_provider: this.activeProvider,
      configured: {
        gemini: !!process.env.GEMINI_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        openrouter: !!process.env.OPENROUTER_API_KEY,
        groq: !!process.env.GROQ_API_KEY,
      },
      models: {
        text: this.modelFor(this.activeProvider),
        vision: this.modelFor(this.activeProvider, true),
      },
      switchable_via: 'AI_PROVIDER env (gemini|openai|openrouter|groq) — no code change needed',
    };
  }
}
