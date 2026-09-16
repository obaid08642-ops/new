import { Injectable, ConflictException } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { redisUrlFromEnv } from '../redis/redis.service';
// BullMQ types are available (bullmq ^5.80.2) — Queue is optional for write-behind;
// if no queue is injected we fall back to setImmediate so the caller never blocks.
import type { Queue as BullMQQueue } from 'bullmq';

@Injectable()
export class UnifiedBookingsService {
  private redisClient: Redis;
  // Optional BullMQ queue — injected when BullModule.registerQueue('bookings-write-behind') is configured.
  // Kept optional so the service works without BullMQ and falls back to setImmediate.
  private writeBehindQueue?: BullMQQueue;

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

  /**
   * Write-Behind slot reservation.
   *
   * 1. Redis slot check via acquireBookingLock (SET NX EX 300 — hincrby-like isolation)
   * 2. Immediate 201-style response with bookingId (caller does not wait for MongoDB)
   * 3. MongoDB persist happens asynchronously in background via BullMQ or setImmediate
   *
   * This is an additive, non-breaking helper — it does NOT replace the existing
   * booking creation flows. Use it for high-contention slot booking where
   * latency matters and eventual persistence is acceptable.
   */
  async reserveWithWriteBehind(
    providerId: string,
    slotTs: number,
    patientId: string,
    persistFn: () => Promise<any>,
  ): Promise<{ bookingId: string; queued: boolean }> {
    // Step 1: fast Redis slot check — throws ConflictException if already locked
    await this.acquireBookingLock(providerId, slotTs, patientId);

    const bookingId = randomUUID();

    const backgroundPersist = async () => {
      try {
        await persistFn();
      } catch (err) {
        // Persist failed — release the slot so it becomes available again.
        await this.releaseBookingLock(providerId, slotTs).catch(() => undefined);
        console.warn(`[write-behind] persist failed for booking ${bookingId}:`, (err as Error)?.message || err);
      }
    };

    // Step 2: prefer BullMQ if a queue was injected, else fire-and-forget via setImmediate
    if (this.writeBehindQueue?.add) {
      try {
        await this.writeBehindQueue.add(
          'persist-booking',
          { bookingId, providerId, slotTs, patientId },
          { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100 },
        );
        // Also chain the actual persistFn in-process as a supplement when using in-memory queue fallback
        // If the queue consumer is external, the persistFn will be executed by the worker;
        // here we ensure the provided callback still runs if no external worker is present.
        // To avoid double-writes, only fallback to setImmediate if queue add succeeded but no consumer:
        // we do NOT auto-execute persistFn when BullMQ is used — the worker is responsible.
        // If you want inline fallback, uncomment the next line:
        // setImmediate(() => void backgroundPersist());
      } catch {
        setImmediate(() => void backgroundPersist());
      }
    } else {
      setImmediate(() => void backgroundPersist());
    }

    // Step 3: return immediately — caller gets 201 with bookingId
    return { bookingId, queued: true };
  }

  /** Alias for spec compatibility — same write-behind semantics under the `reserveSlotWriteBehind` name. */
  async reserveSlotWriteBehind(
    providerId: string,
    slotTs: number,
    patientId: string,
    persistFn: () => Promise<any>,
  ): Promise<{ bookingId: string; queued: boolean }> {
    return this.reserveWithWriteBehind(providerId, slotTs, patientId, persistFn);
  }
}
