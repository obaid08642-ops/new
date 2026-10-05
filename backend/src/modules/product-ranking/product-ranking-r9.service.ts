import { Injectable, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { connectionFlagSource, isKilled } from '../../common/killswitches/killswitches.helper';

/**
 * 13.R9 — Dynamic product ranking (events + windows + modes + category scope + anti-abuse).
 *
 * Additive home inside the existing product-ranking module (already registered in
 * app.module.ts). Depends ONLY on RedisService, which degrades to a per-process
 * in-memory fallback when Redis is unreachable — so this needs NO new
 * infrastructure, NO schema change, NO app.module edit.
 *
 * Events:   view (w=1) / cart (w=3) / purchase (w=5) — weights mirror
 *           ProductRankingService WEIGHT_VIEW/CART_ADD/PURCHASE defaults.
 * Windows:  24h / 7d / 30d as separate ZSets fed on every event.
 * Modes:    smart=composite/7d, trending=composite/24h,
 *           most_viewed=views-only/7d, bestseller=purchases-only/30d.
 * Scope:    `all` (every category together) or `cat:{normalized}` (one category).
 *           Every event writes to BOTH the `all` key and its category key.
 * Anti-abuse: per-actor hourly velocity caps + 10-min view dedupe.
 */

export type R9EventType = 'view' | 'cart' | 'purchase';
export type R9Mode = 'smart' | 'trending' | 'bestseller' | 'most_viewed';
export type R9Window = '24h' | '7d' | '30d';

export interface R9RecordEventDto {
  event: R9EventType;
  productId: string;
  category?: string;
  quantity?: number;
  actor?: string; // userId || sessionId || ip || 'anon'
}

export interface R9RankedQuery {
  mode?: R9Mode;
  category?: string;
  limit?: number;
  offset?: number;
}

const WEIGHTS: Record<R9EventType, number> = { view: 1, cart: 3, purchase: 5 };

// Per-actor hourly caps: generous for legit traffic, fatal for spam loops.
const VELOCITY_CAPS: Record<R9EventType, number> = { view: 30, cart: 20, purchase: 20 };
const VIEW_DEDUPE_TTL_S = 600;

function normCat(category?: string): string {
  const c = (category || 'all').trim().toLowerCase();
  if (!c || c === 'all') return 'all';
  return `cat:${c.replace(/\s+/g, '_')}`;
}

function hourBucket(now = Date.now()): string {
  return String(Math.floor(now / 3_600_000));
}

@Injectable()
export class DynamicRankingR9Service {
  constructor(
    private readonly redis: RedisService,
    // F9 — optional so existing direct constructions (specs) keep working;
    // absent connection fails open (recommendations stay on).
    @Optional() @InjectConnection() private readonly conn?: Connection,
  ) {}

  /** Window ZSet key. kind=composite|views|purchases. */
  keyFor(window: R9Window, category: string | undefined, kind: 'composite' | 'views' | 'purchases' = 'composite'): string {
    const scope = normCat(category);
    const base = `rank:r9:${window}:${scope}`;
    if (kind === 'composite') return base;
    return `${base}:${kind}`;
  }

  /** Mode -> (window, kind) mapping. Single source of truth for the ONE read API. */
  resolveMode(mode: R9Mode | undefined): { window: R9Window; kind: 'composite' | 'views' | 'purchases' } {
    switch (mode) {
      case 'trending':
        return { window: '24h', kind: 'composite' };
      case 'most_viewed':
        return { window: '7d', kind: 'views' };
      case 'bestseller':
        return { window: '30d', kind: 'purchases' };
      case 'smart':
      default:
        return { window: '7d', kind: 'composite' };
    }
  }

  private actorOf(dto: R9RecordEventDto): string {
    return (dto.actor || 'anon').trim() || 'anon';
  }

  /**
   * Ingest one ranking event across all windows + category scope.
   * Returns counted=false when deduped or velocity-capped (never throws for abuse).
   */
  async recordEvent(dto: R9RecordEventDto): Promise<{ counted: boolean; capped?: boolean; deduped?: boolean }> {
    const productId = (dto.productId || '').trim();
    if (!productId) return { counted: false };
    const qty = Math.max(1, Math.floor(dto.quantity || 1));
    const actor = this.actorOf(dto);
    const scope = normCat(dto.category);

    // 1. View dedupe: same actor+product within 10 min counts once.
    if (dto.event === 'view') {
      const dedupeKey = `rank:r9:dedupe:view:${productId}:${actor}`;
      if (await this.redis.exists(dedupeKey)) {
        return { counted: false, deduped: true };
      }
      await this.redis.set(dedupeKey, '1', VIEW_DEDUPE_TTL_S);
    }

    // 2. Per-actor hourly velocity cap (sliding hour bucket, 2h TTL safety).
    const velKey = `rank:r9:vel:${dto.event}:${actor}:${hourBucket()}`;
    const used = await this.redis.incr(velKey);
    if (used === 1) await this.redis.expire(velKey, 7200);
    if (used > VELOCITY_CAPS[dto.event]) {
      return { counted: false, capped: true };
    }

    // 3. Fan-out to every window, both `all` and category scope.
    const weight = WEIGHTS[dto.event] * (dto.event === 'view' ? 1 : qty);
    const windows: R9Window[] = ['24h', '7d', '30d'];
    const scopes = scope === 'all' ? ['all'] : ['all', scope];
    for (const w of windows) {
      for (const s of scopes) {
        const cat = s === 'all' ? 'all' : s.slice(4);
        await this.redis.zincrby(this.keyFor(w, cat), weight, productId);
        if (dto.event === 'view') {
          await this.redis.zincrby(this.keyFor(w, cat, 'views'), weight, productId);
        }
        if (dto.event === 'purchase') {
          await this.redis.zincrby(this.keyFor(w, cat, 'purchases'), weight, productId);
        }
      }
    }
    return { counted: true };
  }

  /** ONE read path: ranked ids for a mode + category scope with pagination. */
  async getRankedIds(query: R9RankedQuery): Promise<{ ids: string[]; total: number; mode: R9Mode; window: R9Window }> {
    const mode: R9Mode = query.mode || 'smart';
    const { window, kind } = this.resolveMode(mode);
    // F9 (15.12) — recommendations kill switch: this path has no local
    // non-personalized source (Redis-only), so the honest degraded answer is
    // an empty list rather than a fabricated ranking.
    if (await isKilled('recommendations', connectionFlagSource(this.conn))) {
      return { ids: [], total: 0, mode, window };
    }
    const key = this.keyFor(window, query.category, kind);
    const limit = Math.min(100, Math.max(1, Math.floor(query.limit || 20)));
    const offset = Math.max(0, Math.floor(query.offset || 0));
    const total = await this.redis.zcard(key);
    if (total === 0) return { ids: [], total: 0, mode, window };
    const ids = await this.redis.zrevrange(key, offset, offset + limit - 1);
    return { ids, total, mode, window };
  }
}
