import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

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
 */
@Injectable()
export class ReferralService {
  constructor(
    @InjectConnection() private connection: Connection,
    private events: EventEmitter2,
  ) {}

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

  /** Referrer dashboard: code, aggregate stats, invite list with real states. */
  async myDashboard(userId: string) {
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
  async apply(userId: string, rawCode: string) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('code is required');

    const referrer: any = await this.users.findOne({ referral_code: code }, { projection: { id: 1 } });
    if (!referrer) throw new NotFoundException('invalid referral code');
    if (referrer.id === userId) throw new BadRequestException('cannot use your own referral code');

    const me: any = await this.users.findOne({ id: userId }, { projection: { referred_by: 1, createdAt: 1 } });
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

    await this.invites.insertOne({
      id: uuidv4(),
      referrer_id: referrer.id,
      referred_user_id: userId,
      code,
      status: 'registered',
      reward_points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    await this.users.updateOne({ id: userId }, { $set: { referred_by: referrer.id, referral_applied_at: new Date() } });
    return { ok: true, status: 'registered' };
  }

  /** Conversion: referred user's first completed booking rewards BOTH sides once. */
  @OnEvent('booking.completed')
  async onBookingCompleted(payload: { user_id: string; booking_id: string }) {
    if (!payload?.user_id) return;
    const invite: any = await this.invites.findOne({ referred_user_id: payload.user_id, status: 'registered' });
    if (!invite) return;

    // Atomic claim — only one concurrent event can flip the state
    const claimed = await this.invites.updateOne(
      { id: invite.id, status: 'registered' },
      { $set: { status: 'rewarded', converted_at: new Date(), rewarded_at: new Date(), reward_points: 100, updatedAt: new Date() } },
    );
    if (!(claimed as any)?.modifiedCount) return;

    this.events.emit('referral.converted', { user_id: invite.referrer_id, referred_id: payload.user_id });
    this.events.emit('referral.welcome_bonus', { user_id: payload.user_id, referral_id: invite.id });
  }
}
