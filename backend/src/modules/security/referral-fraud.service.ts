import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../../modules/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface ReferralValidationResult {
  allowed: boolean;
  reason?: string;
  fraudFlags?: string[];
  riskScore?: number;
}

export interface DeviceFingerprintData {
  deviceId: string;
  phoneHash: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface ReferralApplyResult {
  success: boolean;
  referralId?: string;
  rewardPoints?: number;
  blocked?: boolean;
  reason?: string;
}

@Injectable()
export class ReferralFraudService {
  private readonly logger = new Logger(ReferralFraudService.name);

  // One device per referral
  private readonly MAX_REFERRALS_PER_DEVICE = 1;
  // One phone number per referral
  private readonly MAX_REFERRALS_PER_PHONE = 1;
  // Self-referral check
  private readonly BLOCK_SELF_REFERRAL = true;
  // Device fingerprint TTL (30 days)
  private readonly DEVICE_FINGERPRINT_TTL = 30 * 24 * 60 * 60;
  // Phone hash TTL (90 days)
  private readonly PHONE_HASH_TTL = 90 * 24 * 60 * 60;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
  ) {}

  private get invitesCol() {
    return this.connection.collection('referral_invites');
  }

  private get usersCol() {
    return this.connection.collection('users');
  }

  private get fraudAlertsCol() {
    return this.connection.collection('fraud_alerts');
  }

  /**
   * Generate a consistent phone hash for tracking.
   * Uses SHA-256 with a secret salt from environment.
   */
  private hashPhone(phone: string): string {
    const salt = process.env.REFERRAL_PHONE_HASH_SALT || 'default-salt-change-in-production';
    return crypto.createHmac('sha256', salt).update(phone).digest('hex');
  }

  /**
   * Generate device fingerprint hash from components.
   */
  private hashDeviceFingerprint(deviceId: string, userAgent?: string, ip?: string): string {
    const salt = process.env.REFERRAL_DEVICE_HASH_SALT || 'default-device-salt-change-in-production';
    const payload = `${deviceId}|${userAgent || ''}|${ip || ''}`;
    return crypto.createHmac('sha256', salt).update(payload).digest('hex').substring(0, 32);
  }

  /**
   * Validate a referral application against fraud rules.
   * Checks: device fingerprint, phone hash, self-referral, velocity.
   */
  async validateReferral(
    referrerId: string,
    referredUserId: string,
    deviceId: string,
    phone: string,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<ReferralValidationResult> {
    const fraudFlags: string[] = [];
    let riskScore = 0;

    // 1. Self-referral check
    if (this.BLOCK_SELF_REFERRAL && referrerId === referredUserId) {
      fraudFlags.push('self_referral');
      riskScore += 100;
      await this.recordFraudAlert(referrerId, 'self_referral', 1.0, { deviceId, phoneHash: this.hashPhone(phone) });
      return { allowed: false, reason: 'self_referral_blocked', fraudFlags, riskScore };
    }

    // 2. Check if referred user already has a referral applied
    const existingInvite = await this.invitesCol.findOne({ referred_user_id: referredUserId });
    if (existingInvite) {
      fraudFlags.push('already_referred');
      riskScore += 50;
      return { allowed: false, reason: 'user_already_referred', fraudFlags, riskScore };
    }

    // 3. Device fingerprint check
    const deviceHash = this.hashDeviceFingerprint(deviceId, metadata?.userAgent, metadata?.ip);
    const deviceKey = `referral:device:${deviceHash}`;
    
    const existingDeviceReferral = await this.redisService.get(deviceKey);
    if (existingDeviceReferral) {
      fraudFlags.push('device_already_used');
      riskScore += 80;
      await this.recordFraudAlert(referredUserId, 'device_reuse', 0.9, { 
        deviceHash, 
        originalReferrer: existingDeviceReferral,
        phoneHash: this.hashPhone(phone),
      });
      return { allowed: false, reason: 'device_already_used_for_referral', fraudFlags, riskScore };
    }

    // 4. Phone hash check
    const phoneHash = this.hashPhone(phone);
    const phoneKey = `referral:phone:${phoneHash}`;
    
    const existingPhoneReferral = await this.redisService.get(phoneKey);
    if (existingPhoneReferral) {
      fraudFlags.push('phone_already_used');
      riskScore += 80;
      await this.recordFraudAlert(referredUserId, 'phone_reuse', 0.9, { 
        phoneHash, 
        originalReferrer: existingPhoneReferral,
        deviceHash,
      });
      return { allowed: false, reason: 'phone_already_used_for_referral', fraudFlags, riskScore };
    }

    // 5. Check referrer's device/phone usage (prevent referrer from gaming)
    const referrerDeviceKey = `referral:referrer:device:${referrerId}`;
    const referrerDeviceCount = await this.redisService.scard(referrerDeviceKey);
    if (referrerDeviceCount > 50) { // Arbitrary high threshold for referrer abuse
      fraudFlags.push('referrer_high_volume');
      riskScore += 30;
    }

    // 6. Velocity check - too many referrals from same IP in short time
    if (metadata?.ip) {
      const ipKey = `referral:ip:${metadata.ip}`;
      const ipCount = await this.redisService.incr(ipKey);
      if (ipCount === 1) await this.redisService.expire(ipKey, 3600); // 1 hour window
      
      if (ipCount > 10) {
        fraudFlags.push('ip_velocity_abuse');
        riskScore += 60;
        await this.recordFraudAlert(referrerId, 'ip_velocity', 0.7, { ip: metadata.ip, count: ipCount });
      }
    }

    // 7. Check if referrer exists and is valid
    const referrer = await this.usersCol.findOne({ id: referrerId }, { projection: { id: 1, referral_code: 1, role: 1 } });
    if (!referrer) {
      return { allowed: false, reason: 'invalid_referrer', fraudFlags, riskScore };
    }

    return { allowed: true, fraudFlags, riskScore };
  }

  /**
   * Record a successful referral application (marks device/phone as used).
   */
  async recordReferralApplication(
    referrerId: string,
    referredUserId: string,
    deviceId: string,
    phone: string,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<ReferralApplyResult> {
    const deviceHash = this.hashDeviceFingerprint(deviceId, metadata?.userAgent, metadata?.ip);
    const phoneHash = this.hashPhone(phone);
    const deviceKey = `referral:device:${deviceHash}`;
    const phoneKey = `referral:phone:${phoneHash}`;

    // Atomic check-and-set using Lua script to prevent race conditions
    const luaScript = `
      local deviceKey = KEYS[1]
      local phoneKey = KEYS[2]
      local referrerDeviceKey = KEYS[3]
      local ttl = tonumber(ARGV[1])
      local referrerId = ARGV[2]
      local referredId = ARGV[3]
      local deviceHash = ARGV[4]
      local phoneHash = ARGV[5]
      
      -- Check if already exists
      if redis.call('EXISTS', deviceKey) == 1 then
        return {0, 'device_exists'}
      end
      if redis.call('EXISTS', phoneKey) == 1 then
        return {0, 'phone_exists'}
      end
      
      -- Set both atomically
      redis.call('SET', deviceKey, referrerId, 'EX', ttl)
      redis.call('SET', phoneKey, referrerId, 'EX', ttl)
      redis.call('SADD', referrerDeviceKey, deviceHash)
      redis.call('EXPIRE', referrerDeviceKey, ttl)
      
      return {1, 'ok'}
    `;

    try {
      const client = this.redisService.getClient();
      const result = await client.eval(
        luaScript,
        3,
        deviceKey,
        phoneKey,
        `referral:referrer:device:${referrerId}`,
        this.DEVICE_FINGERPRINT_TTL,
        referrerId,
        referredUserId,
        deviceHash,
        phoneHash,
      ) as [number, string];

      const [success, message] = result;
      
      if (success === 0) {
        return {
          success: false,
          blocked: true,
          reason: message === 'device_exists' ? 'device_already_used' : 'phone_already_used',
        };
      }

      // Record in MongoDB for audit
      await this.invitesCol.insertOne({
        id: uuidv4(),
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        device_hash: deviceHash,
        phone_hash: phoneHash,
        ip: metadata?.ip,
        user_agent: metadata?.userAgent,
        status: 'registered',
        reward_points: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.log(`Referral recorded: referrer=${referrerId}, referred=${referredUserId}, device=${deviceHash.substring(0,8)}`);

      return { success: true, referralId: uuidv4() };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Referral recording failed: ${err.message}`, err.stack);
      // Fallback non-atomic
      return this.recordReferralFallback(referrerId, referredUserId, deviceHash, phoneHash, metadata);
    }
  }

  private async recordReferralFallback(
    referrerId: string,
    referredUserId: string,
    deviceHash: string,
    phoneHash: string,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<ReferralApplyResult> {
    const deviceKey = `referral:device:${deviceHash}`;
    const phoneKey = `referral:phone:${phoneHash}`;

    // Check both
    const [deviceExists, phoneExists] = await Promise.all([
      this.redisService.exists(deviceKey),
      this.redisService.exists(phoneKey),
    ]);

    if (deviceExists || phoneExists) {
      return {
        success: false,
        blocked: true,
        reason: deviceExists ? 'device_already_used' : 'phone_already_used',
      };
    }

    // Set both
    await Promise.all([
      this.redisService.set(deviceKey, referrerId, this.DEVICE_FINGERPRINT_TTL),
      this.redisService.set(phoneKey, referrerId, this.PHONE_HASH_TTL),
      this.redisService.sadd(`referral:referrer:device:${referrerId}`, deviceHash),
    ]);

    await this.invitesCol.insertOne({
      id: uuidv4(),
      referrer_id: referrerId,
      referred_user_id: referredUserId,
      device_hash: deviceHash,
      phone_hash: phoneHash,
      ip: metadata?.ip,
      user_agent: metadata?.userAgent,
      status: 'registered',
      reward_points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, referralId: uuidv4() };
  }

  /**
   * Record fraud alert for investigation.
   */
  private async recordFraudAlert(
    userId: string,
    flagType: string,
    confidence: number,
    details: Record<string, any>,
  ): Promise<void> {
    try {
      await this.fraudAlertsCol.insertOne({
        id: uuidv4(),
        userId,
        flagType,
        confidenceScore: confidence,
        severity: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
        details,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (e) {
      this.logger.warn(`Failed to record fraud alert: ${e}`);
    }
  }

  /**
   * Get referral fraud statistics for a user.
   */
  async getReferralFraudStats(userId: string): Promise<{
    deviceCount: number;
    phoneCount: number;
    referralCount: number;
    fraudFlags: string[];
  }> {
    const [deviceCount, phoneCount, referralCount, alerts] = await Promise.all([
      this.redisService.scard(`referral:referrer:device:${userId}`),
      this.redisService.scard(`referral:referrer:phone:${userId}`),
      this.invitesCol.countDocuments({ referrer_id: userId }),
      this.fraudAlertsCol.find({ userId }).toArray(),
    ]);

    return {
      deviceCount,
      phoneCount,
      referralCount,
      fraudFlags: [...new Set(alerts.map(a => a.flagType))],
    };
  }

  /**
   * Clean up expired referral tracking data (can be called via cron).
   */
  async cleanupExpiredTracking(): Promise<{ devicesCleaned: number; phonesCleaned: number }> {
    // Redis handles TTL automatically, but we can clean up MongoDB records
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await this.invitesCol.deleteMany({
      status: 'registered',
      createdAt: { $lt: thirtyDaysAgo },
    });

    return {
      devicesCleaned: 0, // Redis handles this
      phonesCleaned: 0,
    };
  }
}