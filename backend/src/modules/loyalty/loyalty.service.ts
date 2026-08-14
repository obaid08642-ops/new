import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { OnEvent } from '@nestjs/event-emitter';
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
  vitals_logged:      10,
};

const EARN_WAYS = [
  { action: 'استشارة طبية', pts: '+100', icon: 'stethoscope', color: '#23B5CE' },
  { action: 'طلب صيدلية', pts: '+50', icon: 'medication', color: '#5BA84F' },
  { action: 'تحليل مخبري', pts: '+75', icon: 'biotech', color: '#7A6BEA' },
  { action: 'إكمال الملف الصحي', pts: '+200', icon: 'assignment', color: '#F0A526' },
  { action: 'تحدي صحي', pts: '+150', icon: 'emoji_events', color: '#F0695C' },
  { action: 'إضافة فرد عائلة', pts: '+100', icon: 'group_add', color: '#EC4899' },
];

@Injectable()
export class LoyaltyService {
  constructor(
    @Inject('LoyaltyAccountRepository') private accountM: LoyaltyAccountRepository,
    @Inject('LoyaltyTransactionRepository') private txM: LoyaltyTransactionRepository,
    @Inject('LoyaltyChallengeRepository') private challengeM: LoyaltyChallengeRepository,
    @Inject('ChallengeProgressRepository') private progressM: ChallengeProgressRepository,
    @Inject('RewardRepository') private rewardM: RewardRepository,
    @Inject('RewardClaimRepository') private claimM: RewardClaimRepository,
  ) {}

  getTiers() {
    return TIERS;
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

    // Upsert account
    let account = await this.accountM.findOne({ user_id: userId });
    if (!account) {
      account = await this.accountM.create({ user_id: userId, points: 0, lifetime_points: 0, tier: 'bronze' });
    }

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
    });

    // Update challenge progress for this action
    await this.updateChallengeProgress(userId, reason);

    return { ok: true, points_awarded: pts, new_balance: newPoints, tier: newTier };
  }

  // ── Event Listeners ────────────────────────────────────────────────────────

  @OnEvent('booking.completed')
  async onBookingCompleted(payload: { user_id: string; booking_id: string }) {
    await this.awardPoints(payload.user_id, 'booking_completed', 'appointment', payload.booking_id);
  }

  @OnEvent('order.delivered')
  async onOrderDelivered(payload: { user_id: string; order_id: string }) {
    await this.awardPoints(payload.user_id, 'order_delivered', 'order', payload.order_id);
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
    await this.awardPoints(payload.user_id, 'vitals_logged', 'health');
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
    }));
  }

  // ── Account & Leaderboard ──────────────────────────────────────────────────

  async getAccount(userId: string) {
    let account = await this.accountM.findOne({ user_id: userId }).lean();
    if (!account) {
      account = await this.accountM.create({ user_id: userId, points: 0, lifetime_points: 0, tier: 'bronze' });
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
    let rewards = await this.rewardM.find({ active: true, stock: { $gt: 0 } }).sort({ points_required: 1 }).lean();
    if (rewards.length === 0) {
      const mockRewards = [
        { id: uuidv4(), title_ar: 'خصم 50 ريال', title_en: '50 SAR Discount', points_required: 500, reward_type: 'coupon', value: 50, active: true, stock: 100 },
        { id: uuidv4(), title_ar: 'استشارة مجانية', title_en: 'Free Consultation', points_required: 1500, reward_type: 'service', active: true, stock: 50 },
        { id: uuidv4(), title_ar: 'توصيل مجاني ×5', title_en: '5x Free Delivery', points_required: 300, reward_type: 'service', active: true, stock: 200 },
      ];
      await this.rewardM.insertMany(mockRewards);
      rewards = await this.rewardM.find({ active: true, stock: { $gt: 0 } }).sort({ points_required: 1 }).lean();
    }
    return rewards;
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
}
