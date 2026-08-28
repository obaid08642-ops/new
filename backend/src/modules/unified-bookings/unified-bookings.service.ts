import { Injectable, ConflictException } from '@nestjs/common';
import Redis from 'ioredis';
import { redisUrlFromEnv } from '../redis/redis.service';

@Injectable()
export class UnifiedBookingsService {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis(redisUrlFromEnv());
  }

  async acquireBookingLock(providerId: string, slotStartTimestamp: number, patientId: string): Promise<void> {
    const lockKey = `lock:provider:${providerId}:slot:${slotStartTimestamp}`;
    const ttlSeconds = 300; // Enforce a 5-minute isolation lock for payment processing

    // Atomic transaction using SETNX wrapped parameter strings
    const lockAcquired = await this.redisClient.set(lockKey, patientId, 'EX', ttlSeconds, 'NX');

    if (!lockAcquired) {
      throw new ConflictException({
        code: 'CONCURRENT_SLOT_CONFLICT',
        message: 'هذا الوقت محجوز حالياً ومقفل لعملية دفع أخرى، يرجى المحاولة بعد 5 دقائق أو اختيار موعد آخر.'
      });
    }
  }

  async releaseBookingLock(providerId: string, slotStartTimestamp: number): Promise<void> {
    const lockKey = `lock:provider:${providerId}:slot:${slotStartTimestamp}`;
    await this.redisClient.del(lockKey);
  }
}
