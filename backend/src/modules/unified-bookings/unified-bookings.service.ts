import { Injectable, ConflictException } from '@nestjs/common';
import Redis from 'ioredis';
import { redisUrlFromEnv } from '../redis/redis.service';

@Injectable()
export class UnifiedBookingsService {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis(redisUrlFromEnv());
  }

  // D-004: the authoritative booking isolation window is 10 minutes.
  async acquireBookingLock(providerId: string, slotStartTimestamp: number, patientId: string): Promise<void> {
    const lockKey = `lock:provider:${providerId}:slot:${slotStartTimestamp}`;
    const ttlSeconds = 600; // 10-minute isolation lock (D-004)

    const lockAcquired = await this.redisClient.set(lockKey, patientId, 'EX', ttlSeconds, 'NX');

    if (!lockAcquired) {
      throw new ConflictException({
        code: 'CONCURRENT_SLOT_CONFLICT',
        message: 'هذا الوقت محجوز حالياً ومقفل لعملية حجز أخرى، يرجى المحاولة بعد 10 دقائق أو اختيار موعد آخر.'
      });
    }
  }

  /** Owner-checked release: only the patient that acquired the lock may clear it (F-C5). */
  async releaseBookingLock(providerId: string, slotStartTimestamp: number, patientId?: string): Promise<void> {
    const lockKey = `lock:provider:${providerId}:slot:${slotStartTimestamp}`;
    if (!patientId) {
      await this.redisClient.del(lockKey);
      return;
    }
    // Atomic compare-and-delete so a stranger can never free someone else's hold.
    const script = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
    await this.redisClient.eval(script, 1, lockKey, String(patientId));
  }
}
