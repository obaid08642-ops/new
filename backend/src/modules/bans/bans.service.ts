import { Injectable, BadRequestException, OnModuleInit, Inject, Optional } from '@nestjs/common';
import { Model } from 'mongoose';
import { Ban, BanDocument } from './bans.schema';
import { BanRepository } from "./repositories/ban.repository";
import { RedisService } from '../redis/redis.service';

// 14.13 — cross-worker ban visibility via a Redis read-through set.
// `activeBans` stays the sync hot path (`isBanned` is sync — used by
// BansMiddleware); Redis (`bans:active`) is the shared set workers converge on.
// Every Redis op is best-effort: when Redis is down we silently keep the
// historical local-only behavior.
const BANS_REDIS_KEY = 'bans:active';
// Short TTLs: a ban()/unban() on another worker becomes visible here within
// seconds, while hot negative checks skip Redis entirely.
const SNAPSHOT_TTL_MS = 10_000;
const NEGATIVE_TTL_MS = 10_000;

@Injectable()
export class BansService implements OnModuleInit {
  private activeBans = new Set<string>();
  private readonly negativeCache = new Map<string, number>();
  private lastSyncAt = 0;

  constructor(
    @Inject('BanRepository') private banModel: BanRepository,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async onModuleInit() {
    // Fast path: seed from the shared Redis set when available; otherwise
    // preserve the historical load-once-from-DB behavior.
    if (this.redis) {
      try {
        const members = await this.redis.smembers(BANS_REDIS_KEY);
        if (members && members.length) {
          this.activeBans = new Set(members);
          this.negativeCache.clear();
          this.lastSyncAt = Date.now();
          return;
        }
      } catch { /* fall through to DB load */ }
    }
    await this.refreshCache();
  }

  async refreshCache() {
    const bans = await this.banModel.find({ 
      is_active: true, 
      $or: [{ expires_at: { $exists: false } }, { expires_at: null }, { expires_at: { $gt: new Date() } }] 
    });
    this.activeBans.clear();
    for (const b of bans) {
      this.activeBans.add(`${b.type}:${b.value}`);
    }
    this.negativeCache.clear();
    this.lastSyncAt = Date.now();
    // Write-through: converge the shared Redis set (best-effort, local-only on failure).
    if (this.redis) {
      try {
        await this.redis.del(BANS_REDIS_KEY);
        if (this.activeBans.size) for (const id of this.activeBans) await this.redis.sadd(BANS_REDIS_KEY, id);
      } catch { /* local-only fallback */ }
    }
  }

  // TTL-gated full snapshot refresh from the shared set (cheap when fresh).
  private async ensureFresh(): Promise<void> {
    if (!this.redis) return;
    if (Date.now() - this.lastSyncAt < SNAPSHOT_TTL_MS) return;
    try {
      const members = await this.redis.smembers(BANS_REDIS_KEY);
      this.activeBans = new Set(members ?? []);
      this.negativeCache.clear();
      this.lastSyncAt = Date.now();
    } catch { /* local-only fallback */ }
  }

  async ban(adminId: string, type: 'ip' | 'device', value: string, reason?: string, expiresAt?: Date) {
    if (!value) throw new BadRequestException('Value is required');
    const b = await this.banModel.create({
      type,
      value,
      reason,
      banned_by_admin_id: adminId,
      expires_at: expiresAt
    });
    // Local write first (immediate visibility on this worker), then shared set.
    const member = `${type}:${value}`;
    this.activeBans.add(member);
    this.negativeCache.delete(member);
    if (this.redis) {
      try { await this.redis.sadd(BANS_REDIS_KEY, member); } catch { /* local-only fallback */ }
    }
    await this.refreshCache();
    return b;
  }

  async unban(value: string) {
    const res: any = await this.banModel.updateMany({ value }, { $set: { is_active: false } });
    if (!res.modifiedCount && !(await this.banModel.findOne({ value }))) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('ban_not_found');
    }
    // Clear both local + shared entries (`unban` addresses a value across types).
    for (const t of ['ip', 'device']) {
      const member = `${t}:${value}`;
      this.activeBans.delete(member);
      this.negativeCache.delete(member);
    }
    if (this.redis) {
      try { await this.redis.srem(BANS_REDIS_KEY, `ip:${value}`, `device:${value}`); } catch { /* local-only */ }
    }
    await this.refreshCache();
    return { success: true };
  }

  isBanned(type: 'ip' | 'device', value: string): boolean {
    return this.activeBans.has(`${type}:${value}`);
  }

  // Async read-through for cross-worker visibility: fresh negatives skip Redis,
  // everything else revalidates against the shared set. Falls back to the local
  // snapshot (refreshing it when stale) when Redis is unreachable.
  async isBannedAsync(type: 'ip' | 'device', value: string): Promise<boolean> {
    const member = `${type}:${value}`;
    const neg = this.negativeCache.get(member);
    if (neg !== undefined && neg > Date.now()) return false;
    if (this.redis) {
      try {
        const banned = await this.redis.sismember(BANS_REDIS_KEY, member);
        if (banned) {
          this.activeBans.add(member);
          return true;
        }
        this.activeBans.delete(member);
        this.negativeCache.set(member, Date.now() + NEGATIVE_TTL_MS);
        return false;
      } catch { /* Redis down → local-only answer below */ }
    }
    await this.ensureFresh();
    const hit = this.activeBans.has(member);
    if (!hit) this.negativeCache.set(member, Date.now() + NEGATIVE_TTL_MS);
    return hit;
  }

  async getBans() {
    return this.banModel.find({}).sort({ createdAt: -1 }).lean();
  }
}
