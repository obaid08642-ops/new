import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';

/** C5: admin session idle timeout is 15 minutes of no API activity. */
export const ADMIN_IDLE_TTL_SECONDS = 15 * 60;

@Injectable()
export class AdminSessionService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly redis: RedisService,
  ) {}

  private key(userId: string) {
    return `admin_activity:${userId}`;
  }

  /** Mark activity now (sliding window). Called on every authenticated admin request. */
  async touch(userId: string): Promise<void> {
    try {
      const client = (this.redis as any).getClient?.();
      if (!client) return;
      await client.set(this.key(userId), String(Date.now()), 'EX', ADMIN_IDLE_TTL_SECONDS);
    } catch {
      // Redis down — fail open on activity tracking only (the JWT expiry still applies).
    }
  }

  /** True when the session has been idle longer than the limit. */
  async isIdleExpired(userId: string): Promise<boolean> {
    try {
      const client = (this.redis as any).getClient?.();
      if (!client) return false;
      const val = await client.get(this.key(userId));
      if (!val) return true; // no activity record — treat as expired
      return Date.now() - Number(val) > ADMIN_IDLE_TTL_SECONDS * 1000;
    } catch {
      return false;
    }
  }

  async clear(userId: string): Promise<void> {
    try {
      const client = (this.redis as any).getClient?.();
      if (client) await client.del(this.key(userId));
    } catch {
      /* ignore */
    }
  }

  /** C5: record every admin login (success or failure) for the audit trail. */
  async recordLoginAttempt(userId: string | null, email: string, ok: boolean, ip?: string, ua?: string): Promise<void> {
    try {
      await this.conn.collection('admin_login_attempts').insertOne({
        id: require('crypto').randomUUID(),
        user_id: userId,
        email,
        ok,
        ip: ip || null,
        ua: (ua || '').slice(0, 200),
        createdAt: new Date(),
      });
    } catch {
      /* audit write must never break login */
    }
  }
}
