import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface PresenceInfo {
  user_id: string;
  online: boolean;
  last_seen: number;
  device_count: number;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger('PresenceService');
  private readonly ONLINE_TTL = 30; // seconds
  private readonly PREFIX = 'presence:';

  constructor(private readonly redis: RedisService) {}

  private key(userId: string) { return `${this.PREFIX}${userId}`; }
  private deviceKey(userId: string) { return `${this.PREFIX}devices:${userId}`; }

  async setOnline(userId: string, socketId: string): Promise<void> {
    const now = Date.now();
    await this.redis.hmset(this.key(userId), {
      user_id: userId,
      online: 'true',
      last_seen: String(now),
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
}
