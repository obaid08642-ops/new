import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { logEvent } from '../../common/structured-logger';
import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { OnModuleInit } from '@nestjs/common';

/**
 * Patient referral program.
 *
 * Lifecycle:  registered → rewarded (on the referred user's first completed booking)
 * Rewards:    loyalty POINTS (not cash) — referrer gets referral_converted (100),
 *             the new user gets referral_welcome (50) via loyalty events.
 *
 * Fraud guards (apply-time):
 *  - code must exist
 *  - no self-referral
 *  - a user can be referred only once
 *  - only genuinely new users (account < 30 days, no completed bookings)
 *  - 16.12, one person per referral: the phone number of the account (from the account, never from the request) and the device
 *    of the session are stored only as keyed hashes, and a phone or a device that already took part in a referral - as the
 *    referred person, or as the referrer's own - cannot be used again. A unique index closes the race between two requests.
 *  - 16.12, reward cap: one referrer is rewarded for at most REFERRAL_MAX_REWARDS_PER_MONTH (default 10) conversions in 30
 *    days; the rest stay 'held' for an admin to look at, with no points.
 */
export const REFERRAL_IDENTITY_USED = 'referral_identity_already_used';
@Injectable()
export class ReferralService implements OnModuleInit {
  constructor(
    @InjectConnection() private connection: Connection,
    private events: EventEmitter2,
  ) {}

  /** 16.12: a keyed hash, so the raw phone number or device id is never stored in the referral data. */
  static identityHash(kind: 'phone' | 'device', value: string): string {
    const key = process.env.REFERRAL_HASH_KEY || process.env.JWT_SECRET || 'referral';
    return createHmac('sha256', key).update(`${kind}:${String(value).trim().toLowerCase()}`).digest('hex').slice(0, 40);
  }

  /** Max conversions one referrer is rewarded for in 30 days (REFERRAL_MAX_REWARDS_PER_MONTH, default 10). */
  static maxRewardsPerMonth(env: NodeJS.ProcessEnv = process.env): number {
    const n = parseInt(String(env.REFERRAL_MAX_REWARDS_PER_MONTH || ''), 10);
    return Number.isInteger(n) && n >= 0 ? n : 10;
  }

  async onModuleInit() {
    try {
      // one person per referral, enforced by the database: a phone or a device can be in one live referral only
      await this.invites.createIndex({ referred_user_id: 1 }, { unique: true, name: 'referred_user_unique' });
      await this.invites.createIndex({ referred_phone_hash: 1 }, { unique: true, name: 'referred_phone_unique', partialFilterExpression: { referred_phone_hash: { $type: 'string' }, status: { $in: ['registered', 'rewarded', 'held'] } } });
      await this.invites.createIndex({ referred_device_hash: 1 }, { unique: true, name: 'referred_device_unique', partialFilterExpression: { referred_device_hash: { $type: 'string' }, status: { $in: ['registered', 'rewarded', 'held'] } } });
    } catch (e: any) {
      // existing rows may already break an index; the application checks below still apply, and the error is visible
      logEvent('error', 'referral_index_failed', { error: e?.message }, 'referral');
    }
  }

  private get users() { return this.connection.db.collection('users'); }
  private get invites() { return this.connection.db.collection('referral_invites'); }

  private async generateCode(fullName?: string): Promise<string> {
    // Human-friendly prefix from name, random suffix, collision-checked
    const base = (fullName || 'NABD').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'NABD';
    for (let i = 0; i < 10; i++) {
      const code = `${base}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const clash = await this.users.findOne({ referral_code: code });
      if (!clash) return code;
    }
    return `NABD-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  /** Lazily assign a persistent referral code to the user. */
  async getOrCreateCode(userId: string): Promise<string> {
    const user: any = await this.users.findOne({ id: userId }, { projection: { referral_code: 1, full_name: 1 } });
    if (!user) throw new NotFoundException('user not found');
    if (user.referral_code) return user.referral_code;
    const code = await this.generateCode(user.full_name);
    await this.users.updateOne({ id: userId, referral_code: { $exists: false } }, { $set: { referral_code: code } });
    // Re-read in case of a race — whoever wrote first wins
    const after: any = await this.users.findOne({ id: userId }, { projection: { referral_code: 1 } });
    return after?.referral_code || code;
  }

  /** The devices a user has been seen on (hashes), so their own second account cannot be referred from the first. */
  private async rememberDevice(userId: string, deviceId?: string) {
    if (!deviceId) return;
    await this.users.updateOne({ id: userId }, { $addToSet: { referral_device_hashes: ReferralService.identityHash('device', deviceId) } });
  }

  /** Referrer dashboard: code, aggregate stats, invite list with real states. */
  async myDashboard(userId: string, deviceId?: string) {
    await this.rememberDevice(userId, deviceId);
    const code = await this.getOrCreateCode(userId);
    const invites = await this.invites
      .find({ referrer_id: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    const named = await this.users
      .find({ id: { $in: invites.map((i: any) => i.referred_user_id).filter(Boolean) } }, { projection: { id: 1, full_name: 1 } })
      .toArray();
    const nameById = new Map(named.map((u: any) => [u.id, u.full_name]));
    const stats = {
      total: invites.length,
      registered: invites.filter((i: any) => i.status === 'registered').length,
      rewarded: invites.filter((i: any) => i.status === 'rewarded').length,
      earned_points: invites.reduce((s: number, i: any) => s + (i.status === 'rewarded' ? (i.reward_points || 0) : 0), 0),
    };
    return {
      code,
      stats,
      invites: invites.map((i: any) => ({
        id: i.id,
        name: nameById.get(i.referred_user_id) || 'مستخدم جديد',
        status: i.status,
        reward_points: i.reward_points || 0,
        created_at: i.createdAt,
        rewarded_at: i.rewarded_at || null,
      })),
    };
  }

  /** A new user applies a referrer's code. */
  async apply(userId: string, rawCode: string, deviceId?: string) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('code is required');

    const referrer: any = await this.users.findOne({ referral_code: code }, { projection: { id: 1, phone: 1, referral_device_hashes: 1 } });
    if (!referrer) throw new NotFoundException('invalid referral code');
    if (referrer.id === userId) throw new BadRequestException('cannot use your own referral code');

    const me: any = await this.users.findOne({ id: userId }, { projection: { referred_by: 1, createdAt: 1, phone: 1, referral_device_hashes: 1 } });
    if (!me) throw new NotFoundException('user not found');
    if (me.referred_by) throw new ConflictException('a referral code was already applied to this account');

    // New-user guard: account younger than 30 days and no completed bookings
    const createdAt = me.createdAt ? new Date(me.createdAt).getTime() : Date.now();
    if (Date.now() - createdAt > 30 * 24 * 3600 * 1000) {
      throw new BadRequestException('referral codes can only be applied to new accounts');
    }
    const priorBookings = await this.connection.db.collection('appointments').countDocuments({
      patient_id: userId, status: 'COMPLETED',
    });
    if (priorBookings > 0) {
      throw new BadRequestException('referral codes can only be applied before your first completed booking');
    }

    const existing = await this.invites.findOne({ referred_user_id: userId });
    if (existing) throw new ConflictException('a referral code was already applied to this account');

    // 16.12: one person per referral. The phone is the account's own (verified at sign-up), the device is the session's.
    const phoneHash = me.phone ? ReferralService.identityHash('phone', String(me.phone)) : undefined;
    const deviceHash = deviceId ? ReferralService.identityHash('device', deviceId) : undefined;
    if (!phoneHash && !deviceHash) throw new BadRequestException('referral_identity_required');
    await this.rememberDevice(userId, deviceId);
    const referrerPhoneHash = referrer.phone ? ReferralService.identityHash('phone', String(referrer.phone)) : undefined;
    const referrerDevices: string[] = Array.isArray(referrer.referral_device_hashes) ? referrer.referral_device_hashes : [];
    if ((phoneHash && phoneHash === referrerPhoneHash) || (deviceHash && referrerDevices.includes(deviceHash))) {
      await this.flag(userId, referrer.id, 'self_referral_same_phone_or_device');
      throw new BadRequestException('cannot use your own referral code');
    }
    const clash = await this.invites.findOne({
      status: { $in: ['registered', 'rewarded', 'held'] },
      $or: [...(phoneHash ? [{ referred_phone_hash: phoneHash }] : []), ...(deviceHash ? [{ referred_device_hash: deviceHash }] : [])],
    });
    if (clash) {
      await this.flag(userId, referrer.id, 'identity_already_referred');
      throw new ConflictException(REFERRAL_IDENTITY_USED);
    }

    try {
      await this.invites.insertOne({
        id: uuidv4(),
        referrer_id: referrer.id,
        referred_user_id: userId,
        code,
        status: 'registered',
        reward_points: 0,
        referred_phone_hash: phoneHash,
        referred_device_hash: deviceHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    } catch (e: any) {
      // the unique indexes decide a race between two requests with the same person behind them
      if (e?.code === 11000) {
        await this.flag(userId, referrer.id, 'identity_already_referred');
        throw new ConflictException(REFERRAL_IDENTITY_USED);
      }
      throw e;
    }
    await this.users.updateOne({ id: userId }, { $set: { referred_by: referrer.id, referral_applied_at: new Date() } });
    return { ok: true, status: 'registered' };
  }

  /** Every domain completes through the workflow engine (service.completed); nothing emits booking.completed. */
  @OnEvent('service.completed')
  async onServiceCompleted(p: { patient_account_id?: string; entity_id?: string }) {
    if (p?.patient_account_id) await this.onBookingCompleted({ user_id: p.patient_account_id, booking_id: String(p.entity_id || '') });
  }

  /** Conversion: referred user's first completed booking rewards BOTH sides once. */
  @OnEvent('booking.completed')
  async onBookingCompleted(payload: { user_id: string; booking_id: string }) {
    if (!payload?.user_id) return;
    const invite: any = await this.invites.findOne({ referred_user_id: payload.user_id, status: 'registered' });
    if (!invite) return;

    // 16.12: a referrer is rewarded for a limited number of conversions in 30 days; the rest are held for review, with no points
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const rewardedRecently = await this.invites.countDocuments({ referrer_id: invite.referrer_id, status: 'rewarded', rewarded_at: { $gte: since } });
    if (rewardedRecently >= ReferralService.maxRewardsPerMonth()) {
      await this.invites.updateOne({ id: invite.id, status: 'registered' }, { $set: { status: 'held', held_reason: 'referrer_monthly_cap', held_at: new Date(), updatedAt: new Date() } });
      await this.flag(payload.user_id, invite.referrer_id, 'referrer_monthly_cap');
      return;
    }

    // Atomic claim — only one concurrent event can flip the state
    const claimed = await this.invites.updateOne(
      { id: invite.id, status: 'registered' },
      { $set: { status: 'rewarded', converted_at: new Date(), rewarded_at: new Date(), reward_points: 100, updatedAt: new Date() } },
    );
    if (!(claimed as any)?.modifiedCount) return;

    this.events.emit('referral.converted', { user_id: invite.referrer_id, referred_id: payload.user_id });
    this.events.emit('referral.welcome_bonus', { user_id: payload.user_id, referral_id: invite.id });
  }

  /** A refused or held referral is a security event the admin can read; it never carries the phone or the device. */
  private async flag(userId: string, referrerId: string, reason: string) {
    await this.connection.db.collection('security_events').insertOne({
      type: 'referral_blocked', reason, user_id: userId, referrer_id: referrerId, at: new Date(),
    } as any).catch(() => undefined);
  }
}
