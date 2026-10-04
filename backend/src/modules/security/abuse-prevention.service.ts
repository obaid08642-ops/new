import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../../modules/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface CouponAttemptResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export interface LoyaltyPointsCheckResult {
  allowed: boolean;
  reason?: string;
  pointsExpiring?: number;
  expiryDate?: Date;
}

export interface StackingCheckResult {
  allowed: boolean;
  reason?: string;
  appliedDiscounts: { type: 'coupon' | 'loyalty'; amount: number }[];
}

@Injectable()
export class AbusePreventionService {
  private readonly logger = new Logger(AbusePreventionService.name);

  // Coupon abuse prevention: max 3 attempts per order per hour per user
  private readonly COUPON_MAX_ATTEMPTS_PER_HOUR = 3;
  private readonly COUPON_ATTEMPT_WINDOW_SECONDS = 3600;

  // Loyalty points expiry: points expire after 12 months of inactivity
  private readonly LOYALTY_POINTS_EXPIRY_MONTHS = 12;

  // Stacking prevention: only one coupon + loyalty per order
  private readonly MAX_DISCOUNT_TYPES_PER_ORDER = 2;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
  ) {}

  private get couponFailuresCol() {
    return this.connection.collection('coupon_failures');
  }

  private get loyaltyAccountsCol() {
    return this.connection.collection('loyalty_accounts');
  }

  private get loyaltyTransactionsCol() {
    return this.connection.collection('loyalty_transactions');
  }

  // ============ COUPON ABUSE PREVENTION ============

  /**
   * Check and record a coupon attempt for a user on a specific order.
   * Returns whether the attempt is allowed and remaining attempts.
   */
  async checkCouponAttempt(userId: string, orderId: string, couponCode: string): Promise<CouponAttemptResult> {
    const key = `coupon:attempts:${userId}:${orderId}`;
    
    // Check current attempts in Redis (fast path)
    const current = await this.redisService.get(key);
    const attempts = current ? parseInt(current, 10) : 0;

    if (attempts >= this.COUPON_MAX_ATTEMPTS_PER_HOUR) {
      const ttl = await this.redisService.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: ttl > 0 ? ttl : this.COUPON_ATTEMPT_WINDOW_SECONDS,
      };
    }

    // Increment atomically
    const newAttempts = await this.redisService.incr(key);
    if (newAttempts === 1) {
      await this.redisService.expire(key, this.COUPON_ATTEMPT_WINDOW_SECONDS);
    }

    // Also record in MongoDB for audit trail
    try {
      await this.couponFailuresCol.insertOne({
        id: uuidv4(),
        user_id: userId,
        order_id: orderId,
        coupon_code: couponCode.toUpperCase(),
        attempt_number: newAttempts,
        at: new Date(),
      });
    } catch (e) {
      this.logger.warn(`Failed to record coupon failure audit: ${e}`);
    }

    return {
      allowed: true,
      remaining: this.COUPON_MAX_ATTEMPTS_PER_HOUR - newAttempts,
    };
  }

  /**
   * Reset coupon attempts for a user/order (e.g., on successful application).
   */
  async resetCouponAttempts(userId: string, orderId: string): Promise<void> {
    const key = `coupon:attempts:${userId}:${orderId}`;
    await this.redisService.del(key);
  }

  // ============ LOYALTY POINTS EXPIRY ============

  /**
   * Check if user has expiring loyalty points and prevent abuse.
   * Returns expiry info and whether redemption is allowed.
   */
  async checkLoyaltyPointsExpiry(userId: string): Promise<LoyaltyPointsCheckResult> {
    const account: any = await this.loyaltyAccountsCol.findOne({ user_id: userId });
    if (!account) {
      return { allowed: true, reason: 'no_loyalty_account' };
    }

    const balance = Number(account.points ?? account.balance ?? 0);
    const lastActivity = account.last_activity_at ? new Date(account.last_activity_at) : null;
    const updatedAt = account.updatedAt ? new Date(account.updatedAt) : null;

    const latestActivity = lastActivity || updatedAt;
    if (!latestActivity) {
      return { allowed: true, reason: 'no_activity_record' };
    }

    const monthsSinceActivity = (Date.now() - latestActivity.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsSinceActivity >= this.LOYALTY_POINTS_EXPIRY_MONTHS) {
      // Points have expired - calculate how many
      const expiredPoints = balance;
      await this.loyaltyAccountsCol.updateOne(
        { user_id: userId },
        { $set: { points: 0, balance: 0, updatedAt: new Date() } },
      );
      
      await this.loyaltyTransactionsCol.insertOne({
        id: `lt_${uuidv4()}`,
        user_id: userId,
        points_delta: -expiredPoints,
        points: -expiredPoints,
        kind: 'expiry',
        reason: 'points_expired_inactivity',
        createdAt: new Date(),
      });

      return {
        allowed: false,
        reason: 'points_expired',
        pointsExpiring: expiredPoints,
        expiryDate: new Date(latestActivity.getTime() + this.LOYALTY_POINTS_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000),
      };
    }

    // Calculate points expiring soon (within 30 days)
    const monthsUntilExpiry = this.LOYALTY_POINTS_EXPIRY_MONTHS - monthsSinceActivity;
    const pointsExpiringSoon = monthsUntilExpiry <= 1 ? balance : 0;
    const expiryDate = new Date(latestActivity.getTime() + this.LOYALTY_POINTS_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000);

    return {
      allowed: true,
      pointsExpiring: pointsExpiringSoon,
      expiryDate,
    };
  }

  /**
   * Update last activity timestamp for loyalty account (called on any points change).
   */
  async updateLoyaltyActivity(userId: string): Promise<void> {
    await this.loyaltyAccountsCol.updateOne(
      { user_id: userId },
      { $set: { last_activity_at: new Date(), updatedAt: new Date() } },
      { upsert: true },
    );
  }

  // ============ STACKING PREVENTION ============

  /**
   * Validate that discount stacking rules are followed.
   * Only one coupon + one loyalty redemption per order.
   */
  async validateDiscountStacking(
    userId: string,
    orderId: string,
    couponDiscount: number,
    loyaltyPoints: number,
  ): Promise<StackingCheckResult> {
    const appliedDiscounts: { type: 'coupon' | 'loyalty'; amount: number }[] = [];
    
    if (couponDiscount > 0) appliedDiscounts.push({ type: 'coupon', amount: couponDiscount });
    if (loyaltyPoints > 0) appliedDiscounts.push({ type: 'loyalty', amount: loyaltyPoints });

    // Check existing discounts on this order
    const order: any = await this.connection.collection('orders').findOne({ id: orderId });
    const pharmacyOrder: any = await this.connection.collection('pharmacy_orders').findOne({ id: orderId });

    const existingOrder = order || pharmacyOrder;
    if (existingOrder) {
      if (existingOrder.coupon_discount > 0 && couponDiscount > 0) {
        return {
          allowed: false,
          reason: 'coupon_already_applied',
          appliedDiscounts: [{ type: 'coupon', amount: existingOrder.coupon_discount }],
        };
      }
      if (existingOrder.loyalty_points_used > 0 && loyaltyPoints > 0) {
        return {
          allowed: false,
          reason: 'loyalty_already_redeemed',
          appliedDiscounts: [{ type: 'loyalty', amount: existingOrder.loyalty_discount }],
        };
      }
    }

    // Check total discount types
    if (appliedDiscounts.length > this.MAX_DISCOUNT_TYPES_PER_ORDER) {
      return {
        allowed: false,
        reason: 'max_discount_types_exceeded',
        appliedDiscounts,
      };
    }

    return { allowed: true, appliedDiscounts };
  }

  // ============ GENERAL ABUSE TRACKING ============

  /**
   * Track expensive action attempts for rate limiting.
   */
  async trackExpensiveAction(
    userId: string,
    actionType: 'ai_call' | 'search' | 'upload',
    metadata?: Record<string, any>,
  ): Promise<{ allowed: boolean; remaining: number; window: string }> {
    const limits = {
      ai_call: { perMin: 20, perHour: 100 },
      search: { perMin: 60, perHour: 300 },
      upload: { perMin: 10, perHour: 50 },
    };

    const limit = limits[actionType];
    const now = Date.now();
    const minuteKey = `ratelimit:${actionType}:min:${userId}:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${actionType}:hour:${userId}:${Math.floor(now / 3600000)}`;

    const [minCount, hourCount] = await Promise.all([
      this.redisService.incr(minuteKey),
      this.redisService.incr(hourKey),
    ]);

    if (minCount === 1) await this.redisService.expire(minuteKey, 60);
    if (hourCount === 1) await this.redisService.expire(hourKey, 3600);

    const allowed = minCount <= limit.perMin && hourCount <= limit.perHour;
    const remaining = Math.min(
      Math.max(0, limit.perMin - minCount),
      Math.max(0, limit.perHour - hourCount),
    );

    return {
      allowed,
      remaining,
      window: allowed ? 'ok' : (minCount > limit.perMin ? 'minute' : 'hour'),
    };
  }
}