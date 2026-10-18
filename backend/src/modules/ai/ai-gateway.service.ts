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
import { BadGatewayException, BadRequestException, Injectable, Logger, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { connectionFlagSource, isKilled } from '../../common/killswitches/killswitches.helper';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RedisService } from '../redis/redis.service';

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
  // P13-R21: free tiers also limit per minute; token budgets cap spend.
  requests_per_minute: number; // 0 = unlimited
  requests_per_day: number;     // 0 = unlimited (in addition to daily_quota)
  tokens_per_day: number;       // 0 = unlimited
  tokens_used_today?: number;
  tokens_usage_date?: string;
}

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { key: 'gemini', enabled: true, api_key: '', model: 'gemini-2.0-flash', vision_model: 'gemini-2.0-flash', priority: 1, daily_quota: 1500, used_today: 0, usage_date: '', requests_per_minute: 30, requests_per_day: 1500, tokens_per_day: 1000000, note: 'native SDK + vision' },
  { key: 'groq', enabled: true, api_key: '', model: 'llama-3.3-70b-versatile', vision_model: 'meta-llama/llama-4-scout-17b-16e-instruct', priority: 2, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.groq.com/openai/v1', requests_per_minute: 30, requests_per_day: 1000, tokens_per_day: 500000, note: 'fastest inference' },
  { key: 'openai', enabled: true, api_key: '', model: 'gpt-4o-mini', vision_model: 'gpt-4o-mini', priority: 3, daily_quota: 500, used_today: 0, usage_date: '', requests_per_minute: 60, requests_per_day: 10000, tokens_per_day: 2000000 },
  { key: 'deepseek', enabled: true, api_key: '', model: 'deepseek-chat', priority: 4, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://api.deepseek.com/v1', requests_per_minute: 30, requests_per_day: 500, tokens_per_day: 500000 },
  { key: 'openrouter', enabled: true, api_key: '', model: 'meta-llama/llama-3.3-70b-instruct', vision_model: 'openai/gpt-4o-mini', priority: 5, daily_quota: 200, used_today: 0, usage_date: '', base_url: 'https://openrouter.ai/api/v1', requests_per_minute: 20, requests_per_day: 200, tokens_per_day: 200000, note: 'aggregator fallback' },
  { key: 'cerebras', enabled: true, api_key: '', model: 'llama-4-scout-17b-16e-instruct', priority: 6, daily_quota: 1000, used_today: 0, usage_date: '', base_url: 'https://api.cerebras.ai/v1', requests_per_minute: 30, requests_per_day: 1000, tokens_per_day: 500000 },
  { key: 'qwen', enabled: true, api_key: '', model: 'qwen-plus', vision_model: 'qwen-vl-plus', priority: 7, daily_quota: 500, used_today: 0, usage_date: '', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', requests_per_minute: 30, requests_per_day: 500, tokens_per_day: 500000 },
  { key: 'replicate', enabled: false, api_key: '', model: 'stability-ai/sdxl', priority: 8, daily_quota: 100, used_today: 0, usage_date: '', requests_per_minute: 10, requests_per_day: 100, tokens_per_day: 0, note: 'image generation only — not a chat provider' },
];

// P13-R21: medical safety footer on health answers (same wording family as
// the assistant). Opt-in via `health: true` so existing feature calls keep
// byte-identical output; the assistant layer carries its own disclaimers.
const HEALTH_DISCLAIMER_AR = 'هذه معلومات توعوية وليست تشخيصاً. راجع الطبيب عند القلق.';
const HEALTH_DISCLAIMER_EN = 'This is health information, not a diagnosis. See a clinician if you are concerned.';

/**
 * P13-R21: strip names, phone numbers and IDs before text leaves for a
 * provider. Heuristic and documented: emails, international/Saudi phones,
 * 10-digit national-ID shapes and Latin-script multi-word proper names are
 * masked; Arabic prose passes through otherwise untouched.
 */
export function stripPII(text: string): string {
  let out = String(text || '');
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  out = out.replace(/\+?\d[\d\s\-.()]{7,}\d/g, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) return '[phone]';
    return m;
  });
  out = out.replace(/(?<![\d.])\d{10}(?![\d.])/g, '[id]');
  out = out.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, '[name]');
  return out;
}

/** P13-R21: AES-256-GCM key wrap (key from AI_KEYS_ENC_KEY, base64 32B). */
const ENC_PREFIX = 'enc:';
function encKey(): Buffer {
  const raw = String(process.env.AI_KEYS_ENC_KEY || '');
  const buf = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (buf.length !== 32) throw new BadRequestException('keys_encryption_unavailable');
  return buf;
}
export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const body = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `${ENC_PREFIX}${iv.toString('base64')}.${body.toString('base64')}.${cipher.getAuthTag().toString('base64')}`;
}
export function decryptApiKey(stored: string): string {
  const s = String(stored || '');
  if (!s.startsWith(ENC_PREFIX)) return s; // legacy plaintext rows (migration note in PR)
  const [ivB64, bodyB64, tagB64] = s.slice(ENC_PREFIX.length).split('.');
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(bodyB64, 'base64')), decipher.final()]).toString('utf8');
}

function withTimeout<T>(p: Promise<T>, ms: number, code: string): Promise<T> {
  let timer: any;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new BadGatewayException(code)), ms);
  });
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout]) as Promise<T>;
}

export interface AiGenerateOptions {
  prompt: string | any[];
  feature: string;
  imageBase64?: string;
  mimeType?: string;
  /** P13-R21: append the medical safety footer to the output. */
  health?: boolean;
  /** P13-R21: cache identical requests for this many seconds (e.g. translations). */
  cacheTtlSec?: number;
}

export interface AiGenerateResult {
  text: string;
  provider: AiProviderName;
  model: string;
  elapsed_ms: number;
  fell_back: boolean;
  cached?: boolean;
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger('AiGateway');
  private registryCache: { providers: ProviderConfig[]; mode: 'auto' | 'manual'; pinned: AiProviderName | null; purposeOverrides: Record<string, string>; at: number } | null = null;
  // P13-R21: process-local fallback when Redis is absent (single-node only;
  // Redis is the source of truth in multi-node deploys).
  private readonly mem = new Map<string, { v: string; exp: number }>();

  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private async kvIncr(key: string): Promise<number> {
    if (this.redis) {
      try { return await this.redis.incr(key); } catch { /* fall through to memory */ }
    }
    const cur = Number(this.mem.get(key)?.v || 0) + 1;
    this.mem.set(key, { v: String(cur), exp: 0 });
    return cur;
  }

  private async kvExpire(key: string, seconds: number): Promise<void> {
    if (this.redis) {
      try { await this.redis.expire(key, seconds); return; } catch { /* memory has no TTL sweeper; counts reset per window key below */ }
    }
  }

  private async kvGet(key: string): Promise<string | null> {
    if (this.redis) {
      try {
        const v = await this.redis.get(key);
        if (v !== null) return v;
      } catch { /* fall through */ }
    }
    return this.mem.get(key)?.v ?? null;
  }

  private async kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.redis) {
      try { await this.redis.set(key, value, ttlSeconds); return; } catch { /* fall through */ }
    }
    this.mem.set(key, { v: value, exp: 0 });
  }

  private get providers() { return this.conn.collection('ai_providers'); }
  private get settings() { return this.conn.collection('featureflags'); }

  // ── Registry bootstrap: seed env keys into DB once ──────────────────────
  private legacyKeysMigrated = false;

  /**
   * 16.1: rows saved before P13-R21 (or seeded without AI_KEYS_ENC_KEY) hold
   * the key in plaintext. Wrap each one once; the filter matches the exact old
   * value so a concurrent admin save is never overwritten. Without the
   * encryption key nothing changes and the next start tries again.
   */
  private async migrateLegacyKeys(): Promise<void> {
    if (this.legacyKeysMigrated) return;
    const rows = (await this.providers.find({}).sort({ priority: 1 }).toArray()) as unknown as Array<{ key: string; api_key?: string }>;
    const legacy = rows.filter((r) => r.api_key && !String(r.api_key).startsWith(ENC_PREFIX));
    for (const r of legacy) {
      let wrapped: string;
      try { wrapped = encryptApiKey(String(r.api_key)); }
      catch { this.logger.warn('AI_KEYS_ENC_KEY missing — plaintext provider keys left unencrypted'); return; }
      await this.providers.updateOne({ key: r.key, api_key: r.api_key }, { $set: { api_key: wrapped } });
    }
    if (legacy.length) this.logger.log(`encrypted ${legacy.length} legacy AI provider key(s) at rest`);
    this.legacyKeysMigrated = true;
  }

  private async ensureRegistry() {
    const count = await this.providers.countDocuments({});
    if (count > 0) { await this.migrateLegacyKeys(); return; }
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
      // P13-R21: seed keys encrypted when the env key exists; otherwise the
      // seed stays plaintext once (rotated to ciphertext on first admin save).
      let seedKey = envKeys[p.key] || '';
      if (seedKey) {
        try { seedKey = encryptApiKey(seedKey); }
        catch { this.logger.warn('AI_KEYS_ENC_KEY missing — seeding a plaintext key (re-save from admin to encrypt)'); }
      }
      await this.providers.updateOne(
        { key: p.key },
        { $set: { ...p, api_key: seedKey } },
        { upsert: true },
      );
    }
    await this.settings.updateOne(
      { key: 'ai_mode' },
      { $set: { key: 'ai_mode', value: 'auto', pinned_provider: null, enabled: true } },
      { upsert: true },
    );
    this.logger.log('AI provider registry seeded into DB');
    await this.migrateLegacyKeys();
  }

  /** Load registry + mode with a 20s cache. Keys are decrypted in memory only. */
  private async loadRegistry(): Promise<{ providers: ProviderConfig[]; mode: 'auto' | 'manual'; pinned: AiProviderName | null; purposeOverrides: Record<string, string> }> {
    if (this.registryCache && Date.now() - this.registryCache.at < 20_000) {
      return { providers: this.registryCache.providers, mode: this.registryCache.mode, pinned: this.registryCache.pinned, purposeOverrides: this.registryCache.purposeOverrides };
    }
    await this.ensureRegistry();
    const providers = ((await this.providers.find({}).sort({ priority: 1 }).toArray()) as any[]).map((p: any) => {
      let apiKey = p?.api_key || '';
      try { apiKey = decryptApiKey(apiKey); } catch { apiKey = ''; }
      return { ...p, api_key: apiKey };
    });
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

  private cooldownKey(key: string): string { return `ai:cooldown:${key}`; }
  private rpmKey(key: string): string {
    const minute = new Date().toISOString().slice(0, 16);
    return `ai:rpm:${key}:${minute}`;
  }

  private async cooledDown(key: string): Promise<boolean> {
    return (await this.kvGet(this.cooldownKey(key))) !== null;
  }

  /** P13-R21: park a failing provider for 5 minutes (priority order resumes it after). */
  private async coolDown(key: string): Promise<void> {
    await this.kvSet(this.cooldownKey(key), '1', 300);
  }

  /** Eligible providers in attempt order (auto: priority asc, quota-aware). */
  private async attemptChain(feature?: string): Promise<ProviderConfig[]> {
    const { providers, mode, pinned, purposeOverrides } = await this.loadRegistry();
    const today = this.today();
    const usable = (p: ProviderConfig) =>
      p.enabled && p.api_key && (p.daily_quota === 0 || p.usage_date !== today || p.used_today < p.daily_quota);
    const chain: ProviderConfig[] = [];
    for (const p of providers.filter(usable)) {
      // P13-R21: per-minute free-tier limits + 429/5xx cooldowns. Cooled
      // providers are skipped; when the window resets they rejoin by
      // priority automatically (nothing to "switch back" manually).
      if (await this.cooledDown(p.key)) continue;
      if (Number(p.requests_per_minute || 0) > 0) {
        const used = Number(await this.kvGet(this.rpmKey(p.key)) || 0);
        if (used >= Number(p.requests_per_minute)) continue;
      }
      if (Number(p.tokens_per_day || 0) > 0 && p.tokens_usage_date === today &&
          Number(p.tokens_used_today || 0) >= Number(p.tokens_per_day)) continue;
      chain.push(p);
    }

    if (mode === 'manual' && pinned) {
      const p = chain.find((x: any) => x.key === pinned);
      return p ? [p] : chain;
    }
    // Per-feature override: pinned provider for this feature goes first,
    // full chain behind it preserves automatic fallback.
    const override = feature && purposeOverrides?.[feature];
    if (override) {
      const first = chain.find((x: any) => x.key === override);
      if (first) return [first, ...chain.filter((x: any) => x.key !== override)];
    }
    return chain;
  }

  private async markAttempt(p: ProviderConfig): Promise<void> {
    if (Number(p.requests_per_minute || 0) <= 0) return;
    const key = this.rpmKey(p.key);
    const n = await this.kvIncr(key);
    if (n === 1) await this.kvExpire(key, 90);
  }

  private cacheKeyFor(opts: AiGenerateOptions): string | null {
    if (!opts?.cacheTtlSec || opts.imageBase64) return null;
    const prompt = Array.isArray(opts.prompt) ? opts.prompt.join('\n') : String(opts.prompt || '');
    if (!prompt) return null;
    return `ai:cache:${createHash('sha256').update(`${opts.feature}\n${prompt}`).digest('hex')}`;
  }

  /** Unified generation with automatic fallback across the chain. */
  async generate(opts: AiGenerateOptions): Promise<AiGenerateResult> {
    // Kill switch: when explicitly disabled, skip every provider call and
    // return nothing billable. Absent flag / store outage fails open.
    if (await isKilled('ai', connectionFlagSource(this.conn))) {
      throw new ServiceUnavailableException('ai_disabled_by_kill_switch');
    }
    // P13-R21: identical requests (e.g. translations) are served from cache.
    const cacheKey = this.cacheKeyFor(opts);
    if (cacheKey) {
      try {
        const hit = await this.kvGet(cacheKey);
        if (hit) {
          const parsed = JSON.parse(hit);
          if (parsed?.text) return { ...parsed, fell_back: false, cached: true };
        }
      } catch { /* cache miss behaves like no cache */ }
    }
    const chain = await this.attemptChain(opts.feature);
    if (chain.length === 0) throw new ServiceUnavailableException('ai_provider_unavailable');

    // P13-R21: names, phones and IDs never leave for a provider.
    const clean: AiGenerateOptions = { ...opts };
    if (typeof clean.prompt === 'string') clean.prompt = stripPII(clean.prompt);
    else if (Array.isArray(clean.prompt)) clean.prompt = clean.prompt.map((t: any) => typeof t === 'string' ? stripPII(t) : t);
    const health = !!opts.health;

    let lastErr: any = null;
    let fellBack = false;
    for (const p of chain) {
      await this.markAttempt(p);
      const start = Date.now();
      try {
        const raw = p.key === 'gemini'
          ? await this.generateGemini(p, clean)
          : await this.generateOpenAiCompat(p, clean);
        // Provider calls resolve { text, tokens }; legacy spies resolve a bare
        // string — both shapes are accepted here.
        const gen = typeof raw === 'string' ? { text: raw, tokens: 0 } : raw;
        // P13-R21: an empty reply is a failure (fail over, never cache it).
        if (!gen.text || !String(gen.text).trim()) throw new BadGatewayException(`${p.key}_empty_response`);
        // P13-R21: medical safety footer on health answers.
        const text = health ? `${gen.text}\n\n${HEALTH_DISCLAIMER_AR}\n${HEALTH_DISCLAIMER_EN}` : gen.text;
        const elapsed = Date.now() - start;
        await this.recordUsage(p, opts.feature, elapsed, true, fellBack, undefined, gen.tokens);
        const out = { text, provider: p.key, model: this.modelFor(p, !!opts.imageBase64), elapsed_ms: elapsed, fell_back: fellBack };
        if (cacheKey) await this.kvSet(cacheKey, JSON.stringify(out), Number(opts.cacheTtlSec)).catch(() => null);
        return out;
      } catch (e: any) {
        const elapsed = Date.now() - start;
        await this.recordUsage(p, opts.feature, elapsed, false, fellBack, e.message?.slice(0, 160));
        const msg = String(e.message || '');
        // Rate limit / quota / connection → cool down, move to next provider
        if (/429|rate.?limit|quota|insufficient|timeout|ECONN|ENOTFOUND|503|529|credit/i.test(msg)) {
          this.logger.warn(`[AI-Gateway] ${p.key} failed (${msg.slice(0, 60)}) → cooldown + fallback`);
          await this.coolDown(p.key);
          fellBack = true;
          lastErr = e;
          continue;
        }
        // Non-transient errors: still try next but mark fallback
        fellBack = true;
        lastErr = e;
      }
    }
    if (lastErr instanceof BadGatewayException || lastErr instanceof ServiceUnavailableException) throw lastErr;
    throw new BadGatewayException('ai_upstream_error');
  }

  private modelFor(p: ProviderConfig, vision = false): string {
    return vision ? (p.vision_model || p.model) : p.model;
  }

  private async generateGemini(p: ProviderConfig, opts: AiGenerateOptions): Promise<{ text: string; tokens: number }> {
    // P13-R21: per-call client (a cached singleton would keep a stale key
    // across rotations) with the same 30s timeout as the OpenAI path.
    const genAI = new GoogleGenerativeAI(p.api_key);
    const model = genAI.getGenerativeModel({ model: this.modelFor(p, !!opts.imageBase64) });
    const payload: any[] = Array.isArray(opts.prompt) ? opts.prompt : [opts.prompt];
    if (opts.imageBase64) {
      payload.push({ inlineData: { data: opts.imageBase64, mimeType: opts.mimeType || 'image/jpeg' } });
    }
    const result = await withTimeout(model.generateContent(payload), 30_000, 'gemini_timeout');
    const tokens = Number((result as any)?.response?.usageMetadata?.totalTokenCount || 0);
    return { text: result.response.text(), tokens };
  }

  private async generateOpenAiCompat(p: ProviderConfig, opts: AiGenerateOptions): Promise<{ text: string; tokens: number }> {
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
      throw new BadGatewayException(`${p.key}_http_${resp.status}: ${body.slice(0, 150)}`);
    }
    const json: any = await resp.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new BadGatewayException(`${p.key}_empty_response`);
    return { text, tokens: Number(json?.usage?.total_tokens || 0) };
  }

  /** Daily-quota-aware usage recording + request log. */
  private async recordUsage(p: ProviderConfig, feature: string, ms: number, ok: boolean, fellBack: boolean, error?: string, tokens = 0) {
    const today = this.today();
    await this.providers.updateOne(
      { key: p.key },
      [
        {
          $set: {
            used_today: { $cond: [{ $eq: ['$usage_date', today] }, { $add: ['$used_today', 1] }, 1] },
            usage_date: today,
            tokens_used_today: {
              $cond: [
                { $eq: ['$tokens_usage_date', today] },
                { $add: [{ $ifNull: ['$tokens_used_today', 0] }, tokens] },
                tokens,
              ],
            },
            tokens_usage_date: today,
          },
        },
      ] as any,
    ).catch(() => {});
    await this.conn.collection('ai_usage').insertOne({
      provider: p.key, model: this.modelFor(p), feature,
      elapsed_ms: ms, ok, fell_back: fellBack, error: error || null, tokens,
      createdAt: new Date(),
    }).catch(() => {});
  }

  // ── Admin management API ────────────────────────────────────────────────
  private maskKey(stored: string): { has_key: boolean; key_preview: string | null } {
    if (!stored) return { has_key: false, key_preview: null };
    // The preview is the end of the real key, never the end of the ciphertext.
    let plain = '';
    try { plain = decryptApiKey(String(stored)); } catch { plain = ''; }
    return { has_key: true, key_preview: plain.length >= 8 ? `••••${plain.slice(-4)}` : null };
  }

  async listProviders() {
    await this.ensureRegistry();
    const providers = await this.providers.find({}).sort({ priority: 1 }).toArray();
    const modeDoc: any = await this.settings.findOne({ key: 'ai_mode' });
    const today = this.today();
    // P13-R21: live status per provider — remaining quota, 24h error rate and
    // latency, usage per feature — from the same ai_usage log as usageReport.
    let stats: any[] = [];
    try {
      const since = new Date(Date.now() - 86400000);
      stats = await this.conn.collection('ai_usage').aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$provider',
            calls: { $sum: 1 },
            failures: { $sum: { $cond: [{ $eq: ['$ok', false] }, 1, 0] } },
            avg_ms: { $avg: '$elapsed_ms' },
          },
        },
      ]).toArray();
    } catch { stats = []; }
    const byKey = new Map(stats.map((s: any) => [s._id, s]));
    return {
      mode: modeDoc?.value || 'auto',
      pinned_provider: modeDoc?.pinned_provider || null,
      purpose_overrides: modeDoc?.purpose_overrides || {},
      providers: providers.map((p: any) => {
        const masked = this.maskKey(p.api_key);
        const st: any = byKey.get(p.key) || {};
        const quota = Number(p.daily_quota || 0);
        const used = p.usage_date === today ? Number(p.used_today || 0) : 0;
        return {
          key: p.key, enabled: p.enabled, model: p.model, vision_model: p.vision_model,
          priority: p.priority, daily_quota: p.daily_quota, used_today: used,
          requests_per_minute: p.requests_per_minute ?? null,
          requests_per_day: p.requests_per_day ?? null,
          tokens_per_day: p.tokens_per_day ?? null,
          tokens_used_today: p.tokens_usage_date === today ? Number(p.tokens_used_today || 0) : 0,
          quota_remaining: quota === 0 ? null : Math.max(0, quota - used),
          error_rate_24h: st.calls ? Math.round((st.failures / st.calls) * 1000) / 1000 : 0,
          avg_ms_24h: st.avg_ms != null ? Math.round(st.avg_ms) : null,
          calls_24h: st.calls || 0,
          has_key: masked.has_key, key_preview: masked.key_preview, note: p.note,
        };
      }),
    };
  }

  async updateProvider(key: AiProviderName, patch: Partial<Pick<ProviderConfig, 'enabled' | 'api_key' | 'model' | 'vision_model' | 'daily_quota' | 'priority' | 'requests_per_minute' | 'requests_per_day' | 'tokens_per_day'>>) {
    await this.ensureRegistry();
    const set: any = { ...patch, updatedAt: new Date() };
    // P13-R21: keys are encrypted at rest (AES-256-GCM, key from env).
    if (patch.api_key !== undefined) {
      if (!String(patch.api_key)) {
        set.api_key = '';
      } else {
        set.api_key = encryptApiKey(String(patch.api_key));
      }
    }
    await this.providers.updateOne({ key }, { $set: set });
    this.registryCache = null;
    const { api_key, ...safePatch } = patch as any;
    return { ok: true, key, patch: { ...safePatch, ...(api_key !== undefined ? { api_key: api_key ? 'stored_encrypted' : 'cleared' } : {}) } };
  }

  /**
   * P13-R21: "test key" button — probes a candidate key with a minimal live
   * call and reports ok/latency without storing anything.
   */
  async testKey(key: AiProviderName, rawKey: string): Promise<{ ok: boolean; latency_ms?: number; error?: string }> {
    const providers = (await this.providers.find({}).toArray()) as any[];
    const rec: any = providers.find((p: any) => p.key === key);
    if (!rec) throw new NotFoundException('unknown_provider');
    const candidate = String(rawKey || '');
    if (!candidate) throw new BadRequestException('key_required');
    const start = Date.now();
    try {
      if (key === 'gemini') {
        const genAI = new GoogleGenerativeAI(candidate);
        const model = genAI.getGenerativeModel({ model: rec.model || 'gemini-2.0-flash' });
        await withTimeout(model.generateContent('ping'), 15_000, 'gemini_timeout');
      } else {
        const base = rec.base_url || 'https://api.openai.com/v1';
        const resp = await fetch(`${base}/models`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${candidate}` },
          signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) throw new BadGatewayException(`test_key_http_${resp.status}`);
        await resp.json().catch(() => null);
      }
      return { ok: true, latency_ms: Date.now() - start };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || 'test_key_failed').slice(0, 200) };
    }
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
    const rows: any[] = await this.conn.collection('ai_usage').aggregate([
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
    // P13-R21: per-feature error rate alongside the raw counts.
    return rows.map((r: any) => ({
      ...r,
      error_rate: r.calls ? Math.round((r.failures / r.calls) * 1000) / 1000 : 0,
    }));
  }
}
