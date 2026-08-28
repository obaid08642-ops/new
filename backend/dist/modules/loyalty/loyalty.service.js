"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const event_emitter_1 = require("@nestjs/event-emitter");
const loyaltyaccount_repository_1 = require("./repositories/loyaltyaccount.repository");
const loyaltytransaction_repository_1 = require("./repositories/loyaltytransaction.repository");
const loyaltychallenge_repository_1 = require("./repositories/loyaltychallenge.repository");
const challengeprogress_repository_1 = require("./repositories/challengeprogress.repository");
const reward_repository_1 = require("./repositories/reward.repository");
const rewardclaim_repository_1 = require("./repositories/rewardclaim.repository");
const TIERS = [
    { id: 'bronze', label: 'برونزي', icon: 'emoji_events', color: '#CD7C3C', minPts: 0, maxPts: 1000, perks: ['5% كاشباك على الاستشارات', 'أولوية حجز عادية'] },
    { id: 'silver', label: 'فضي', icon: 'emoji_events', color: '#8B9DB0', minPts: 1001, maxPts: 5000, perks: ['8% كاشباك', 'شحن مجاني من الصيدلية', 'أولوية حجز متقدمة'] },
    { id: 'gold', label: 'ذهبي', icon: 'emoji_events', color: '#F0A526', minPts: 5001, maxPts: 15000, perks: ['12% كاشباك', 'استشارة مجانية/شهر', 'دعم أولوية 24/7'] },
    { id: 'platinum', label: 'بلاتيني', icon: 'stars', color: '#23B5CE', minPts: 15001, maxPts: 999999, perks: ['15% كاشباك', '2 استشارة مجانية/شهر', 'مدير صحة شخصي', 'دخول حصري للعروض'] },
];
function calculateTier(lifetimePoints) {
    return TIERS.find(t => lifetimePoints >= t.minPts && lifetimePoints <= t.maxPts)?.id ?? 'bronze';
}
const POINTS_TABLE = {
    booking_completed: 50,
    order_delivered: 30,
    review_submitted: 20,
    referral_converted: 100,
    referral_welcome: 50,
    vitals_logged: 10,
};
const POINTS_TTL_DAYS = 365;
const EARN_WAYS = [
    { action: 'استشارة طبية مكتملة', reason: 'booking_completed', icon: 'stethoscope', color: '#23B5CE' },
    { action: 'طلب صيدلية مكتمل', reason: 'order_delivered', icon: 'medication', color: '#5BA84F' },
    { action: 'تقييم خدمة', reason: 'review_submitted', icon: 'biotech', color: '#7A6BEA' },
    { action: 'دعوة صديق (عند أول حجز له)', reason: 'referral_converted', icon: 'group_add', color: '#EC4899' },
    { action: 'تسجيل مؤشرات حيوية', reason: 'vitals_logged', icon: 'assignment', color: '#F0A526' },
    { action: 'تحدي صحي', reason: null, ptsLabel: 'حسب التحدي', icon: 'emoji_events', color: '#F0695C' },
].map((w) => ({ ...w, pts: w.reason ? `+${POINTS_TABLE[w.reason]}` : w.ptsLabel }));
let LoyaltyService = class LoyaltyService {
    constructor(accountM, txM, challengeM, progressM, rewardM, claimM, events) {
        this.accountM = accountM;
        this.txM = txM;
        this.challengeM = challengeM;
        this.progressM = progressM;
        this.rewardM = rewardM;
        this.claimM = claimM;
        this.events = events;
    }
    getTiers() {
        return TIERS;
    }
    getEarnWays() {
        return EARN_WAYS;
    }
    async awardPoints(userId, reason, refType, refId, overridePoints) {
        const pts = overridePoints ?? POINTS_TABLE[reason] ?? 0;
        if (pts === 0)
            return { ok: true, points_awarded: 0 };
        if (refType && refId) {
            const dup = await this.txM.findOne({ user_id: userId, reason, ref_type: refType, ref_id: refId });
            if (dup)
                return { ok: true, points_awarded: 0, duplicate: true };
        }
        let account = await this.accountM.findOne({ user_id: userId });
        if (!account) {
            account = await this.accountM.create({ user_id: userId, points: 0, lifetime_points: 0, tier: 'bronze' });
        }
        const previousTier = account.tier ?? 'bronze';
        const newPoints = (account.points ?? 0) + pts;
        const newLifetime = (account.lifetime_points ?? 0) + pts;
        const newTier = calculateTier(newLifetime);
        await this.accountM.updateOne({ user_id: userId }, { points: newPoints, lifetime_points: newLifetime, tier: newTier });
        await this.txM.create({
            id: (0, uuid_1.v4)(),
            user_id: userId,
            points_delta: pts,
            reason,
            ref_type: refType,
            ref_id: refId,
            expires_at: new Date(Date.now() + POINTS_TTL_DAYS * 24 * 3600 * 1000),
        });
        await this.updateChallengeProgress(userId, reason);
        try {
            this.events?.emit('loyalty.points_awarded', {
                user_id: userId, points: pts, reason,
                tier_changed: newTier !== previousTier, new_tier: newTier,
            });
        }
        catch { }
        return { ok: true, points_awarded: pts, new_balance: newPoints, tier: newTier };
    }
    async sweepExpired(userId) {
        const now = new Date();
        const stale = await this.txM.find({
            user_id: userId,
            points_delta: { $gt: 0 },
            expires_at: { $lte: now },
            swept: { $ne: true },
        }).lean();
        if (!stale.length)
            return;
        const account = await this.accountM.findOne({ user_id: userId });
        const balance = account?.points ?? 0;
        const deduct = Math.min(balance, stale.reduce((s, t) => s + (t.points_delta || 0), 0));
        const ids = stale.map((t) => t.id ?? t._id);
        await this.txM.updateMany({ id: { $in: ids } }, { swept: true });
        if (deduct > 0) {
            await this.accountM.updateOne({ user_id: userId }, { $inc: { points: -deduct } });
            await this.txM.create({
                id: (0, uuid_1.v4)(),
                user_id: userId,
                points_delta: -deduct,
                reason: 'points_expired',
                ref_type: 'expiration',
                ref_id: ids.join(','),
            });
        }
    }
    async onBookingCompleted(payload) {
        await this.awardPoints(payload.user_id, 'booking_completed', 'appointment', payload.booking_id);
    }
    async onOrderDelivered(payload) {
        await this.awardPoints(payload.user_id, 'order_delivered', 'order', payload.order_id);
    }
    async onReviewSubmitted(payload) {
        await this.awardPoints(payload.user_id, 'review_submitted', 'review', payload.review_id);
    }
    async onReferralConverted(payload) {
        await this.awardPoints(payload.user_id, 'referral_converted', 'referral', payload.referred_id);
    }
    async onVitalsLogged(payload) {
        if (!payload?.user_id)
            return;
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const todayCount = await this.txM.countDocuments({
            user_id: payload.user_id, reason: 'vitals_logged', createdAt: { $gte: dayStart },
        });
        if (todayCount >= 5)
            return;
        await this.awardPoints(payload.user_id, 'vitals_logged', 'health');
    }
    async onReferralWelcome(payload) {
        if (!payload?.user_id)
            return;
        await this.awardPoints(payload.user_id, 'referral_welcome', 'referral', payload.referral_id);
    }
    async updateChallengeProgress(userId, action) {
        const now = new Date();
        const activeChallenges = await this.challengeM.find({
            target_action: action,
            active: true,
            start_date: { $lte: now },
            end_date: { $gte: now },
        }).lean();
        for (const ch of activeChallenges) {
            let progress = await this.progressM.findOne({ user_id: userId, challenge_id: ch.id });
            if (!progress) {
                progress = await this.progressM.create({ user_id: userId, challenge_id: ch.id, progress_count: 0, completed: false });
            }
            if (progress.completed)
                continue;
            const newCount = (progress.progress_count ?? 0) + 1;
            const completed = newCount >= ch.target_count;
            await this.progressM.updateOne({ user_id: userId, challenge_id: ch.id }, { progress_count: newCount, completed, completed_at: completed ? new Date() : undefined });
            if (completed) {
                await this.awardPoints(userId, 'challenge_completed', 'challenge', ch.id, ch.reward_points);
            }
        }
    }
    async getActiveChallenges(userId) {
        const now = new Date();
        const challenges = await this.challengeM.find({ active: true, start_date: { $lte: now }, end_date: { $gte: now } }).lean();
        const progressList = await this.progressM.find({ user_id: userId }).lean();
        const progressMap = Object.fromEntries(progressList.map((p) => [p.challenge_id, p]));
        return challenges.map((ch) => ({
            ...ch,
            user_progress: progressMap[ch.id]?.progress_count ?? 0,
            completed: progressMap[ch.id]?.completed ?? false,
            joined: !!progressMap[ch.id],
        }));
    }
    async joinChallenge(userId, challengeId) {
        const now = new Date();
        const ch = await this.challengeM.findOne({
            id: challengeId, active: true, start_date: { $lte: now }, end_date: { $gte: now },
        }).lean();
        if (!ch)
            throw new common_1.NotFoundException('التحدي غير موجود أو انتهى');
        const existing = await this.progressM.findOne({ user_id: userId, challenge_id: challengeId }).lean();
        if (existing) {
            return { ok: true, joined: true, user_progress: existing.progress_count ?? 0, completed: existing.completed ?? false };
        }
        await this.progressM.create({ user_id: userId, challenge_id: challengeId, progress_count: 0, completed: false });
        return { ok: true, joined: true, user_progress: 0, completed: false };
    }
    async getAccount(userId) {
        let account = await this.accountM.findOne({ user_id: userId }).lean();
        if (!account) {
            account = await this.accountM.create({ user_id: userId, points: 0, lifetime_points: 0, tier: 'bronze' });
        }
        else {
            await this.sweepExpired(userId);
            account = await this.accountM.findOne({ user_id: userId }).lean();
        }
        return account;
    }
    async getTransactions(userId, page = 1, limit = 20) {
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
    async listRewards() {
        return this.rewardM.find({ active: true, stock: { $gt: 0 } }).sort({ points_required: 1 }).lean();
    }
    async claimReward(userId, rewardId) {
        const reward = await this.rewardM.findOne({ id: rewardId, active: true }).lean();
        if (!reward)
            throw new common_1.NotFoundException('Reward not found or not available');
        const account = await this.accountM.findOne({ user_id: userId }).lean();
        if (!account || account.points < reward.points_required) {
            throw new common_1.BadRequestException(`Insufficient points. Required: ${reward.points_required}`);
        }
        await this.accountM.updateOne({ user_id: userId }, { $inc: { points: -reward.points_required } });
        await this.txM.create({
            id: (0, uuid_1.v4)(),
            user_id: userId,
            points_delta: -reward.points_required,
            reason: 'reward_claimed',
            ref_type: 'reward',
            ref_id: rewardId,
        });
        await this.rewardM.updateOne({ id: rewardId }, { $inc: { stock: -1 } });
        const couponCode = reward.reward_type === 'coupon'
            ? `NAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            : undefined;
        const claim = await this.claimM.create({
            id: (0, uuid_1.v4)(),
            user_id: userId,
            reward_id: rewardId,
            status: 'pending',
            coupon_code: couponCode,
        });
        return { ok: true, claim_id: claim.id, coupon_code: couponCode };
    }
    async getClaimedRewards(userId) {
        return this.claimM.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
    }
};
exports.LoyaltyService = LoyaltyService;
__decorate([
    (0, event_emitter_1.OnEvent)('booking.completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyService.prototype, "onBookingCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.delivered'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyService.prototype, "onOrderDelivered", null);
__decorate([
    (0, event_emitter_1.OnEvent)('review.submitted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyService.prototype, "onReviewSubmitted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('referral.converted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyService.prototype, "onReferralConverted", null);
__decorate([
    (0, event_emitter_1.OnEvent)('health.vitals_logged'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyService.prototype, "onVitalsLogged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('referral.welcome_bonus'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyService.prototype, "onReferralWelcome", null);
exports.LoyaltyService = LoyaltyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('LoyaltyAccountRepository')),
    __param(1, (0, common_1.Inject)('LoyaltyTransactionRepository')),
    __param(2, (0, common_1.Inject)('LoyaltyChallengeRepository')),
    __param(3, (0, common_1.Inject)('ChallengeProgressRepository')),
    __param(4, (0, common_1.Inject)('RewardRepository')),
    __param(5, (0, common_1.Inject)('RewardClaimRepository')),
    __param(6, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [loyaltyaccount_repository_1.LoyaltyAccountRepository,
        loyaltytransaction_repository_1.LoyaltyTransactionRepository,
        loyaltychallenge_repository_1.LoyaltyChallengeRepository,
        challengeprogress_repository_1.ChallengeProgressRepository,
        reward_repository_1.RewardRepository,
        rewardclaim_repository_1.RewardClaimRepository,
        event_emitter_1.EventEmitter2])
], LoyaltyService);
//# sourceMappingURL=loyalty.service.js.map