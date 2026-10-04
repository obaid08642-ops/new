/**
 * Multi-Provider AI Gateway & Fallback System — SINGLE gateway (13.R21).
 * ─────────────────────────────────────────────────────────────────
 * Central routing layer for every AI feature in the platform. This is the
 * ONLY provider orchestrator: the old `ai-provider.service.ts` (4-provider,
 * env-only) was folded in here and now survives only as a thin deprecated
 * re-export so stale imports don't break.
 *
 * Providers (OpenAI-compatible unless noted):
 *   gemini (native SDK) · openai · groq · cerebras · openrouter · deepseek · qwen · replicate
 *
 * Modes (controlled from the admin dashboard, persisted in DB — no deploys):
 *   auto   — priority order with automatic fallback on
 *            rate-limit / 5xx / timeout / provider disabled / quota hit
 *   manual — a pinned provider used exclusively (falls back to the chain only
 *            when the pinned provider is unusable, so features never hard-fail)
 *
 * Per-feature pin: `purpose_overrides.{feature} = provider` puts that provider
 * first for one feature; the full chain stays behind it for fallback.
 *
 * Every provider record lives in the `ai_providers` collection:
 *   { key, enabled, api_key, model, vision_model, priority, daily_quota,
 *     used_today, usage_date, base_url,
 *     req_per_min?, req_per_day?, tokens_per_day? }
 *
 * In-memory guards (this process only — cheap, no extra infra):
 *   limiter buckets  → req/min, req/day, tokens/day per provider
 *   cooldowns        → a provider that 429/5xx/times-out is skipped for
 *                      COOLDOWN_MS, then the priority order automatically
 *                      returns to it when the window resets
 *   response cache   → identical requests (sanitised text + feature + chain
 *                      signature) served from memory for CACHE_TTL_MS
 *
 * Privacy: prompt TEXT is passed through stripPii() (phones, e-mails,
 * national-ID/Iqama-style digit runs, `label: value` PII fields) before it
 * leaves the process. Images (vision base64) are passed through untouched —
 * blurring/redacting image PII is DEFERRED (needs a vision redaction pass).
 *
 * DEFERRED (deliberately out of scope for 13.R21 — noted, not forgotten):
 *   - encryption-at-rest for stored api_keys (needs KMS/vault integration)
 *   - live provider calls (no keys in this environment) — transports are
 *     injectable (setTransportForTests) and specs use mocked transports
 *   - distributed quotas (in-memory limiter is per-process; a Redis counter
 *     is needed when running >1 replica)
 */
import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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
  daily_quota: number;       // requests/day allowed (0 = unlimited, DB-level)
  used_today: number;
  usage_date: string;        // YYYY-MM-DD for daily reset
  base_url?: string;
  note?: string;
  // Fine-grained limits (0/undefined = fall back to DEFAULT_LIMITS below).
  req_per_min?: number;
  req_per_day?: number;
  tokens_per_day?: number;
}

export interface ProviderLimits {
  reqPerMin: number;
  reqPerDay: number;
  tokensPerDay: number;
}

/** Process defaults when a provider record carries no explicit limits. */
export const DEFAULT_LIMITS: ProviderLimits = {
  reqPerMin: 60,
  reqPerDay: 1000,
  tokensPerDay: 200_000,
};

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
  cached?: boolean;
}

/** Injectable transport so specs exercise routing without live provider keys. */
export type GatewayTransport = (
  p: ProviderConfig,
  opts: AiGenerateOptions,
  signal: AbortSignal,
) => Promise<string>;

/** In-memory per-provider limiter bucket (per-process; see DEFERRED note). */
export interface LimiterBucket {
  minuteStart: number;
  minuteCount: number;
  day: string;
  dayCount: number;
  tokensDayDate: string;
  tokensDay: number;
  cooldownUntil: number;
}

interface CacheEntry {
  text: string;
  provider: AiProviderName;
  model: string;
  at: number;
}

function promptText(prompt: string | any[]): string {
  return Array.isArray(prompt) ? prompt.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n') : String(prompt ?? '');
}

/** Tiny non-crypto hash for cache keys (FNV-1a). Collisions only cost a wrong cache hit window — TTL bounds the blast radius. */
export function hashKey(input: string): string {
  const s = String(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

/**
 * Strip direct identifiers from outbound prompt text (heuristic, best-effort).
 * Covers: e-mails, phone runs (incl. +966 / 05xxxxxxxx), 10-digit
 * national-ID/Iqama runs, and `label: value` PII fields (name, phone, MRN…).
 * NOT covered: names without a label, IDs inside images — see DEFERRED note.
 */
export function stripPii(text: string): string {
  if (!text) return text;
  let out = text;
  // Start only at the beginning of a run of e-mail characters: retrying from every position
  // inside a long run made this quadratic (a 200k-char prompt blocked the event loop ~43 s).
  out = out.replace(/(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
  out = out.replace(
    /(name|patient|full name|phone|mobile|tel|telephone|mrn|file no|national id|nid|iqama|id number|id no|\bid)\s*[:=]\s*[^\n,;]+/gi,
    '$1: [redacted]',
  );
  out = out.replace(/\+?\d[\d\s\-()]{7,}\d/g, (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15 ? '[redacted-phone]' : m;
  });
  out = out.replace(/\b\d{9,12}\b/g, '[redacted-id]');
  return out;
}

/** Transient → fail over to the next provider (429 / 5xx / timeout / network). */
export function isTransientError(e: any): boolean {
  const msg = String(e?.message || '');
  return /429|408|425|5\d\d|rate.?limit|quota|insufficient|credit|overloaded|timeout|timed out|timedout|abort|econn|enotfound|eai_again|socket|etimedout|unavailable|bad gateway|service unavailable|fetch failed|network/i.test(msg);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: any;
  const gate = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BadGatewayException('ai_upstream_timeout')), ms);
  });
  return Promise.race([promise, gate]).finally(() => clearTimeout(timer)) as Promise<T>;
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger('AiGateway');
  private genAI: GoogleGenerativeAI | null = null;
  private registryCache: { providers: ProviderConfig[]; mode: 'auto' | 'manual'; pinned: AiProviderName | null; purposeOverrides: Record<string, string>; at: number } | null = null;

  // In-memory guards (per-process).
  private limiter = new Map<string, LimiterBucket>();
  private responseCache = new Map<string, CacheEntry>();
  private transportOverride: GatewayTransport | null = null;
  private callTimeoutMs = 30_000;
  private cooldownMs = 60_000;
  private cacheTtlMs = 5 * 60_000;

  constructor(@InjectConnection() private readonly conn: Connection) {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  // ── Test / tuning hooks (no-ops in production wiring) ─────────────────────
  /** @internal specs only — replace live transports with mocked ones. */
  setTransportForTests(fn: GatewayTransport | null) { this.transportOverride = fn; }
  /** @internal specs only */
  setGuardTuning(t: { callTimeoutMs?: number; cooldownMs?: number; cacheTtlMs?: number }) {
    if (t.callTimeoutMs) this.callTimeoutMs = t.callTimeoutMs;
    if (t.cooldownMs) this.cooldownMs = t.cooldownMs;
    if (t.cacheTtlMs) this.cacheTtlMs = t.cacheTtlMs;
  }
  /** @internal specs only */
  clearGuardsForTests() { this.limiter.clear(); this.responseCache.clear(); }

  private get providers() { return this.conn.collection('ai_providers'); }
  private get settings() { return this.conn.collection('featureflags'); }

  limitsFor(p: ProviderConfig): ProviderLimits {
    return {
      reqPerMin: p.req_per_min && p.req_per_min > 0 ? p.req_per_min : DEFAULT_LIMITS.reqPerMin,
      reqPerDay: p.req_per_day && p.req_per_day > 0 ? p.req_per_day : DEFAULT_LIMITS.reqPerDay,
      tokensPerDay: p.tokens_per_day && p.tokens_per_day > 0 ? p.tokens_per_day : DEFAULT_LIMITS.tokensPerDay,
    };
  }

  private bucketFor(key: string): LimiterBucket {
    let b = this.limiter.get(key);
    if (!b) {
      b = { minuteStart: Date.now(), minuteCount: 0, day: this.today(), dayCount: 0, tokensDayDate: this.today(), tokensDay: 0, cooldownUntil: 0 };
      this.limiter.set(key, b);
    }
    return b;
  }

  private inCooldown(p: ProviderConfig): boolean {
    return (this.limiter.get(p.key)?.cooldownUntil || 0) > Date.now();
  }

  private markCooldown(p: ProviderConfig) {
    this.bucketFor(p.key).cooldownUntil = Date.now() + this.cooldownMs;
  }

  /** Null = within limits; otherwise a short reason (used for skip + logs). */
  checkLimits(p: ProviderConfig, estTokens = 0): string | null {
    const lim = this.limitsFor(p);
    const b = this.bucketFor(p.key);
    const now = Date.now();
    if (now - b.minuteStart >= 60_000) { b.minuteStart = now; b.minuteCount = 0; }
    const today = this.today();
    if (b.day !== today) { b.day = today; b.dayCount = 0; }
    if (b.tokensDayDate !== today) { b.tokensDayDate = today; b.tokensDay = 0; }
    if (b.minuteCount >= lim.reqPerMin) return 'req_per_min';
    if (b.dayCount >= lim.reqPerDay) return 'req_per_day';
    if (b.tokensDay + estTokens > lim.tokensPerDay) return 'tokens_per_day';
    return null;
  }

  private consumeRequest(p: ProviderConfig) {
    const b = this.bucketFor(p.key);
    b.minuteCount += 1;
    b.dayCount += 1;
  }

  private consumeTokens(p: ProviderConfig, n: number) {
    this.bucketFor(p.key).tokensDay += n;
  }

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
  private async loadRegistry(): Promise<{ providers: ProviderConfig[]; mode: 'auto' | 'manual'; pinned: AiProviderName | null; purposeOverrides: Record<string, string> }> {
    if (this.registryCache && Date.now() - this.registryCache.at < 20_000) {
      return { providers: this.registryCache.providers, mode: this.registryCache.mode, pinned: this.registryCache.pinned, purposeOverrides: this.registryCache.purposeOverrides };
    }
    await this.ensureRegistry();
    const providers = (await this.providers.find({}).sort({ priority: 1 }).toArray()) as any[];
    const modeDoc: any = await this.settings.findOne({ key: 'ai_mode' });
    const mode = (modeDoc?.value === 'manual' ? 'manual' : 'auto') as 'auto' | 'manual';
    const pinned = modeDoc?.pinned_provider || null;
    const purposeOverrides = (modeDoc?.purpose_overrides && typeof modeDoc.purpose_overrides === 'object') ? modeDoc.purpose_overrides : {};
    this.registryCache = { providers, mode, pinned, purposeOverrides, at: Date.now() };
    return { providers, mode, pinned, purposeOverrides };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Eligible providers in attempt order (auto: priority asc, quota/cooldown-aware). */
  private async attemptChain(feature?: string): Promise<{ chain: ProviderConfig[]; degraded: boolean }> {
    const { providers, mode, pinned, purposeOverrides } = await this.loadRegistry();
    const today = this.today();
    // DB-level eligibility (enabled + key + daily quota).
    const baseUsable = (p: ProviderConfig) =>
      p.enabled && !!p.api_key &&
      (p.daily_quota === 0 || p.usage_date !== today || p.used_today < p.daily_quota);
    // Fully eligible right now (also passes in-memory limits + not cooling down).
    const fullyUsable = (p: ProviderConfig) =>
      baseUsable(p) && !this.inCooldown(p) && this.checkLimits(p) === null;
    const orderPinnedFirst = (list: ProviderConfig[], override?: string | null) => {
      if (!override) return list;
      const first = list.find((x: any) => x.key === override);
      return first ? [first, ...list.filter((x: any) => x.key !== override)] : list;
    };

    if (mode === 'manual' && pinned) {
      const p = providers.find((x: any) => x.key === pinned);
      // Pinned provider is respected exclusively while usable; otherwise the
      // full chain preserves automatic fallback so features never hard-fail.
      if (p && fullyUsable(p)) return { chain: [p], degraded: false };
      const rest = providers.filter(fullyUsable);
      return { chain: rest, degraded: true };
    }
    const chain0 = providers.filter(fullyUsable);
    // Per-feature override: pinned provider for this feature goes first,
    // full chain behind it preserves automatic fallback.
    const override = feature && purposeOverrides?.[feature];
    const chain = orderPinnedFirst(chain0, override || null);
    // Degraded when at least one DB-eligible provider was held back by the
    // in-memory guards (quota hit or failover cooldown) — callers surface
    // this via fell_back so dashboards see failover state, and the priority
    // order automatically returns to the held-back provider once its window
    // resets (cooldown expiry / next minute / next day).
    const degraded = providers.some((p) => baseUsable(p) && !fullyUsable(p));
    return { chain, degraded };
  }

  private cacheKeyFor(feature: string, safeText: string, hasImage: boolean, chainSig: string): string {
    return hashKey(`${feature}\n${safeText}\n${hasImage ? 'img' : 'noimg'}\n${chainSig}`);
  }

  /** Unified generation with quota-aware routing, failover, PII strip + cache. */
  async generate(opts: AiGenerateOptions): Promise<AiGenerateResult> {
    const feature = String(opts?.feature || 'general').slice(0, 64);
    const { chain, degraded } = await this.attemptChain(feature);
    if (chain.length === 0) throw new ServiceUnavailableException('ai_provider_unavailable');

    // Sanitise BEFORE anything leaves the process (and before cache keying,
    // so identical raw requests map to one entry).
    const rawText = promptText(opts.prompt);
    const safeText = stripPii(rawText);
    const safeOpts: AiGenerateOptions = { ...opts, feature, prompt: safeText };
    const chainSig = chain.map((p) => p.key).join(',');
    // Q82: an image (insurance card, prescription) is one patient's data — never cache it.
    const cacheable = !opts.imageBase64;
    const ckey = this.cacheKeyFor(feature, safeText, !!opts.imageBase64, chainSig);
    const hit = cacheable ? this.responseCache.get(ckey) : undefined;
    if (hit && Date.now() - hit.at < this.cacheTtlMs) {
      return { text: hit.text, provider: hit.provider, model: hit.model, elapsed_ms: 0, fell_back: false, cached: true };
    }

    const estTokens = Math.ceil(safeText.length / 4);
    let lastErr: any = null;
    let fellBack = degraded;
    for (const p of chain) {
      // Re-check limits at attempt time (a sibling request may have filled the bucket).
      const blocked = this.checkLimits(p, estTokens);
      if (blocked || this.inCooldown(p)) {
        this.logger.warn(`[AI-Gateway] ${p.key} skipped (${blocked || 'cooldown'}) → next`);
        fellBack = true;
        continue;
      }
      this.consumeRequest(p);
      const start = Date.now();
      try {
        const controller = new AbortController();
        const transport = this.transportOverride || ((pp, oo, signal) =>
          pp.key === 'gemini' ? this.generateGemini(pp, oo) : this.generateOpenAiCompat(pp, oo, signal));
        const text = await withTimeout(transport(p, safeOpts, controller.signal), this.callTimeoutMs)
          .finally(() => controller.abort());
        const elapsed = Date.now() - start;
        this.consumeTokens(p, estTokens + Math.ceil(text.length / 4));
        await this.recordUsage(p, feature, elapsed, true, fellBack);
        const model = this.modelFor(p, !!opts.imageBase64);
        if (cacheable) this.remember(ckey, { text, provider: p.key, model, at: Date.now() });
        return { text, provider: p.key, model, elapsed_ms: elapsed, fell_back: fellBack };
      } catch (e: any) {
        const elapsed = Date.now() - start;
        await this.recordUsage(p, feature, elapsed, false, fellBack, e.message?.slice(0, 160));
        if (isTransientError(e)) {
          this.markCooldown(p);
          this.logger.warn(`[AI-Gateway] ${p.key} transient (${String(e.message || '').slice(0, 60)}) → cooldown + fallback`);
        } else {
          this.logger.warn(`[AI-Gateway] ${p.key} failed (${String(e.message || '').slice(0, 60)}) → fallback`);
        }
        fellBack = true;
        lastErr = e;
      }
    }
    if (lastErr instanceof BadGatewayException || lastErr instanceof ServiceUnavailableException) throw lastErr;
    throw new BadGatewayException('ai_upstream_error');
  }

  private remember(key: string, entry: CacheEntry) {
    // Bounded cache: drop the oldest entry past 200.
    if (this.responseCache.size >= 200) {
      const oldest = this.responseCache.keys().next();
      if (!oldest.done) this.responseCache.delete(oldest.value);
    }
    this.responseCache.set(key, entry);
  }

  private modelFor(p: ProviderConfig, vision = false): string {
    return vision ? (p.vision_model || p.model) : p.model;
  }

  private async generateGemini(p: ProviderConfig, opts: AiGenerateOptions): Promise<string> {
    if (!this.genAI) this.genAI = new GoogleGenerativeAI(p.api_key);
    const model = this.genAI.getGenerativeModel({ model: this.modelFor(p, !!opts.imageBase64) });
    const payload: any[] = [opts.prompt];
    if (opts.imageBase64) {
      payload.push({ inlineData: { data: opts.imageBase64, mimeType: opts.mimeType || 'image/jpeg' } });
    }
    const result = await model.generateContent(payload);
    return result.response.text();
  }

  private async generateOpenAiCompat(p: ProviderConfig, opts: AiGenerateOptions, signal?: AbortSignal): Promise<string> {
    const base = p.base_url || 'https://api.openai.com/v1';
    const content: any[] = [{ type: 'text', text: typeof opts.prompt === 'string' ? opts.prompt : promptText(opts.prompt as any) }];
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
      signal: signal || AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new BadGatewayException(`${p.key}_http_${resp.status}: ${body.slice(0, 150)}`);
    }
    const json: any = await resp.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new BadGatewayException(`${p.key}_empty_response`);
    return text;
  }

  /** Daily-quota-aware usage recording + request log (best-effort, never throws). */
  private async recordUsage(p: ProviderConfig, feature: string, ms: number, ok: boolean, fellBack: boolean, error?: string) {
    try {
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
    } catch { /* usage logging must never break generation */ }
  }

  // ── Admin management API ────────────────────────────────────────────────
  async listProviders() {
    await this.ensureRegistry();
    const providers = await this.providers.find({}).sort({ priority: 1 }).toArray();
    const modeDoc: any = await this.settings.findOne({ key: 'ai_mode' });
    return {
      mode: modeDoc?.value || 'auto',
      pinned_provider: modeDoc?.pinned_provider || null,
      purpose_overrides: modeDoc?.purpose_overrides || {},
      providers: providers.map((p: any) => ({
        key: p.key, enabled: p.enabled, model: p.model, vision_model: p.vision_model,
        priority: p.priority, daily_quota: p.daily_quota, used_today: p.used_today,
        req_per_min: p.req_per_min ?? null, req_per_day: p.req_per_day ?? null,
        tokens_per_day: p.tokens_per_day ?? null,
        has_key: !!p.api_key, note: p.note,
      })),
    };
  }

  async updateProvider(key: AiProviderName, patch: Partial<Pick<ProviderConfig, 'enabled' | 'api_key' | 'model' | 'vision_model' | 'daily_quota' | 'priority' | 'req_per_min' | 'req_per_day' | 'tokens_per_day'>>) {
    await this.ensureRegistry();
    const exists = await this.providers.findOne({ key });
    if (!exists) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('ai_provider_not_found');
    }
    await this.providers.updateOne({ key }, { $set: { ...patch, updatedAt: new Date() } });
    this.registryCache = null;
    return { ok: true, key, patch };
  }

  /** Per-feature provider pin (null clears). Fallback chain stays intact behind it. */
  async setPurposeOverride(feature: string, provider: AiProviderName | null) {
    const clean = String(feature || '').trim().slice(0, 64);
    if (!clean) throw new BadRequestException('feature_required');
    if (provider) {
      const exists = await this.providers.findOne({ key: provider });
      if (!exists) throw new NotFoundException('unknown_provider');
    }
    await this.settings.updateOne(
      { key: 'ai_mode' },
      provider ? { $set: { [`purpose_overrides.${clean}`]: provider } } : { $unset: { [`purpose_overrides.${clean}`]: 1 } },
      { upsert: true },
    );
    this.registryCache = null;
    return { ok: true, feature: clean, provider: provider || null };
  }

  async setMode(mode: 'auto' | 'manual', pinned?: AiProviderName | null) {    await this.settings.updateOne(
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
