import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional, Inject } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { LoyaltyAccountRepository } from "./repositories/loyaltyaccount.repository";
import { LoyaltyTransactionRepository } from "./repositories/loyaltytransaction.repository";
import { LoyaltyChallengeRepository } from "./repositories/loyaltychallenge.repository";
import { ChallengeProgressRepository } from "./repositories/challengeprogress.repository";
import { RewardRepository } from "./repositories/reward.repository";
import { RewardClaimRepository } from "./repositories/rewardclaim.repository";

const TIERS = [
  { id: 'bronze', label: 'برونزي', icon: 'emoji_events', color: '#CD7C3C', minPts: 0, maxPts: 1000, perks: ['5% كاشباك على الاستشارات', 'أولوية حجز عادية'] },
  { id: 'silver', label: 'فضي', icon: 'emoji_events', color: '#8B9DB0', minPts: 1001, maxPts: 5000, perks: ['8% كاشباك', 'شحن مجاني من الصيدلية', 'أولوية حجز متقدمة'] },
  { id: 'gold', label: 'ذهبي', icon: 'emoji_events', color: '#F0A526', minPts: 5001, maxPts: 15000, perks: ['12% كاشباك', 'استشارة مجانية/شهر', 'دعم أولوية 24/7'] },
  { id: 'platinum', label: 'بلاتيني', icon: 'stars', color: '#23B5CE', minPts: 15001, maxPts: 999999, perks: ['15% كاشباك', '2 استشارة مجانية/شهر', 'مدير صحة شخصي', 'دخول حصري للعروض'] },
];

function calculateTier(lifetimePoints: number): string {
  return TIERS.find(t => lifetimePoints >= t.minPts && lifetimePoints <= t.maxPts)?.id ?? 'bronze';
}

const POINTS_TABLE: Record<string, number> = {
  booking_completed:  50,
  order_delivered:    30,
  review_submitted:   20,
  referral_converted: 100,
  referral_welcome:   50,
  vitals_logged:      10,
};

/** Earned points expire after this many days (lazy sweep on account read). */
const POINTS_TTL_DAYS = 365;

// Display list is DERIVED from POINTS_TABLE — the app can never show numbers
// that differ from what the engine actually awards.
const EARN_WAYS = [
  { action: 'استشارة طبية مكتملة', reason: 'booking_completed', icon: 'stethoscope', color: '#23B5CE' },
  { action: 'طلب صيدلية مكتمل', reason: 'order_delivered', icon: 'medication', color: '#5BA84F' },
  { action: 'تقييم خدمة', reason: 'review_submitted', icon: 'biotech', color: '#7A6BEA' },
  { action: 'دعوة صديق (عند أول حجز له)', reason: 'referral_converted', icon: 'group_add', color: '#EC4899' },
  { action: 'تسجيل مؤشرات حيوية', reason: 'vitals_logged', icon: 'assignment', color: '#F0A526' },
  { action: 'تحدي صحي', reason: null, ptsLabel: 'حسب التحدي', icon: 'emoji_events', color: '#F0695C' },
].map((w) => ({ ...w, pts: w.reason ? `+${POINTS_TABLE[w.reason]}` : (w as any).ptsLabel }));

@Injectable()
export class LoyaltyService {
  constructor(
    @Inject('LoyaltyAccountRepository') private accountM: LoyaltyAccountRepository,
    @Inject('LoyaltyTransactionRepository') private txM: LoyaltyTransactionRepository,
    @Inject('LoyaltyChallengeRepository') private challengeM: LoyaltyChallengeRepository,
    @Inject('ChallengeProgressRepository') private progressM: ChallengeProgressRepository,
    @Inject('RewardRepository') private rewardM: RewardRepository,
    @Inject('RewardClaimRepository') private claimM: RewardClaimRepository,
    @Optional() private events?: EventEmitter2,
    @Optional() @InjectConnection() private conn?: Connection,
  ) {}

  getTiers() {
    return TIERS;
  }

  /** Admin overrides from loyalty_config.global (PUT /loyalty/config) merged over defaults. */
  async getConfig() {
    let overrides: any = {};
    try {
      const doc: any = await (this as any).conn?.collection('loyalty_config')?.findOne({ key: 'global' });
      if (doc?.value && typeof doc.value === 'object') overrides = doc.value;
    } catch { /* defaults win */ }
    return {
      tiers: this.getTiers(),
      earn_ways: this.getEarnWays(),
      points_per_order: Number(overrides.points_per_order ?? 10),
      referral_points: Number(overrides.referral_points ?? 50),
    };
  }

  getEarnWays() {
    return EARN_WAYS;
  }

  // ── Points Engine ──────────────────────────────────────────────────────────

  /**
   * Award points to a user for a specific action.
   * Creates a LoyaltyAccount if one doesn't exist yet.
   */
  async awardPoints(userId: string, reason: string, refType?: string, refId?: string, overridePoints?: number) {
    const pts = overridePoints ?? POINTS_TABLE[reason] ?? 0;
    if (pts === 0) return { ok: true, points_awarded: 0 };

    // Idempotency: the same (reason, ref) pair can never be awarded twice —
    // guards against duplicate events and replay-based farming.
    if (refType && refId) {
      const dup = await this.txM.findOne({ user_id: userId, reason, ref_type: refType, ref_id: refId });
      if (dup) return { ok: true, points_awarded: 0, duplicate: true };
    }

    // Upsert account
    let account = await this.accountM.findOne({ user_id: userId });
    if (!account) {
      account = await this.accountM.create({ user_id: userId, points: 0, lifetime_points: 0, tier: 'bronze' });
    }

    const previousTier = account.tier ?? 'bronze';
    const newPoints = (account.points ?? 0) + pts;
    const newLifetime = (account.lifetime_points ?? 0) + pts;
    const newTier = calculateTier(newLifetime);

    await this.accountM.updateOne(
      { user_id: userId },
      { points: newPoints, lifetime_points: newLifetime, tier: newTier },
    );

    await this.txM.create({
      id: uuidv4(),
      user_id: userId,
      points_delta: pts,
      reason,
      ref_type: refType,
      ref_id: refId,
      expires_at: new Date(Date.now() + POINTS_TTL_DAYS * 24 * 3600 * 1000),
    });

    // Update challenge progress for this action
    await this.updateChallengeProgress(userId, reason);

    // S20: points-scenario notification hook (notifications module listens)
    try {
      this.events?.emit('loyalty.points_awarded', {
        user_id: userId, points: pts, reason,
        tier_changed: newTier !== previousTier, new_tier: newTier,
      });
    } catch { /* notification must never break points awarding */ }

    return { ok: true, points_awarded: pts, new_balance: newPoints, tier: newTier };
  }

  /**
   * Lazy points expiration: earn transactions past their TTL that were never
   * swept get deducted (balance floored at 0) and recorded as points_expired.
   * Runs on account read so every displayed balance is already honest.
   */
  private async sweepExpired(userId: string) {
    const now = new Date();
    const stale: any[] = await this.txM.find({
      user_id: userId,
      points_delta: { $gt: 0 },
      expires_at: { $lte: now },
      swept: { $ne: true },
    }).lean();
    if (!stale.length) return;
    const account: any = await this.accountM.findOne({ user_id: userId });
    const balance = account?.points ?? 0;
    const deduct = Math.min(balance, stale.reduce((s, t) => s + (t.points_delta || 0), 0));
    const ids = stale.map((t) => t.id ?? t._id);
    await this.txM.updateMany({ id: { $in: ids } } as any, { swept: true } as any);
    if (deduct > 0) {
      await this.accountM.updateOne({ user_id: userId }, { $inc: { points: -deduct } } as any);
      await this.txM.create({
        id: uuidv4(),
        user_id: userId,
        points_delta: -deduct,
        reason: 'points_expired',
        ref_type: 'expiration',
        ref_id: ids.join(','),
      });
    }
  }

  // ── Event Listeners ────────────────────────────────────────────────────────

  @OnEvent('booking.completed')
  async onBookingCompleted(payload: { user_id: string; booking_id: string }) {
    await this.awardPoints(payload.user_id, 'booking_completed', 'appointment', payload.booking_id);
  }

  @OnEvent('order.delivered')
  async onOrderDelivered(payload: { user_id?: string; patient_id?: string; order_id: string }) {
    // emitters send patient_id (orders/drivers); user_id kept for older callers
    const uid = payload?.user_id || payload?.patient_id;
    if (!uid) return;
    await this.awardPoints(uid, 'order_delivered', 'order', payload.order_id);
  }

  /** The workflow engine emits service.completed for every domain (pharmacy, lab, radiology, nursing,
   *  consultation). Nothing emitted booking.completed, so completed services never earned points. */
  @OnEvent('service.completed')
  async onServiceCompleted(p: { patient_account_id?: string; entity_type?: string; entity_id?: string }) {
    if (!p?.patient_account_id || !p?.entity_id) return;
    if (p.entity_type === 'order') await this.awardPoints(p.patient_account_id, 'order_delivered', 'order', p.entity_id);
    else await this.awardPoints(p.patient_account_id, 'booking_completed', 'appointment', p.entity_id);
  }

  @OnEvent('review.submitted')
  async onReviewSubmitted(payload: { user_id: string; review_id: string }) {
    await this.awardPoints(payload.user_id, 'review_submitted', 'review', payload.review_id);
  }

  @OnEvent('referral.converted')
  async onReferralConverted(payload: { user_id: string; referred_id: string }) {
    await this.awardPoints(payload.user_id, 'referral_converted', 'referral', payload.referred_id);
  }

  @OnEvent('health.vitals_logged')
  async onVitalsLogged(payload: { user_id: string }) {
    if (!payload?.user_id) return;
    // Anti-farming: at most 5 vitals awards per user per day
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const todayCount = await this.txM.countDocuments({
      user_id: payload.user_id, reason: 'vitals_logged', createdAt: { $gte: dayStart },
    } as any);
    if (todayCount >= 5) return;
    await this.awardPoints(payload.user_id, 'vitals_logged', 'health');
  }

  /** Welcome bonus for the REFERRED user once their invite converts. */
  @OnEvent('referral.welcome_bonus')
  async onReferralWelcome(payload: { user_id: string; referral_id: string }) {
    if (!payload?.user_id) return;
    await this.awardPoints(payload.user_id, 'referral_welcome', 'referral', payload.referral_id);
  }

  // ── Challenges ─────────────────────────────────────────────────────────────

  private async updateChallengeProgress(userId: string, action: string) {
    const now = new Date();
    const activeChallenges = await this.challengeM.find({
      target_action: action,
      active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
    }).lean();

    for (const ch of activeChallenges as any[]) {
      let progress: any = await this.progressM.findOne({ user_id: userId, challenge_id: ch.id });
      if (!progress) {
        progress = await this.progressM.create({ user_id: userId, challenge_id: ch.id, progress_count: 0, completed: false });
      }
      if (progress.completed) continue;
      const newCount = (progress.progress_count ?? 0) + 1;
      const completed = newCount >= ch.target_count;
      await this.progressM.updateOne(
        { user_id: userId, challenge_id: ch.id },
        { progress_count: newCount, completed, completed_at: completed ? new Date() : undefined },
      );
      if (completed) {
        await this.awardPoints(userId, 'challenge_completed', 'challenge', ch.id, ch.reward_points);
      }
    }
  }

  async getActiveChallenges(userId: string) {
    const now = new Date();
    const challenges = await this.challengeM.find({ active: true, start_date: { $lte: now }, end_date: { $gte: now } }).lean();
    const progressList = await this.progressM.find({ user_id: userId }).lean();
    const progressMap = Object.fromEntries((progressList as any[]).map((p: any) => [p.challenge_id, p]));
    return challenges.map((ch: any) => ({
      ...ch,
      user_progress: progressMap[ch.id]?.progress_count ?? 0,
      completed: progressMap[ch.id]?.completed ?? false,
      joined: !!progressMap[ch.id],
    }));
  }

  /**
   * Explicit opt-in to a challenge. Creates the progress record so the app can
   * distinguish "joined, 0 progress" from "not joined" honestly across reloads.
   */
  async joinChallenge(userId: string, challengeId: string) {
    const now = new Date();
    const ch: any = await this.challengeM.findOne({
      id: challengeId, active: true, start_date: { $lte: now }, end_date: { $gte: now },
    }).lean();
    if (!ch) throw new NotFoundException('التحدي غير موجود أو انتهى');
    const existing: any = await this.progressM.findOne({ user_id: userId, challenge_id: challengeId }).lean();
    if (existing) {
      return { ok: true, joined: true, user_progress: existing.progress_count ?? 0, completed: existing.completed ?? false };
    }
    await this.progressM.create({ user_id: userId, challenge_id: challengeId, progress_count: 0, completed: false });
    return { ok: true, joined: true, user_progress: 0, completed: false };
  }

  // ── Account & Leaderboard ──────────────────────────────────────────────────

  async getAccount(userId: string) {
    let account = await this.accountM.findOne({ user_id: userId }).lean();
    if (!account) {
      account = await this.accountM.create({ user_id: userId, points: 0, lifetime_points: 0, tier: 'bronze' });
    } else {
      await this.sweepExpired(userId);
      account = await this.accountM.findOne({ user_id: userId }).lean();
    }
    return account;
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [txs, total] = await Promise.all([
      this.txM.find({ user_id: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.txM.countDocuments({ user_id: userId }),
    ]);
    return { transactions: txs, total, page };
  }

  async getLeaderboard(limit = 50) {
    return this.accountM
      .find({})
      .sort({ lifetime_points: -1 })
      .limit(limit)
      .select({ user_id: 1, lifetime_points: 1, tier: 1, _id: 0 })
      .lean();
  }

  // ── Rewards ────────────────────────────────────────────────────────────────

  async listRewards() {
    return this.rewardM.find({ active: true, stock: { $gt: 0 } }).sort({ points_required: 1 }).lean();
  }

  async claimReward(userId: string, rewardId: string) {
    const reward: any = await this.rewardM.findOne({ id: rewardId, active: true }).lean();
    if (!reward) throw new NotFoundException('Reward not found or not available');

    const account: any = await this.accountM.findOne({ user_id: userId }).lean();
    if (!account || account.points < reward.points_required) {
      throw new BadRequestException(`Insufficient points. Required: ${reward.points_required}`);
    }

    // Deduct points
    await this.accountM.updateOne({ user_id: userId }, { $inc: { points: -reward.points_required } });
    await this.txM.create({
      id: uuidv4(),
      user_id: userId,
      points_delta: -reward.points_required,
      reason: 'reward_claimed',
      ref_type: 'reward',
      ref_id: rewardId,
    });

    // Reduce stock
    await this.rewardM.updateOne({ id: rewardId }, { $inc: { stock: -1 } });

    // Create claim record
    const couponCode = reward.reward_type === 'coupon'
      ? `NAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : undefined;
    const claim = await this.claimM.create({
      id: uuidv4(),
      user_id: userId,
      reward_id: rewardId,
      status: 'pending',
      coupon_code: couponCode,
    });

    return { ok: true, claim_id: claim.id, coupon_code: couponCode };
  }

  async getClaimedRewards(userId: string) {
    return this.claimM.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
  }

  // ── Admin: reward + challenge catalogue, config (LJ-08) ─────────────────────

  adminListRewards() {
    return this.rewardM.find({}).sort({ createdAt: -1 }).limit(200).lean();
  }

  async adminCreateReward(body: any) {
    this.assertRewardBody(body, true);
    const reward = await this.rewardM.create({
      id: uuidv4(),
      title_ar: String(body.title_ar).trim(),
      title_en: String(body.title_en).trim(),
      description: body.description,
      points_required: Number(body.points_required),
      reward_type: body.reward_type,
      value: body.value !== undefined ? Number(body.value) : undefined,
      image: body.image,
      stock: body.stock !== undefined ? Number(body.stock) : 999,
      active: body.active !== false,
    });
    return reward;
  }

  async adminUpdateReward(id: string, body: any) {
    const patch: any = {};
    for (const key of ['title_ar', 'title_en', 'description', 'reward_type', 'image']) if (body[key] !== undefined) patch[key] = body[key];
    for (const key of ['points_required', 'value', 'stock']) if (body[key] !== undefined) patch[key] = Number(body[key]);
    if (body.active !== undefined) patch.active = body.active === true;
    if (!Object.keys(patch).length) throw new BadRequestException('no reward fields to update');
    const updated = await this.rewardM.findOneAndUpdate({ id }, patch);
    if (!updated) throw new NotFoundException('reward not found');
    return updated;
  }

  async adminDeleteReward(id: string) {
    const updated = await this.rewardM.findOneAndUpdate({ id }, { active: false });
    if (!updated) throw new NotFoundException('reward not found');
    return { ok: true, id, active: false };
  }

  private assertRewardBody(body: any, requireAll: boolean) {
    if (requireAll && (!body?.title_ar || !body?.title_en || body?.points_required === undefined || !body?.reward_type)) {
      throw new BadRequestException('title_ar, title_en, points_required and reward_type are required');
    }
    if (body.points_required !== undefined && !(Number(body.points_required) > 0)) throw new BadRequestException('points_required must be positive');
    if (body.reward_type !== undefined && !['coupon', 'cashback', 'badge', 'gift'].includes(body.reward_type)) {
      throw new BadRequestException('reward_type must be coupon|cashback|badge|gift');
    }
  }

  adminListChallenges() {
    return this.challengeM.find({}).sort({ createdAt: -1 }).limit(200).lean();
  }

  async adminCreateChallenge(body: any) {
    if (!body?.title_ar || !body?.title_en || !body?.target_action || body?.reward_points === undefined || !body?.start_date || !body?.end_date) {
      throw new BadRequestException('title_ar, title_en, target_action, reward_points, start_date and end_date are required');
    }
    const start = new Date(body.start_date);
    const end = new Date(body.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new BadRequestException('end_date must be after start_date');
    return this.challengeM.create({
      id: uuidv4(),
      title_ar: String(body.title_ar).trim(),
      title_en: String(body.title_en).trim(),
      description: body.description,
      target_action: body.target_action,
      target_count: body.target_count !== undefined ? Number(body.target_count) : 1,
      reward_points: Number(body.reward_points),
      start_date: start,
      end_date: end,
      active: body.active !== false,
    });
  }

  async adminUpdateChallenge(id: string, body: any) {
    const patch: any = {};
    for (const key of ['title_ar', 'title_en', 'description', 'target_action']) if (body[key] !== undefined) patch[key] = body[key];
    for (const key of ['target_count', 'reward_points']) if (body[key] !== undefined) patch[key] = Number(body[key]);
    if (body.start_date !== undefined) patch.start_date = new Date(body.start_date);
    if (body.end_date !== undefined) patch.end_date = new Date(body.end_date);
    if (body.active !== undefined) patch.active = body.active === true;
    if (!Object.keys(patch).length) throw new BadRequestException('no challenge fields to update');
    if (patch.start_date && patch.end_date && patch.end_date <= patch.start_date) throw new BadRequestException('end_date must be after start_date');
    const updated = await this.challengeM.findOneAndUpdate({ id }, patch);
    if (!updated) throw new NotFoundException('challenge not found');
    return updated;
  }

  async adminDeleteChallenge(id: string) {
    const updated = await this.challengeM.findOneAndUpdate({ id }, { active: false });
    if (!updated) throw new NotFoundException('challenge not found');
    return { ok: true, id, active: false };
  }

  /** PUT /admin/loyalty/config — whitelisted keys only, audited. */
  async adminUpdateConfig(body: any, actor: any) {
    if (!this.conn) throw new BadRequestException('config_store_unavailable');
    const allowed = ['points_per_order', 'referral_points'];
    const patch: any = {};
    for (const key of allowed) if (body?.[key] !== undefined) {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < 0) throw new BadRequestException(`${key} must be a non-negative number`);
      patch[key] = value;
    }
    if (!Object.keys(patch).length) throw new BadRequestException(`no configurable keys supplied (allowed: ${allowed.join(', ')})`);
    const col = this.conn.collection('loyalty_config');
    const now = new Date();
    const existing: any = await col.findOne({ key: 'global' });
    await col.updateOne(
      { key: 'global' },
      {
        $set: { key: 'global', value: { ...(existing?.value || {}), ...patch }, updated_at: now, updated_by: actor?.id },
        $push: { audit: { at: now, by: actor?.id, changes: patch } } as any,
      },
      { upsert: true },
    );
    return this.getConfig();
  }
}
