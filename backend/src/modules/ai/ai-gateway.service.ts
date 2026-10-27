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

import { dayKey, monthKey, nextDayReset, nextMonthReset, retryAfterSeconds } from './ai-windows';
import { AiProviderName, DEFAULT_PROVIDERS, NON_CHAT_PROVIDERS, PROVIDER_ENV_KEY, ProviderConfig, providerHttpErrorCode } from './ai-provider-catalog';
export type { AiProviderName };

export type { ProviderConfig };

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

export { providerHttpErrorCode };

/** A provider call that failed: the HTTP status and the wait the provider asked for (429) are kept, never its response body. */
export class AiProviderError extends BadGatewayException {
  constructor(code: string, readonly httpStatus?: number, readonly retryAfterSec?: number) { super(code); }
}

/** Why a provider was left out of a request's chain; stored in `ai_usage.skipped`. */
export interface SkippedProvider { provider: AiProviderName; reason: string }

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
    const hit = this.mem.get(key);
    if (hit && hit.exp > 0 && hit.exp <= Date.now()) { this.mem.delete(key); return null; }
    return hit?.v ?? null;
  }

  private async kvDel(key: string): Promise<void> {
    this.mem.delete(key);
    if (this.redis) { try { await this.redis.del(key); } catch { /* the 1 s TTL set above ends it */ } }
  }

  private async kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.redis) {
      try { await this.redis.set(key, value, ttlSeconds); return; } catch { /* fall through */ }
    }
    this.mem.set(key, { v: value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
  }

  private get providers() { return this.conn.collection('ai_providers'); }
  private get settings() { return this.conn.collection('featureflags'); }

  // ── Registry bootstrap: seed env keys into DB once ──────────────────────
  private legacyKeysRetryAt = 0;

  /**
   * 16.1: rows saved before P13-R21 (or seeded without AI_KEYS_ENC_KEY) hold
   * the key in plaintext. Wrap each one; the filter matches the exact old
   * value so a concurrent admin save is never overwritten. Best effort: a
   * failure is logged and never stops the registry load. Without the
   * encryption key nothing changes and the check is retried every 10 minutes.
   */
  private async migrateLegacyKeys(): Promise<void> {
    if (Date.now() < this.legacyKeysRetryAt) return;
    try {
      const rows = (await this.providers
        .find({ api_key: { $type: 'string', $not: /^(enc:|$)/ } })
        .sort({ priority: 1 })
        .toArray()) as unknown as Array<{ key: string; api_key?: string }>;
      const legacy = rows.filter((r) => r.api_key && !String(r.api_key).startsWith(ENC_PREFIX));
      for (const r of legacy) {
        let wrapped: string;
        try { wrapped = encryptApiKey(String(r.api_key)); }
        catch {
          this.legacyKeysRetryAt = Date.now() + 10 * 60_000;
          this.logger.warn('AI_KEYS_ENC_KEY missing — plaintext provider keys left unencrypted');
          return;
        }
        await this.providers.updateOne({ key: r.key, api_key: r.api_key }, { $set: { api_key: wrapped } });
      }
      if (legacy.length) this.logger.log(`encrypted ${legacy.length} legacy AI provider key(s) at rest`);
    } catch (e) {
      this.legacyKeysRetryAt = Date.now() + 60_000;
      this.logger.warn(`legacy AI key encryption failed: ${(e as Error).message}`);
    }
  }

  private envSyncedAt = 0;

  /**
   * Env → DB sync. The registry used to be seeded from the environment only while `ai_providers` was empty, so a key added to
   * `.env.production` later never reached the gateway. Now, once per process (retried every 10 minutes after a failure):
   *  - a provider the gateway knows but the DB lacks (e.g. added in a release) is inserted with its defaults;
   *  - a provider whose DB key is empty and whose environment variable is set gets the environment key (encrypted like the seed).
   * A key an admin saved in the DB is never overwritten (the update filter requires an empty key). Only names are logged.
   */
  private async syncEnvKeys(): Promise<void> {
    if (this.envSyncedAt && Date.now() < this.envSyncedAt) return;
    try {
      const filled: string[] = [];
      const have = new Set(((await this.providers.find({}).toArray()) as unknown as Array<{ key: string }>).map((r) => r.key));
      for (const p of DEFAULT_PROVIDERS) {
        if (!have.has(p.key)) await this.providers.updateOne({ key: p.key }, { $setOnInsert: { ...p } }, { upsert: true });
        else {
          // rows seeded before the free-tier windows existed: add the window metadata only (never the numbers an admin may have edited)
          await this.providers.updateOne(
            { key: p.key, reset_tz: { $exists: false } },
            { $set: { reset_tz: p.reset_tz ?? 'UTC', reserve_for_vision: !!p.reserve_for_vision, limits_source: p.limits_source ?? null, limits_verified: !!p.limits_verified } },
          );
        }
        const envKey = String(process.env[PROVIDER_ENV_KEY[p.key]] || '').trim();
        if (!envKey) continue;
        let stored = envKey;
        try { stored = encryptApiKey(envKey); }
        catch { this.logger.warn('AI_KEYS_ENC_KEY missing — storing an environment key unencrypted (re-save from admin to encrypt)'); }
        const res = await this.providers.updateOne(
          { key: p.key, $or: [{ api_key: '' }, { api_key: null }, { api_key: { $exists: false } }] },
          { $set: { api_key: stored, updatedAt: new Date() } },
        );
        if (res.modifiedCount) filled.push(p.key);
      }
      if (filled.length) {
        this.registryCache = null;
        this.logger.log(`AI provider keys taken from the environment: ${filled.join(', ')}`);
      }
      this.envSyncedAt = Number.MAX_SAFE_INTEGER; // done for this process
    } catch (e) {
      this.envSyncedAt = Date.now() + 10 * 60_000;
      this.logger.warn(`AI provider env sync failed: ${(e as Error).message}`);
    }
  }

  private async ensureRegistry() {
    const count = await this.providers.countDocuments({});
    if (count > 0) { await this.migrateLegacyKeys(); await this.syncEnvKeys(); return; }
    for (const p of DEFAULT_PROVIDERS) {
      // P13-R21: seed keys encrypted when the env key exists; otherwise the
      // seed stays plaintext once (rotated to ciphertext on first admin save).
      let seedKey = String(process.env[PROVIDER_ENV_KEY[p.key]] || '');
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

  /** Epoch ms until which the provider is parked, or null. (A value of '1' is the older marker: parked, end unknown.) */
  private async parkedUntil(key: string): Promise<number | null> {
    const v = await this.kvGet(this.cooldownKey(key));
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 1e12 ? n : Date.now() + 1000;
  }

  /** Park a provider for `seconds`; it rejoins the chain by priority when the time is up. */
  private async coolDown(key: string, seconds = 300): Promise<void> {
    await this.kvSet(this.cooldownKey(key), String(Date.now() + seconds * 1000), Math.max(1, Math.ceil(seconds)));
  }

  /** The day/month window keys of a provider (counted in its own reset zone). */
  private windows(p: ProviderConfig, at: Date = new Date()) {
    return { day: dayKey(p.reset_tz, at), month: monthKey(p.reset_tz, at) };
  }

  /** Daily request limit: the stricter of `daily_quota` and `requests_per_day` (0 = none). */
  private dayRequestLimit(p: ProviderConfig): number {
    const lims = [Number(p.daily_quota || 0), Number(p.requests_per_day || 0)].filter((n) => n > 0);
    return lims.length ? Math.min(...lims) : 0;
  }

  /** The window that is used up for this provider right now, if any. */
  private exhaustedWindow(p: ProviderConfig, at: Date = new Date()): string | null {
    const w = this.windows(p, at);
    const dayLimit = this.dayRequestLimit(p);
    if (dayLimit > 0 && p.usage_date === w.day && Number(p.used_today || 0) >= dayLimit) return 'quota_day';
    if (Number(p.tokens_per_day || 0) > 0 && p.tokens_usage_date === w.day && Number(p.tokens_used_today || 0) >= Number(p.tokens_per_day)) return 'tokens_day';
    if (p.month_key === w.month) {
      if (Number(p.requests_per_month || 0) > 0 && Number(p.month_requests || 0) >= Number(p.requests_per_month)) return 'quota_month';
      if (Number(p.tokens_per_month || 0) > 0 && Number(p.month_tokens || 0) >= Number(p.tokens_per_month)) return 'tokens_month';
    }
    return null;
  }

  /**
   * The chain for one request, and why every other provider was left out (kept in `ai_usage.skipped`).
   *  - vision request: only providers with a vision model, by priority;
   *  - text request: providers WITHOUT `reserve_for_vision` first (their quota is for text), then the reserved ones as a last resort;
   *  - a provider whose minute/day/month window is used up is out until that window resets; a parked one until its park ends.
   */
  private async attemptPlan(feature?: string, vision = false): Promise<{ chain: ProviderConfig[]; skipped: SkippedProvider[] }> {
    const { providers, mode, pinned, purposeOverrides } = await this.loadRegistry();
    const skipped: SkippedProvider[] = [];
    let chain: ProviderConfig[] = [];
    for (const p of providers) {
      const skip = (reason: string) => { skipped.push({ provider: p.key, reason }); };
      if (NON_CHAT_PROVIDERS.has(p.key)) { skip('not_chat'); continue; }
      if (!p.enabled) { skip('disabled'); continue; }
      if (!p.api_key) { skip('no_key'); continue; }
      if (vision && !p.vision_model) { skip('no_vision'); continue; }
      const used = this.exhaustedWindow(p);
      if (used) { skip(used); continue; }
      // P13-R21: per-minute free-tier limits + parks (429 wait, rejected key, repeated 5xx). When the time is up the provider
      // rejoins by priority automatically (nothing to "switch back" manually).
      if (await this.parkedUntil(p.key)) { skip('parked'); continue; }
      if (Number(p.requests_per_minute || 0) > 0) {
        const n = Number(await this.kvGet(this.rpmKey(p.key)) || 0);
        if (n >= Number(p.requests_per_minute)) { skip('rpm'); continue; }
      }
      chain.push(p);
    }
    if (!vision) chain = [...chain.filter((p) => !p.reserve_for_vision), ...chain.filter((p) => p.reserve_for_vision)];

    if (mode === 'manual' && pinned) {
      const p = chain.find((x: any) => x.key === pinned);
      return { chain: p ? [p] : chain, skipped };
    }
    // Per-feature override: pinned provider for this feature goes first,
    // full chain behind it preserves automatic fallback.
    const override = feature && purposeOverrides?.[feature];
    if (override) {
      const first = chain.find((x: any) => x.key === override);
      if (first) return { chain: [first, ...chain.filter((x: any) => x.key !== override)], skipped };
    }
    return { chain, skipped };
  }

  /** Eligible providers in attempt order (see attemptPlan). */
  private async attemptChain(feature?: string, vision = false): Promise<ProviderConfig[]> {
    return (await this.attemptPlan(feature, vision)).chain;
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
    const { chain, skipped } = await this.attemptPlan(opts.feature, !!opts.imageBase64);
    if (chain.length === 0) throw new ServiceUnavailableException('ai_provider_unavailable');

    // P13-R21: names, phones and IDs never leave for a provider.
    const clean: AiGenerateOptions = { ...opts };
    if (typeof clean.prompt === 'string') clean.prompt = stripPII(clean.prompt);
    else if (Array.isArray(clean.prompt)) clean.prompt = clean.prompt.map((t: any) => typeof t === 'string' ? stripPII(t) : t);
    const health = !!opts.health;

    let lastErr: any = null;
    let fellBack = false;
    const failed: Array<{ provider: AiProviderName; code: string }> = [];
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
        await this.onSuccess(p);
        await this.recordUsage(p, opts.feature, elapsed, true, fellBack, undefined, gen.tokens, { served_by: p.key, vision: !!opts.imageBase64, skipped, failed });
        const out = { text, provider: p.key, model: this.modelFor(p, !!opts.imageBase64), elapsed_ms: elapsed, fell_back: fellBack };
        if (cacheKey) await this.kvSet(cacheKey, JSON.stringify(out), Number(opts.cacheTtlSec)).catch(() => null);
        return out;
      } catch (e: any) {
        const elapsed = Date.now() - start;
        const code = String(e?.message || 'error').slice(0, 160);
        failed.push({ provider: p.key, code: code.slice(0, 80) });
        await this.recordUsage(p, opts.feature, elapsed, false, fellBack, code);
        await this.onFailure(p, e);
        fellBack = true;
        lastErr = e;
      }
    }
    if (lastErr instanceof BadGatewayException || lastErr instanceof ServiceUnavailableException) throw lastErr;
    throw new BadGatewayException('ai_upstream_error');
  }

  /** A good answer ends the failure streak and clears a "bad key" flag. */
  private async onSuccess(p: ProviderConfig): Promise<void> {
    await this.kvSet(this.failsKey(p.key), '0', 1).catch(() => null);
    if (p.needs_attention) {
      await this.providers.updateOne({ key: p.key }, { $set: { needs_attention: false }, $unset: { attention_reason: '' } }).catch(() => null);
      this.registryCache = null;
    }
  }

  private failsKey(key: string): string { return `ai:fails:${key}`; }

  /**
   * What a failed call means for the provider (the request itself always moves on to the next provider):
   *  - 401/403: the key is bad. Park it for 30 minutes and flag it for the admin (needs_attention, error log);
   *  - 429 / quota text: park it for the wait the provider asked for (Retry-After / reset header), else 5 minutes;
   *  - 5xx / timeout / network: count it, and park for 5 minutes after 2 in a row;
   *  - anything else (empty reply...): just fall through.
   */
  private async onFailure(p: ProviderConfig, e: any): Promise<void> {
    const msg = String(e?.message || '');
    const status: number | undefined = e instanceof AiProviderError ? e.httpStatus : undefined;
    if (status === 401 || status === 403 || /ai_provider_auth_failed/.test(msg)) {
      await this.coolDown(p.key, 1800);
      this.logger.error(`[AI-Gateway] ${p.key}: the key was rejected (${status ?? 'auth'}); parked 30 min, check the key in the admin`);
      await this.providers.updateOne({ key: p.key }, { $set: { needs_attention: true, attention_reason: 'ai_provider_auth_failed', attention_at: new Date() } }).catch(() => null);
      this.registryCache = null;
      return;
    }
    if (status === 429 || /429|rate.?limit|quota|insufficient|credit/i.test(msg)) {
      const wait = (e instanceof AiProviderError && e.retryAfterSec) || 300;
      this.logger.warn(`[AI-Gateway] ${p.key} limited (${msg.slice(0, 60)}) → parked ${wait}s`);
      await this.coolDown(p.key, wait);
      return;
    }
    if ((status !== undefined && status >= 500) || /timeout|timed out|ECONN|ENOTFOUND|aborted|fetch failed|_http_5\d\d|503|529/i.test(msg)) {
      const n = await this.kvIncr(this.failsKey(p.key));
      await this.kvExpire(this.failsKey(p.key), 600);
      if (n >= 2) {
        this.logger.warn(`[AI-Gateway] ${p.key} failed ${n} times in a row (${msg.slice(0, 60)}) → parked 5 min`);
        await this.coolDown(p.key, 300);
        await this.kvSet(this.failsKey(p.key), '0', 1).catch(() => null);
      }
    }
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
    let result: Awaited<ReturnType<typeof model.generateContent>>;
    try {
      result = await withTimeout(model.generateContent(payload), 30_000, 'gemini_timeout');
    } catch (e: any) {
      // The SDK's message can quote the provider's reply: keep the status and the retry hint, not the text.
      const status = Number(e?.status);
      if (Number.isFinite(status) && status > 0) {
        const delay = (Array.isArray(e?.errorDetails) ? e.errorDetails : []).map((d: any) => String(d?.retryDelay || '')).find(Boolean);
        const sec = delay ? Number(String(delay).replace(/s$/, '')) : NaN;
        throw new AiProviderError(providerHttpErrorCode('gemini', status), status, Number.isFinite(sec) && sec > 0 ? Math.min(86400, Math.ceil(sec)) : undefined);
      }
      throw e;
    }
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
      // The provider's body is never put in the message: a 401 body can carry part of the API key (Sentry NABD-BACKEND-21).
      await resp.body?.cancel().catch(() => undefined);
      throw new AiProviderError(providerHttpErrorCode(p.key, resp.status), resp.status, resp.status === 429 ? retryAfterSeconds(resp.headers) : undefined);
    }
    const json: any = await resp.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new BadGatewayException(`${p.key}_empty_response`);
    return { text, tokens: Number(json?.usage?.total_tokens || 0) };
  }

  /** Per-window usage recording (minute is counted separately) + the request log with who served it and who was skipped. */
  private async recordUsage(p: ProviderConfig, feature: string, ms: number, ok: boolean, fellBack: boolean, error?: string, tokens = 0, extra: Record<string, unknown> = {}) {
    const w = this.windows(p);
    await this.providers.updateOne(
      { key: p.key },
      [
        {
          $set: {
            used_today: { $cond: [{ $eq: ['$usage_date', w.day] }, { $add: [{ $ifNull: ['$used_today', 0] }, 1] }, 1] },
            usage_date: w.day,
            tokens_used_today: {
              $cond: [
                { $eq: ['$tokens_usage_date', w.day] },
                { $add: [{ $ifNull: ['$tokens_used_today', 0] }, tokens] },
                tokens,
              ],
            },
            tokens_usage_date: w.day,
            month_requests: { $cond: [{ $eq: ['$month_key', w.month] }, { $add: [{ $ifNull: ['$month_requests', 0] }, 1] }, 1] },
            month_tokens: { $cond: [{ $eq: ['$month_key', w.month] }, { $add: [{ $ifNull: ['$month_tokens', 0] }, tokens] }, tokens] },
            month_key: w.month,
            // admin view: last success, last error code
            ...(ok ? { last_ok_at: new Date() } : { last_error_code: { $literal: String(error || 'error').slice(0, 80) }, last_error_at: new Date() }),
          },
        },
      ] as any,
    ).catch((e: Error) => this.usageWriteFailed('counters', e));
    await this.conn.collection('ai_usage').insertOne({
      provider: p.key, model: this.modelFor(p), feature,
      elapsed_ms: ms, ok, fell_back: fellBack, error: error || null, tokens,
      ...extra,
      createdAt: new Date(),
    }).catch((e: Error) => this.usageWriteFailed('log', e));
  }

  private lastUsageWarn = 0;
  /** A failing usage write must not fail the request, but it must not be silent either (an empty `ai_usage` was once unexplained). */
  private usageWriteFailed(what: string, e: Error): void {
    const now = Date.now();
    if (now - this.lastUsageWarn < 60_000) return;
    this.lastUsageWarn = now;
    this.logger.warn(`AI usage ${what} was not recorded: ${String(e?.message || e).slice(0, 120)}`);
  }

  // ── Admin management API ────────────────────────────────────────────────
  private maskKey(stored: string): { has_key: boolean; key_preview: string | null; key_unreadable?: true } {
    if (!stored) return { has_key: false, key_preview: null };
    // The preview is the end of the real key, never the end of the ciphertext.
    let plain: string;
    try { plain = decryptApiKey(String(stored)); } catch { return { has_key: true, key_preview: null, key_unreadable: true }; }
    return { has_key: true, key_preview: plain.length >= 8 ? `••••${plain.slice(-4)}` : null };
  }

  async listProviders() {
    await this.ensureRegistry();
    const providers = await this.providers.find({}).sort({ priority: 1 }).toArray();
    const modeDoc: any = await this.settings.findOne({ key: 'ai_mode' });
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
      providers: await Promise.all(providers.map(async (p: any) => {
        const masked = this.maskKey(p.api_key);
        const st: any = byKey.get(p.key) || {};
        const w = this.windows(p);
        const dayLimit = this.dayRequestLimit(p);
        const used = p.usage_date === w.day ? Number(p.used_today || 0) : 0;
        const monthSame = p.month_key === w.month;
        const parkedUntil = await this.parkedUntil(p.key);
        const chat = !NON_CHAT_PROVIDERS.has(p.key);
        const chains = chat ? [...(p.vision_model ? ['vision'] : []), 'text'] : [];
        return {
          key: p.key, enabled: p.enabled, model: p.model, vision_model: p.vision_model,
          priority: p.priority, daily_quota: p.daily_quota, used_today: used,
          requests_per_minute: p.requests_per_minute ?? null,
          requests_per_day: p.requests_per_day ?? null,
          tokens_per_day: p.tokens_per_day ?? null,
          tokens_used_today: p.tokens_usage_date === w.day ? Number(p.tokens_used_today || 0) : 0,
          quota_remaining: dayLimit === 0 ? null : Math.max(0, dayLimit - used),
          error_rate_24h: st.calls ? Math.round((st.failures / st.calls) * 1000) / 1000 : 0,
          avg_ms_24h: st.avg_ms != null ? Math.round(st.avg_ms) : null,
          calls_24h: st.calls || 0,
          last_ok_at: p.last_ok_at ?? null, last_error_code: p.last_error_code ?? null, last_error_at: p.last_error_at ?? null,
          supports_vision: !!p.vision_model, chat,
          // owner decision 2026-10-26: which chain, usage against each window, the next reset, health
          chains, text_tier: chat ? (p.reserve_for_vision ? 'last' : 'preferred') : null,
          day: { used, limit: dayLimit || null, tokens_used: p.tokens_usage_date === w.day ? Number(p.tokens_used_today || 0) : 0, tokens_limit: Number(p.tokens_per_day || 0) || null, resets_at: nextDayReset(p.reset_tz).toISOString() },
          month: (Number(p.requests_per_month || 0) > 0 || Number(p.tokens_per_month || 0) > 0)
            ? { used: monthSame ? Number(p.month_requests || 0) : 0, limit: Number(p.requests_per_month || 0) || null, tokens_used: monthSame ? Number(p.month_tokens || 0) : 0, tokens_limit: Number(p.tokens_per_month || 0) || null, resets_at: nextMonthReset(p.reset_tz).toISOString() }
            : null,
          reset_tz: p.reset_tz || 'UTC',
          parked_until: parkedUntil ? new Date(parkedUntil).toISOString() : null,
          needs_attention: !!p.needs_attention, attention_reason: p.attention_reason ?? null,
          limits_source: p.limits_source ?? null, limits_verified: p.limits_verified ?? false,
          has_key: masked.has_key, key_preview: masked.key_preview, ...(masked.key_unreadable ? { key_unreadable: true } : {}), note: p.note,
        };
      })),
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
        set.needs_attention = false; // a new key: the "rejected key" flag and park are over
        await this.kvDel(this.cooldownKey(key));
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
