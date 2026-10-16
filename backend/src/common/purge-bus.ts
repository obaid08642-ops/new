import { Injectable, Optional } from '@nestjs/common';
import { RedisService } from '../modules/redis/redis.service';

/**
 * 14.8 — instant purge by tag.
 *
 * When a price, stock flag, provider status or content row changes, one
 * invalidation event must reach every layer that might serve the stale copy:
 *  1. shared Redis (DEL the keys indexed under each tag),
 *  2. Redis pub/sub on `cache:purge` (every API instance, plus any in-memory
 *     cache a future layer keeps),
 *  3. Cloudflare purge by Cache-Tag,
 *  4. Next.js `revalidateTag` (via the protected revalidate endpoint).
 *
 * Cloudflare and Next are called through injected `targets` so tests use stubs.
 * The DEFAULT targets read their credentials from env and THROW when missing —
 * a purge that silently skips the edge is worse than no purge call at all,
 * because the caller believes the stale copy is gone. Fail loudly.
 */
export interface PurgeTargets {
  cloudflare(tags: string[]): Promise<void>;
  next(tags: string[]): Promise<void>;
}

export const PURGE_CHANNEL = 'cache:purge';

export function defaultTargets(): PurgeTargets {
  return {
    async cloudflare(tags: string[]): Promise<void> {
      const token = process.env.CLOUDFLARE_API_TOKEN;
      const zone = process.env.CLOUDFLARE_ZONE_ID;
      if (!token || !zone) {
        throw new Error('purge_cloudflare_missing_credentials (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID)');
      }
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`purge_cloudflare_failed:${res.status}`);
    },
    async next(tags: string[]): Promise<void> {
      const url = process.env.NEXT_REVALIDATE_URL;
      const secret = process.env.NEXT_REVALIDATE_SECRET;
      if (!url || !secret) {
        throw new Error('purge_next_missing_credentials (NEXT_REVALIDATE_URL / NEXT_REVALIDATE_SECRET)');
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`purge_next_failed:${res.status}`);
    },
  };
}

@Injectable()
export class PurgeBus {
  constructor(
    private readonly redis: RedisService,
    @Optional() private readonly targets?: PurgeTargets,
  ) {}

  private get t(): PurgeTargets {
    return this.targets ?? defaultTargets();
  }

  /**
   * Invalidate every cached copy tagged with any of `tags`.
   * Emitted by price/stock/provider-status/content writes. A price change must
   * reach all four layers — the spec pins that none is skipped.
   */
  async purge(tags: string[]): Promise<void> {
    const unique = [...new Set((tags || []).filter(Boolean))];
    if (!unique.length) return;
    const client = this.redis.getClient();
    // 1+2. Shared Redis tag index + cross-instance pub/sub.
    try {
      for (const tag of unique) {
        const keys: string[] = (await (client as any).smembers?.(`cache:tag:${tag}`)) ?? [];
        if (keys.length) await client.del(...keys);
        await client.del(`cache:tag:${tag}`);
      }
      await this.redis.publish(PURGE_CHANNEL, JSON.stringify({ tags: unique, at: Date.now() }));
    } catch {
      // Redis down must not fail the write that triggered the purge — the
      // short TTLs are the backstop. But edge layers below still run, so a
      // stale edge copy is never left behind silently.
    }
    // 3+4. Edge layers. These THROW on missing credentials or HTTP failure —
    // fail loudly, so a caller never believes a stale edge copy is gone.
    await this.t.cloudflare(unique);
    await this.t.next(unique);
  }

  /** Subscribe once per instance so in-memory caches can invalidate on purge. */
  async subscribe(handler: (tags: string[]) => void): Promise<void> {
    await this.redis.subscribe(PURGE_CHANNEL, (msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed?.tags)) handler(parsed.tags);
      } catch {
        /* malformed purge event: ignore */
      }
    });
  }
}
