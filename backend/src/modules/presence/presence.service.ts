import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface PresenceInfo {
  user_id: string;
  online: boolean;
  last_seen: number;
  device_count: number;
}

export type PresencePlatform = 'patient-web' | 'patient-app' | 'provider-app' | 'admin' | 'unknown';
const KNOWN_PLATFORMS: PresencePlatform[] = ['patient-web', 'patient-app', 'provider-app', 'admin'];

export function normalizePlatform(input: unknown): PresencePlatform {
  const v = String(input || '').trim();
  return (KNOWN_PLATFORMS as string[]).includes(v) ? (v as PresencePlatform) : 'unknown';
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger('PresenceService');
  private readonly ONLINE_TTL = 30; // seconds
  private readonly PREFIX = 'presence:';

  constructor(private readonly redis: RedisService) {}

  private key(userId: string) { return `${this.PREFIX}${userId}`; }
  private deviceKey(userId: string) { return `${this.PREFIX}devices:${userId}`; }

  async setOnline(userId: string, socketId: string, opts?: { platform?: unknown; role?: unknown }): Promise<void> {
    const now = Date.now();
    await this.redis.hmset(this.key(userId), {
      user_id: userId,
      online: 'true',
      last_seen: String(now),
      platform: normalizePlatform(opts?.platform),
      role: String(opts?.role || ''),
    });
    await this.redis.expire(this.key(userId), this.ONLINE_TTL);
    await this.redis.sadd(this.deviceKey(userId), socketId);
    await this.redis.expire(this.deviceKey(userId), this.ONLINE_TTL);
  }

  async setOffline(userId: string, socketId: string): Promise<void> {
    await this.redis.srem(this.deviceKey(userId), socketId);
    const devices = await this.redis.smembers(this.deviceKey(userId));
    const now = Date.now();
    if (devices.length === 0) {
      await this.redis.hmset(this.key(userId), {
        user_id: userId,
        online: 'false',
        last_seen: String(now),
      });
      await this.redis.expire(this.key(userId), 86400); // keep for 24h
    } else {
      // Still has other active devices - refresh TTL
      await this.redis.expire(this.key(userId), this.ONLINE_TTL);
    }
  }

  async heartbeat(userId: string, socketId: string): Promise<void> {
    await this.redis.expire(this.key(userId), this.ONLINE_TTL);
    await this.redis.expire(this.deviceKey(userId), this.ONLINE_TTL);
  }

  async isOnline(userId: string): Promise<boolean> {
    const val = await this.redis.hget(this.key(userId), 'online');
    if (val !== 'true') return false;
    // Check if key still alive (TTL > 0)
    return await this.redis.exists(this.key(userId));
  }

  async getPresence(userId: string): Promise<PresenceInfo> {
    const data = await this.redis.hgetall(this.key(userId));
    const devices = await this.redis.smembers(this.deviceKey(userId));
    const exists = await this.redis.exists(this.key(userId));
    return {
      user_id: userId,
      online: exists && data?.online === 'true',
      last_seen: data?.last_seen ? parseInt(data.last_seen) : 0,
      device_count: devices.length,
    };
  }

  async getBulkPresence(userIds: string[]): Promise<PresenceInfo[]> {
    return Promise.all(userIds.map(id => this.getPresence(id)));
  }

  async getLastSeen(userId: string): Promise<Date | null> {
    const ts = await this.redis.hget(this.key(userId), 'last_seen');
    return ts ? new Date(parseInt(ts)) : null;
  }

  /**
   * Admin aggregate: who is online right now, by platform and role.
   * Bounded SCAN (default 3000 keys) — cheap, no KEYS blocking.
   */
  async countOnline(limit = 3000): Promise<{ total: number; by_platform: Record<string, number>; by_role: Record<string, number>; sample: Array<{ user_id: string; platform: string; role: string; last_seen: number }> }> {
    const by_platform: Record<string, number> = {};
    const by_role: Record<string, number> = {};
    const sample: Array<{ user_id: string; platform: string; role: string; last_seen: number }> = [];
    let total = 0;
    try {
      const client: any = (this.redis as any).getClient ? (this.redis as any).getClient() : (this.redis as any).client;
      if (!client || typeof client.scan !== 'function') return { total: 0, by_platform, by_role, sample };
      let cursor = '0';
      do {
        const [next, keys]: [string, string[]] = await client.scan(cursor, 'MATCH', `${this.PREFIX}*`, 'COUNT', 200);
        cursor = next;
        for (const k of keys) {
          if (k.includes(':devices:')) continue;
          if (total >= limit) break;
          const h: any = await this.redis.hgetall(k).catch(() => null);
          if (!h || h.online !== 'true') continue;
          const platform = normalizePlatform(h.platform);
          const role = String(h.role || 'unknown');
          total++;
          by_platform[platform] = (by_platform[platform] || 0) + 1;
          by_role[role] = (by_role[role] || 0) + 1;
          if (sample.length < 25) sample.push({ user_id: String(h.user_id || k), platform, role, last_seen: Number(h.last_seen) || 0 });
        }
        if (total >= limit) break;
      } while (cursor !== '0');
    } catch { /* observability must never break */ }
    return { total, by_platform, by_role, sample };
  }
}
