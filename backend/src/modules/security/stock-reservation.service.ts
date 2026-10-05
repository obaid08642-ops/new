import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface StockReservationResult {
  success: boolean;
  reservationId?: string;
  reservedItems: { medicineId: string; qty: number; pharmacyId: string }[];
  error?: string;
  ttlSeconds?: number;
}

export interface StockReleaseResult {
  success: boolean;
  releasedItems: { medicineId: string; qty: number; pharmacyId: string }[];
  error?: string;
}

export interface StockCheckResult {
  available: boolean;
  availableQty: number;
  medicineId: string;
  pharmacyId: string;
}

export interface ReservationItem {
  medicineId: string;
  qty: number;
}

export interface ActiveReservation {
  reservationId: string;
  items: ReservationItem[];
  ttl: number;
}

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);

  // Default TTL for stock reservations (15 minutes)
  private readonly DEFAULT_RESERVATION_TTL_SECONDS = 15 * 60;
  // Max TTL (1 hour)
  private readonly MAX_RESERVATION_TTL_SECONDS = 60 * 60;
  // Lua script for atomic check-and-reserve
  private readonly RESERVE_SCRIPT = `
    local reservationKey = KEYS[1]
    local stockKey = KEYS[2]
    local reservationId = ARGV[1]
    local ttl = tonumber(ARGV[2])
    local items = cjson.decode(ARGV[3])
    
    -- Check all items have sufficient stock first
    for i = 1, #items do
      local item = items[i]
      local stock = tonumber(redis.call('HGET', stockKey, item.medicineId) or '0')
      if stock < item.qty then
        return {0, 'insufficient_stock:' .. item.medicineId .. ':' .. stock}
      end
    end
    
    -- All items available, create reservation
    redis.call('SET', reservationKey, ARGV[3], 'EX', ttl)
    
    -- Decrement stock atomically
    for i = 1, #items do
      local item = items[i]
      redis.call('HINCRBY', stockKey, item.medicineId, -item.qty)
    end
    
    return {1, reservationId}
  `;

  // Lua script for atomic release
  private readonly RELEASE_SCRIPT = `
    local reservationKey = KEYS[1]
    local stockKey = KEYS[2]
    local reservationData = redis.call('GET', reservationKey)
    
    if not reservationData then
      return {0, 'reservation_not_found_or_expired'}
    end
    
    local items = cjson.decode(reservationData)
    
    -- Restore stock
    for i = 1, #items do
      local item = items[i]
      redis.call('HINCRBY', stockKey, item.medicineId, item.qty)
    end
    
    -- Delete reservation
    redis.call('DEL', reservationKey)
    
    return {1, cjson.encode(items)}
  `;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Reserve stock atomically using Redis distributed lock (SETNX with TTL).
   * Uses Lua script for atomic check-and-reserve to prevent race conditions.
   */
  async reserveStock(
    pharmacyId: string,
    items: { medicineId: string; qty: number }[],
    ttlSeconds: number = 900, // 15 minutes default
  ): Promise<StockReservationResult> {
    const reservationId = `res_${uuidv4()}`;
    const reservationKey = `stock:reservation:${pharmacyId}:${reservationId}`;
    const stockKey = `stock:pharmacy:${pharmacyId}`;
    const ttl = Math.min(Math.max(ttlSeconds, 60), this.MAX_RESERVATION_TTL_SECONDS);

    const itemsJson = JSON.stringify(items);

    try {
      // Use Redis eval for atomic operation
      const client = this.redisService.getClient();
      const result = await client.eval(
        this.RESERVE_SCRIPT,
        2,
        reservationKey,
        stockKey,
        reservationId,
        ttl,
        itemsJson,
      ) as [number, string];

      const [success, message] = result;
      
      if (success === 1) {
        this.logger.log(`Stock reserved: ${reservationId} for pharmacy ${pharmacyId}, items: ${items.length}`);
        return {
          success: true,
          reservationId,
          reservedItems: items.map(i => ({ ...i, pharmacyId })),
          ttlSeconds: ttl,
        };
      } else {
        const [, errorDetail] = message.split(':');
        const medicineId = errorDetail;
        const available = parseInt(message.split(':')[2] || '0', 10);
        return {
          success: false,
          reservedItems: [],
          error: `Insufficient stock for ${medicineId}: ${available} available`,
        };
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Stock reservation failed: ${err.message}`, err.stack);
      // Fallback to non-atomic if Lua script fails
      return this.reserveStockFallback(pharmacyId, items, ttl, reservationId);
    }
  }

  /**
   * Fallback non-atomic reservation (used if Lua script unavailable).
   */
  private async reserveStockFallback(
    pharmacyId: string,
    items: { medicineId: string; qty: number }[],
    ttlSeconds: number,
    reservationId: string,
  ): Promise<StockReservationResult> {
    const stockKey = `stock:pharmacy:${pharmacyId}`;
    const reservationKey = `stock:reservation:${pharmacyId}:${reservationId}`;

    // Check all items first
    for (const item of items) {
      const available = await this.redisService.hget(stockKey, item.medicineId);
      const availableQty = available ? parseInt(available, 10) : 0;
      if (availableQty < item.qty) {
        return {
          success: false,
          reservedItems: [],
          error: `Insufficient stock for ${item.medicineId}: ${availableQty} available`,
        };
      }
    }

    // Try to create reservation with SETNX
    const lockKey = `stock:lock:${pharmacyId}`;
    const lockAcquired = await this.redisService.setnx(lockKey, reservationId);
    if (!lockAcquired) {
      return {
        success: false,
        reservedItems: [],
        error: 'Could not acquire stock lock, try again',
      };
    }

    try {
      // Decrement stock
      for (const item of items) {
        await this.redisService.hincrby(stockKey, item.medicineId, -item.qty);
      }

      // Store reservation
      await this.redisService.set(reservationKey, JSON.stringify(items), ttlSeconds);
      
      this.logger.log(`Stock reserved (fallback): ${reservationId} for pharmacy ${pharmacyId}`);
      return {
        success: true,
        reservationId,
        reservedItems: items.map(i => ({ ...i, pharmacyId })),
        ttlSeconds: ttlSeconds,
      };
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  /**
   * Release stock reservation (on payment failure/timeout).
   * Uses Lua script for atomic release.
   */
  async releaseReservation(pharmacyId: string, reservationId: string): Promise<StockReleaseResult> {
    const reservationKey = `stock:reservation:${pharmacyId}:${reservationId}`;
    const stockKey = `stock:pharmacy:${pharmacyId}`;

    try {
      const client = this.redisService.getClient();
      const result = await client.eval(
        this.RELEASE_SCRIPT,
        2,
        reservationKey,
        stockKey,
      ) as [number, string];

      const [success, message] = result;

      if (success === 1) {
        interface StockItem {
          medicineId: string;
          qty: number;
        }
        const releasedItems = JSON.parse(message) as StockItem[];
        this.logger.log(`Stock released: ${reservationId} for pharmacy ${pharmacyId}`);
        return {
          success: true,
          releasedItems: releasedItems.map(i => ({ ...i, pharmacyId })),
        };
      } else {
        return {
          success: false,
          releasedItems: [],
          error: message,
        };
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Stock release failed: ${err.message}`, err.stack);
      return this.releaseReservationFallback(pharmacyId, reservationId);
    }
  }

  /**
   * Fallback non-atomic release.
   */
  private async releaseReservationFallback(
    pharmacyId: string,
    reservationId: string,
  ): Promise<StockReleaseResult> {
    const reservationKey = `stock:reservation:${pharmacyId}:${reservationId}`;
    const stockKey = `stock:pharmacy:${pharmacyId}`;

    const reservationData = await this.redisService.get(reservationKey);
    if (!reservationData) {
      return {
        success: false,
        releasedItems: [],
        error: 'Reservation not found or expired',
      };
    }

    const items = JSON.parse(reservationData);
    
    // Restore stock
    for (const item of items) {
      await this.redisService.hincrby(stockKey, item.medicineId, item.qty);
    }

    // Delete reservation
    await this.redisService.del(reservationKey);

    interface StockItem {
      medicineId: string;
      qty: number;
    }
    return {
      success: true,
      releasedItems: (items as StockItem[]).map(i => ({ ...i, pharmacyId })),
    };
  }

  /**
   * Check stock availability without reserving.
   */
  async checkStock(pharmacyId: string, medicineId: string): Promise<StockCheckResult> {
    const stockKey = `stock:pharmacy:${pharmacyId}`;
    const available = await this.redisService.hget(stockKey, medicineId);
    const availableQty = available ? parseInt(available, 10) : 0;

    return {
      available: availableQty > 0,
      availableQty,
      medicineId,
      pharmacyId,
    };
  }

  /**
   * Initialize stock from database (call on pharmacy startup or inventory update).
   */
  async initializePharmacyStock(pharmacyId: string, items: { medicineId: string; qty: number }[]): Promise<void> {
    const stockKey = `stock:pharmacy:${pharmacyId}`;
    const pipeline = items.map(item => ['hset', stockKey, item.medicineId, String(item.qty)]);
    
    // Use hset for each item
    for (const item of items) {
      await this.redisService.hset(stockKey, item.medicineId, String(item.qty));
    }
    
    // Set expiry on stock key (24 hours, refreshed on updates)
    await this.redisService.expire(stockKey, 24 * 60 * 60);
    
    this.logger.log(`Initialized stock for pharmacy ${pharmacyId}: ${items.length} items`);
  }

  /**
   * Get all reserved items for a pharmacy (for monitoring).
   */
  async getActiveReservations(pharmacyId: string): Promise<ActiveReservation[]> {
    const pattern = `stock:reservation:${pharmacyId}:*`;
    const keys = await this.redisService.keys(pattern);
    const reservations = [];

    for (const key of keys) {
      const data = await this.redisService.get(key);
      const ttl = await this.redisService.ttl(key);
      if (data) {
        const reservationId = key.split(':').pop() || '';
        reservations.push({
          reservationId,
          items: JSON.parse(data),
          ttl,
        });
      }
    }

    return reservations;
  }

  /**
   * Extend reservation TTL (e.g., if payment is processing).
   */
  async extendReservation(pharmacyId: string, reservationId: string, additionalSeconds: number): Promise<boolean> {
    const reservationKey = `stock:reservation:${pharmacyId}:${reservationId}`;
    const currentTtl = await this.redisService.ttl(reservationKey);
    
    if (currentTtl <= 0) return false;
    
    const newTtl = Math.min(currentTtl + additionalSeconds, this.MAX_RESERVATION_TTL_SECONDS);
    await this.redisService.expire(reservationKey, newTtl);
    return true;
  }
}