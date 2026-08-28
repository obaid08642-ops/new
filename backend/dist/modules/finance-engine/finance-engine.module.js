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
exports.FinanceEngineModule = exports.AdminFinanceEngineController = exports.FinanceEngineController = exports.ApprovalService = exports.ReportsService = exports.CancellationPolicy = exports.RefundExecutor = exports.FraudService = exports.LoyaltyRedeemService = exports.CouponService = exports.CommissionResolver = exports.LedgerService = exports.LEDGER_TYPES = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
exports.LEDGER_TYPES = [
    'provider_earning', 'provider_debit', 'payout', 'refund', 'commission',
    'vat', 'adjustment', 'chargeback', 'penalty', 'bonus', 'referral',
    'loyalty', 'settlement',
];
const DEFAULTS = {
    commission_percent: 10,
    vat_percent: 15,
    settlement_delay_days: 3,
    minimum_payout_sar: 100,
    large_payout_sar: 10000,
    large_refund_sar: 5000,
    loyalty_max_redeem_percent: 20,
    loyalty_point_value_sar: 0.1,
    refund_abuse_count_30d: 3,
    payment_velocity_failed_1h: 5,
    coupon_abuse_failed_1h: 10,
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
let LedgerService = class LedgerService {
    constructor(conn) {
        this.conn = conn;
        this.logger = new common_1.Logger('LedgerService');
    }
    get col() { return this.conn.collection('platformledgerentries'); }
    async append(entry) {
        if (!exports.LEDGER_TYPES.includes(entry.type))
            throw new common_1.BadRequestException(`invalid ledger type ${entry.type}`);
        if (!(Number(entry.amount) >= 0))
            throw new common_1.BadRequestException('ledger amount must be >= 0 (direction is expressed by type)');
        const doc = {
            id: `le_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            provider_account_id: entry.provider_account_id || null,
            type: entry.type,
            state: entry.state || 'cleared',
            amount: round2(entry.amount),
            ...(entry.available_at ? { available_at: entry.available_at } : {}),
            ref_type: entry.ref_type, ref_id: entry.ref_id, order_id: entry.order_id,
            gross: entry.gross, commission_percent: entry.commission_percent,
            commission: entry.commission, vat: entry.vat,
            description: entry.description, actor_id: entry.actor_id, meta: entry.meta,
            createdAt: new Date(),
        };
        await this.col.insertOne(doc);
        return doc;
    }
    async exists(type, refType, refId) {
        return this.col.findOne({ type, ref_type: refType, ref_id: refId });
    }
    async matureEscrow(providerId) {
        await this.col.updateMany({ provider_account_id: providerId, type: 'provider_earning', state: 'pending', available_at: { $lte: new Date() } }, { $set: { state: 'cleared', matured_at: new Date() } });
    }
    async providerBalance(providerId) {
        await this.matureEscrow(providerId);
        const w = await this.col.aggregate([
            { $match: { provider_account_id: providerId } },
            {
                $group: {
                    _id: null,
                    earned_cleared: { $sum: { $cond: [{ $and: [{ $in: ['$type', ['provider_earning', 'bonus', 'referral']] }, { $eq: ['$state', 'cleared'] }] }, '$amount', 0] } },
                    earned_pending: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'provider_earning'] }, { $eq: ['$state', 'pending'] }] }, '$amount', 0] } },
                    debits: { $sum: { $cond: [{ $in: ['$type', ['provider_debit', 'penalty', 'chargeback']] }, '$amount', 0] } },
                    paid: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'payout'] }, { $eq: ['$state', 'cleared'] }] }, '$amount', 0] } },
                    locked: { $sum: { $cond: [{ $eq: ['$state', 'locked'] }, '$amount', 0] } },
                },
            },
        ]).toArray().catch(() => []);
        const r = w[0] || {};
        const available = round2((r.earned_cleared || 0) - (r.paid || 0) - (r.debits || 0) - (r.locked || 0));
        return {
            available,
            pending: round2(r.earned_pending || 0),
            locked: round2(r.locked || 0),
            lifetime_earned: round2((r.earned_cleared || 0) + (r.earned_pending || 0)),
            paid_out: round2(r.paid || 0),
            debits: round2(r.debits || 0),
            negative: available < 0,
        };
    }
    async settlementDelayDays(serviceType) {
        const cfg = await this.conn.collection('finance_config').findOne({ key: 'commissions' });
        return cfg?.settlement?.delay_days?.[serviceType || 'default'] ?? cfg?.settlement?.delay_days?.default ?? DEFAULTS.settlement_delay_days;
    }
};
exports.LedgerService = LedgerService;
exports.LedgerService = LedgerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], LedgerService);
let CommissionResolver = class CommissionResolver {
    constructor(conn) {
        this.conn = conn;
    }
    get rules() { return this.conn.collection('commissionrules'); }
    async resolve(serviceType, opts = {}) {
        const now = new Date();
        const windowQ = {
            active: { $ne: false },
            $and: [
                { $or: [{ effective_from: { $exists: false } }, { effective_from: null }, { effective_from: { $lte: now } }] },
                { $or: [{ effective_to: { $exists: false } }, { effective_to: null }, { effective_to: { $gte: now } }] },
            ],
        };
        const candidates = [];
        if (opts.campaignId)
            candidates.push({ scope: 'campaign', scope_id: opts.campaignId, source: 'campaign_override' });
        if (opts.providerId)
            candidates.push({ scope: 'provider', scope_id: opts.providerId, source: 'provider_override' });
        if (opts.category)
            candidates.push({ scope: 'category', scope_id: opts.category, source: 'category_override' });
        candidates.push({ scope: 'service', scope_id: serviceType, source: 'service_default' });
        for (const c of candidates) {
            const q = { ...windowQ, scope: c.scope };
            if (c.scope_id)
                q.scope_id = c.scope_id;
            if (c.scope === 'service')
                q.$or = [{ service_type: serviceType }, { scope_id: serviceType }];
            const rule = await this.rules.findOne(q, { sort: { version: -1, createdAt: -1 } });
            if (rule && Number(rule.percent ?? rule.commission) >= 0) {
                return { percent: Number(rule.percent ?? rule.commission), source: c.source, rule_id: rule.id || String(rule._id) };
            }
        }
        const cfg = await this.conn.collection('finance_config').findOne({ key: 'commissions' });
        const pct = cfg?.service_types?.[serviceType]?.percent;
        if (Number(pct) >= 0)
            return { percent: Number(pct), source: 'finance_config' };
        return { percent: DEFAULTS.commission_percent, source: 'system_default' };
    }
    async setRule(adminId, rule) {
        if (!['service', 'provider', 'category', 'campaign'].includes(rule.scope))
            throw new common_1.BadRequestException('invalid scope');
        if (!(Number(rule.percent) >= 0 && Number(rule.percent) <= 100))
            throw new common_1.BadRequestException('percent must be 0..100');
        if (rule.scope !== 'service' && !rule.scope_id)
            throw new common_1.BadRequestException('scope_id required');
        if (rule.scope === 'service' && !rule.service_type && !rule.scope_id)
            throw new common_1.BadRequestException('service_type required');
        const matchQ = { scope: rule.scope };
        if (rule.scope_id)
            matchQ.scope_id = rule.scope_id;
        if (rule.service_type)
            matchQ.service_type = rule.service_type;
        const prev = await this.rules.findOne(matchQ, { sort: { version: -1 } });
        const version = (prev?.version || 0) + 1;
        if (prev)
            await this.rules.updateMany(matchQ, { $set: { active: false, superseded_at: new Date() } });
        const doc = {
            id: `cr_${(0, uuid_1.v4)()}`,
            scope: rule.scope, scope_id: rule.scope_id, service_type: rule.service_type,
            percent: round2(rule.percent),
            effective_from: rule.effective_from ? new Date(rule.effective_from) : null,
            effective_to: rule.effective_to ? new Date(rule.effective_to) : null,
            active: true, version,
            supersedes: prev ? (prev.id || String(prev._id)) : null,
            created_by: adminId, createdAt: new Date(), updatedAt: new Date(),
        };
        await this.rules.insertOne(doc);
        await this.conn.collection('commission_rule_history').insertOne({
            ...doc, action: 'created', previous: prev ? { percent: prev.percent ?? prev.commission, version: prev.version } : null,
        });
        return doc;
    }
    async history(filter = {}) {
        return this.conn.collection('commission_rule_history').find(filter, { projection: { _id: 0 } })
            .sort({ createdAt: -1 }).limit(200).toArray();
    }
};
exports.CommissionResolver = CommissionResolver;
exports.CommissionResolver = CommissionResolver = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], CommissionResolver);
let CouponService = class CouponService {
    constructor(conn) {
        this.conn = conn;
    }
    get coupons() { return this.conn.collection('coupons'); }
    get usages() { return this.conn.collection('coupon_usages'); }
    async validate(userId, code, ctx) {
        if (!code)
            return { valid: false, discount: 0, reason: 'code_required' };
        const c = await this.coupons.findOne({ code: String(code).toUpperCase() });
        if (!c)
            return { valid: false, discount: 0, reason: 'not_found' };
        if (c.active === false)
            return { valid: false, discount: 0, reason: 'inactive' };
        const now = new Date();
        if (c.valid_from && new Date(c.valid_from) > now)
            return { valid: false, discount: 0, reason: 'not_yet_valid' };
        if (c.valid_until && new Date(c.valid_until) < now)
            return { valid: false, discount: 0, reason: 'expired' };
        if (c.max_uses != null && (c.used_count || 0) >= c.max_uses)
            return { valid: false, discount: 0, reason: 'max_uses_reached' };
        const perUserLimit = Number(c.usage_limit_per_user ?? 1);
        const myUses = await this.usages.countDocuments({ code: c.code, user_id: userId });
        if (myUses >= perUserLimit)
            return { valid: false, discount: 0, reason: 'already_used' };
        if (c.min_order != null && ctx.order_total < Number(c.min_order)) {
            return { valid: false, discount: 0, reason: `min_order_${c.min_order}` };
        }
        if (c.provider_id && ctx.provider_id && c.provider_id !== ctx.provider_id) {
            return { valid: false, discount: 0, reason: 'wrong_provider' };
        }
        if (Array.isArray(c.categories) && c.categories.length > 0) {
            const overlap = (ctx.categories || []).some((cat) => c.categories.includes(cat));
            if (!overlap)
                return { valid: false, discount: 0, reason: 'wrong_category' };
        }
        if (c.first_order_only) {
            const prior = await this.conn.collection('orders').countDocuments({ patient_id: userId, state: { $nin: ['CANCELLED'] } });
            if (prior > 0)
                return { valid: false, discount: 0, reason: 'first_order_only' };
        }
        let discount = 0;
        if (Number(c.discount_percent) > 0)
            discount = (ctx.order_total * Number(c.discount_percent)) / 100;
        else if (Number(c.discount_amount) > 0)
            discount = Number(c.discount_amount);
        if (Number(c.max_discount) > 0)
            discount = Math.min(discount, Number(c.max_discount));
        discount = Math.min(round2(discount), round2(ctx.order_total));
        if (!(discount > 0))
            return { valid: false, discount: 0, reason: 'no_discount' };
        return { valid: true, discount, coupon: { code: c.code, discount_percent: c.discount_percent, discount_amount: c.discount_amount } };
    }
    async apply(userId, code, orderId, ctx) {
        const v = await this.validate(userId, code, ctx);
        if (!v.valid)
            throw new common_1.BadRequestException(`coupon_invalid: ${v.reason}`);
        const c = await this.coupons.findOne({ code: String(code).toUpperCase() });
        if (c.max_uses != null) {
            const r = await this.coupons.updateOne({ code: c.code, used_count: { $lt: c.max_uses } }, { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } });
            if (!r.matchedCount)
                throw new common_1.BadRequestException('coupon_invalid: max_uses_reached');
        }
        else {
            await this.coupons.updateOne({ code: c.code }, { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } });
        }
        try {
            await this.usages.insertOne({
                id: `cu_${(0, uuid_1.v4)()}`, code: c.code, user_id: userId, order_id: orderId,
                discount: v.discount, createdAt: new Date(),
            });
        }
        catch (e) {
            await this.coupons.updateOne({ code: c.code }, { $inc: { used_count: -1 } });
            throw new common_1.BadRequestException('coupon_invalid: already_applied');
        }
        return { discount: v.discount, code: c.code };
    }
    async release(orderId) {
        const usage = await this.usages.findOne({ order_id: orderId });
        if (!usage)
            return;
        await this.usages.deleteOne({ order_id: orderId });
        await this.coupons.updateOne({ code: usage.code }, { $inc: { used_count: -1 } });
    }
    async ensureIndexes() {
        await this.usages.createIndex({ order_id: 1 }, { unique: true }).catch(() => null);
        await this.usages.createIndex({ code: 1, user_id: 1 }).catch(() => null);
    }
};
exports.CouponService = CouponService;
exports.CouponService = CouponService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], CouponService);
let LoyaltyRedeemService = class LoyaltyRedeemService {
    constructor(conn) {
        this.conn = conn;
    }
    async config() {
        const doc = await this.conn.collection('loyalty_config').findOne({ key: 'global' });
        const v = doc?.value || {};
        return {
            enabled: v.redeem_enabled !== false,
            max_redeem_percent: Number(v.max_redeem_percent ?? DEFAULTS.loyalty_max_redeem_percent),
            point_value_sar: Number(v.point_value_sar ?? DEFAULTS.loyalty_point_value_sar),
        };
    }
    async quote(userId, orderTotal) {
        const cfg = await this.config();
        const acc = await this.conn.collection('loyalty_accounts').findOne({ user_id: userId });
        const balance = Number(acc?.points ?? acc?.balance ?? 0);
        const capSar = round2((orderTotal * cfg.max_redeem_percent) / 100);
        const maxPoints = Math.floor(capSar / cfg.point_value_sar);
        const usablePoints = Math.max(0, Math.min(balance, maxPoints));
        return {
            enabled: cfg.enabled,
            balance,
            max_redeem_percent: cfg.max_redeem_percent,
            point_value_sar: cfg.point_value_sar,
            max_points_for_order: usablePoints,
            max_discount_sar: round2(usablePoints * cfg.point_value_sar),
        };
    }
    async redeem(userId, orderId, points, orderTotal) {
        const cfg = await this.config();
        if (!cfg.enabled)
            throw new common_1.BadRequestException('loyalty_redemption_disabled');
        const pts = Math.floor(Number(points));
        if (!(pts > 0))
            throw new common_1.BadRequestException('points_must_be_positive');
        const q = await this.quote(userId, orderTotal);
        if (pts > q.max_points_for_order) {
            throw new common_1.BadRequestException(`points_exceed_cap: max ${q.max_points_for_order} (${cfg.max_redeem_percent}% of order)`);
        }
        const balField = (await this.conn.collection('loyalty_accounts').findOne({ user_id: userId }))?.points != null ? 'points' : 'balance';
        const r = await this.conn.collection('loyalty_accounts').updateOne({ user_id: userId, [balField]: { $gte: pts } }, { $inc: { [balField]: -pts }, $set: { updatedAt: new Date() } });
        if (!r.matchedCount)
            throw new common_1.BadRequestException('insufficient_points');
        const discount = round2(pts * cfg.point_value_sar);
        await this.conn.collection('loyalty_transactions').insertOne({
            id: `lt_${(0, uuid_1.v4)()}`, user_id: userId, points_delta: -pts, points: -pts,
            kind: 'redeem', reason: 'order_redemption', order_id: orderId,
            ref_type: 'order', ref_id: orderId, discount_sar: discount, createdAt: new Date(),
        });
        return { points: pts, discount_sar: discount };
    }
    async refundRedemption(userId, orderId) {
        const tx = await this.conn.collection('loyalty_transactions').findOne({ order_id: orderId, kind: 'redeem' });
        if (!tx)
            return null;
        const already = await this.conn.collection('loyalty_transactions').findOne({ order_id: orderId, kind: 'redeem_refund' });
        if (already)
            return null;
        const pts = Math.abs(tx.points_delta ?? tx.points ?? 0);
        if (!(pts > 0))
            return null;
        const acc = await this.conn.collection('loyalty_accounts').findOne({ user_id: userId });
        const balField = acc?.points != null ? 'points' : 'balance';
        await this.conn.collection('loyalty_accounts').updateOne({ user_id: userId }, { $inc: { [balField]: pts }, $set: { updatedAt: new Date() } }, { upsert: true });
        await this.conn.collection('loyalty_transactions').insertOne({
            id: `lt_${(0, uuid_1.v4)()}`, user_id: userId, points_delta: pts, points: pts,
            kind: 'redeem_refund', reason: 'order_cancelled_recredit', order_id: orderId,
            ref_type: 'order', ref_id: orderId, createdAt: new Date(),
        });
        return { points_recredited: pts };
    }
};
exports.LoyaltyRedeemService = LoyaltyRedeemService;
exports.LoyaltyRedeemService = LoyaltyRedeemService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], LoyaltyRedeemService);
let FraudService = class FraudService {
    constructor(conn) {
        this.conn = conn;
        this.logger = new common_1.Logger('FraudService');
    }
    get alerts() { return this.conn.collection('fraud_alerts'); }
    async raise(opts) {
        const dup = await this.alerts.findOne({ userId: opts.userId || null, flagType: opts.flagType, status: { $in: ['pending', 'flagged'] } });
        if (dup)
            return dup;
        const doc = {
            id: `fa_${(0, uuid_1.v4)()}`,
            userId: opts.userId || null,
            providerId: opts.providerId || null,
            flagType: opts.flagType,
            confidenceScore: opts.confidence,
            severity: opts.severity || (opts.confidence >= 0.8 ? 'high' : 'medium'),
            details: opts.details || {},
            status: 'pending',
            createdAt: new Date(), updatedAt: new Date(),
        };
        await this.alerts.insertOne(doc);
        this.logger.warn(`FRAUD ALERT ${opts.flagType} user=${opts.userId} conf=${opts.confidence}`);
        return doc;
    }
    async checkRefundAbuse(userId) {
        const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const count = await this.conn.collection('refundrequests').countDocuments({ patient_id: userId, createdAt: { $gte: since } });
        if (count >= DEFAULTS.refund_abuse_count_30d) {
            await this.raise({ userId, flagType: 'refund_abuse', confidence: Math.min(0.5 + count * 0.1, 0.99), details: { refunds_30d: count } });
            return true;
        }
        return false;
    }
    async checkPaymentVelocity(userId) {
        const since = new Date(Date.now() - 3600 * 1000);
        const count = await this.conn.collection('moyasar_payments').countDocuments({ patient_id: userId, status: 'failed', createdAt: { $gte: since } });
        if (count >= DEFAULTS.payment_velocity_failed_1h) {
            await this.raise({ userId, flagType: 'payment_velocity_abuse', confidence: 0.85, details: { failed_1h: count } });
            return true;
        }
        return false;
    }
    async recordCouponFailure(userId, code) {
        await this.conn.collection('coupon_failures').insertOne({ user_id: userId, code, at: new Date() });
        const since = new Date(Date.now() - 3600 * 1000);
        const count = await this.conn.collection('coupon_failures').countDocuments({ user_id: userId, at: { $gte: since } });
        if (count >= DEFAULTS.coupon_abuse_failed_1h) {
            await this.raise({ userId, flagType: 'coupon_abuse', confidence: 0.8, details: { failed_1h: count } });
            return true;
        }
        return false;
    }
    async detectDuplicatePayments(bookingId) {
        const paid = await this.conn.collection('moyasar_payments')
            .find({ booking_id: bookingId, status: 'paid' }).toArray();
        if (paid.length > 1) {
            const total = paid.reduce((s, p) => s + (p.amount || 0), 0);
            await this.raise({
                userId: paid[0].patient_id, flagType: 'duplicate_payment', confidence: 0.99, severity: 'critical',
                details: { booking_id: bookingId, payments: paid.map((p) => p.moyasar_id), total_charged: total },
            });
            return paid;
        }
        return null;
    }
};
exports.FraudService = FraudService;
exports.FraudService = FraudService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], FraudService);
let RefundExecutor = class RefundExecutor {
    constructor(conn, ledger, fraud, events) {
        this.conn = conn;
        this.ledger = ledger;
        this.fraud = fraud;
        this.events = events;
        this.logger = new common_1.Logger('RefundExecutor');
    }
    moyasarKey() {
        const k = process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || process.env.MOYASAR_API_KEY || '';
        if (!k)
            throw new common_1.BadRequestException('payment_gateway_not_configured');
        return k;
    }
    async execute(opts) {
        const amount = round2(opts.amount);
        if (!(amount > 0))
            throw new common_1.BadRequestException('refund amount must be positive');
        const prior = await this.ledger.exists('refund', 'refund', opts.refund_id);
        if (prior)
            return { ok: true, method: 'already_executed' };
        const paidPayment = await this.conn.collection('moyasar_payments').findOne({ booking_id: opts.booking_id, status: { $in: ['paid', 'refunded'] } }, { sort: { createdAt: -1 } });
        const paidTotal = paidPayment ? Number(paidPayment.amount || 0) : null;
        if (paidTotal != null) {
            const alreadyRefunded = Number(paidPayment.refunded_amount || 0);
            if (alreadyRefunded + amount > paidTotal + 0.001) {
                throw new common_1.BadRequestException(`refund_exceeds_paid: paid ${paidTotal}, already refunded ${alreadyRefunded}`);
            }
        }
        let method = 'wallet';
        let gatewayRefundId;
        if (paidPayment && paidPayment.moyasar_id && !String(paidPayment.moyasar_id).startsWith('sandbox_')) {
            const key = this.moyasarKey();
            const resp = await fetch(`https://api.moyasar.com/v1/payments/${paidPayment.moyasar_id}/refund`, {
                method: 'POST',
                headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Math.round(amount * 100), reason: opts.reason?.slice(0, 255) || 'refund' }),
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                this.logger.error(`Moyasar refund failed for ${paidPayment.moyasar_id}: ${data?.message || resp.status}`);
                throw new common_1.BadRequestException(`gateway_refund_failed: ${data?.message || resp.status}`);
            }
            method = 'gateway';
            gatewayRefundId = data?.id;
            const newRefunded = round2(Number(paidPayment.refunded_amount || 0) + amount);
            await this.conn.collection('moyasar_payments').updateOne({ _id: paidPayment._id }, { $set: { refunded_amount: newRefunded, status: newRefunded >= Number(paidPayment.amount || 0) - 0.001 ? 'refunded' : 'paid', refunded_at: new Date() } });
        }
        else {
            const wallet = await this.conn.collection('wallets').findOne({ ownerId: opts.patient_id, ownerType: 'patient' });
            if (wallet) {
                await this.conn.collection('wallets').updateOne({ _id: wallet._id }, { $inc: { balance: amount }, $set: { updatedAt: new Date() } });
                await this.conn.collection('wallet_transactions').insertOne({
                    id: (0, uuid_1.v4)(), walletId: wallet.id, amount, type: 'credit',
                    referenceType: 'refund', referenceId: opts.refund_id,
                    description: `استرداد مبلغ ${opts.booking_kind} #${String(opts.booking_id).slice(0, 8)}`,
                    createdAt: new Date(), updatedAt: new Date(),
                });
            }
            method = wallet ? 'wallet' : 'offline_recorded';
        }
        await this.ledger.append({
            type: 'refund', amount,
            provider_account_id: null,
            ref_type: 'refund', ref_id: opts.refund_id, order_id: opts.booking_id,
            description: `Patient refund (${method}) — ${opts.reason || ''}`.trim(),
            actor_id: opts.actor_id,
            meta: { booking_kind: opts.booking_kind, patient_id: opts.patient_id, method, gateway_refund_id: gatewayRefundId },
        });
        let providerDebited = 0;
        const earning = await this.conn.collection('platformledgerentries').findOne({
            type: 'provider_earning',
            $or: [{ ref_id: opts.booking_id }, { order_id: opts.booking_id }],
        });
        if (earning && Number(earning.amount) > 0) {
            const fraction = Math.min(1, amount / Number(earning.gross || amount));
            providerDebited = round2(Number(earning.amount) * fraction);
            if (providerDebited > 0) {
                const dupDebit = await this.ledger.exists('provider_debit', 'refund', opts.refund_id);
                if (!dupDebit) {
                    await this.ledger.append({
                        type: 'provider_debit', amount: providerDebited,
                        provider_account_id: earning.provider_account_id,
                        ref_type: 'refund', ref_id: opts.refund_id, order_id: opts.booking_id,
                        description: `Clawback: refund ${opts.refund_id} on credited earning ${earning.id}`,
                        actor_id: opts.actor_id,
                    });
                }
            }
        }
        const kindCollection = {
            pharmacy: 'orders', order: 'orders', orders: 'orders',
            consultation: 'appointments', appointment: 'appointments',
            lab: 'labbookings', radiology: 'radiologybookings',
            nursing: 'homecarebookings', 'home-care': 'homecarebookings',
        };
        const coll = kindCollection[opts.booking_kind];
        if (coll) {
            const newStatus = paidTotal != null && amount < paidTotal - 0.001 ? 'partially_refunded' : 'refunded';
            await this.conn.collection(coll).updateOne({ id: opts.booking_id }, { $set: { payment_status: newStatus, refund_status: 'REFUNDED', updatedAt: new Date() } });
        }
        await this.conn.collection('notifications').insertOne({
            id: (0, uuid_1.v4)(), user_id: opts.patient_id,
            title_key: 'تم استرداد المبلغ', body_key: `تم إرجاع ${amount} ر.س ${method === 'gateway' ? 'إلى بطاقتك البنكية' : 'إلى محفظتك'} — ${opts.reason || ''}`.trim(),
            params: {}, type: 'payment', priority: 'high', read_by: [],
            status: 'DELIVERED', createdAt: new Date(), updatedAt: new Date(),
        });
        this.events.emit('payment.refund', {
            actor_id: opts.actor_id, transaction_id: gatewayRefundId || opts.refund_id,
            booking_id: opts.booking_id, booking_kind: opts.booking_kind,
            patient_id: opts.patient_id, amount, method,
        });
        return { ok: true, method, gateway_refund_id: gatewayRefundId, provider_debited: providerDebited };
    }
};
exports.RefundExecutor = RefundExecutor;
exports.RefundExecutor = RefundExecutor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        LedgerService,
        FraudService,
        event_emitter_1.EventEmitter2])
], RefundExecutor);
let CancellationPolicy = class CancellationPolicy {
    constructor(conn) {
        this.conn = conn;
    }
    async forOrder(state, actorRole, deliveryFee = 0) {
        const cfg = await this.conn.collection('finance_config').findOne({ key: 'cancel_policy' });
        const p = cfg || {};
        const S = String(state || '').toUpperCase();
        if (['DELIVERED', 'COMPLETED', 'PARTIALLY_FULFILLED', 'FULFILLED'].includes(S)) {
            return { allowed: false, refundable_percent: 0, fee_sar: 0, restore_stock: false, block_reason: 'use_returns_flow' };
        }
        if (['READY_FOR_DISPATCH', 'ASSIGNED_TO_DELIVERY', 'OUT_FOR_DELIVERY'].includes(S)) {
            if (actorRole === 'patient') {
                const fee = p.after_dispatch_patient_fee_sar ?? deliveryFee ?? 0;
                return { allowed: true, refundable_percent: 100, fee_sar: fee, fee_reason: 'courier_compensation', restore_stock: false };
            }
            return { allowed: true, refundable_percent: 100, fee_sar: 0, restore_stock: false };
        }
        if (['ACCEPTED', 'PREPARING', 'BASKET_REVIEW', 'WAITING_PATIENT_APPROVAL', 'PAYMENT_COMPLETED', 'READY'].includes(S)) {
            return { allowed: true, refundable_percent: 100, fee_sar: 0, restore_stock: true };
        }
        return { allowed: true, refundable_percent: 100, fee_sar: 0, restore_stock: false };
    }
};
exports.CancellationPolicy = CancellationPolicy;
exports.CancellationPolicy = CancellationPolicy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], CancellationPolicy);
let ReportsService = class ReportsService {
    constructor(conn) {
        this.conn = conn;
    }
    async summary(period = 'daily', fromQ, toQ) {
        const now = new Date();
        let from;
        if (fromQ)
            from = new Date(fromQ);
        else if (period === 'weekly')
            from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        else if (period === 'monthly')
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        else
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const to = toQ ? new Date(toQ) : now;
        const dateQ = { createdAt: { $gte: from, $lte: to } };
        const [payments, ledgerRows, refunds, cancelledOrders] = await Promise.all([
            this.conn.collection('moyasar_payments').aggregate([
                { $match: dateQ },
                { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]).toArray().catch(() => []),
            this.conn.collection('platformledgerentries').aggregate([
                { $match: dateQ },
                { $group: { _id: { type: '$type', state: '$state' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
            ]).toArray().catch(() => []),
            this.conn.collection('refundrequests').aggregate([
                { $match: dateQ },
                { $group: { _id: '$state', total: { $sum: '$refund_amount' }, count: { $sum: 1 } } },
            ]).toArray().catch(() => []),
            this.conn.collection('orders').countDocuments({ ...dateQ, state: 'CANCELLED' }).catch(() => 0),
        ]);
        const p = (st) => payments.filter((x) => x._id === st).reduce((s, x) => s + (x.total || 0), 0);
        const pc = (st) => payments.filter((x) => x._id === st).reduce((s, x) => s + (x.count || 0), 0);
        const l = (type, state) => ledgerRows.filter((x) => x._id?.type === type && (!state || x._id?.state === state)).reduce((s, x) => s + (x.total || 0), 0);
        const r = (st) => refunds.filter((x) => String(x._id).toUpperCase() === st).reduce((s, x) => s + (x.total || 0), 0);
        const gross = round2(p('paid') + p('refunded'));
        const ev = await this.conn.collection('platformledgerentries').aggregate([
            { $match: { ...dateQ, type: 'provider_earning' } },
            { $group: { _id: null, commission: { $sum: '$commission' }, vat: { $sum: '$vat' }, gross: { $sum: '$gross' }, net: { $sum: '$amount' } } },
        ]).toArray().catch(() => []);
        const e = ev[0] || {};
        return {
            period, from, to,
            gross_revenue: gross,
            paid_count: pc('paid'),
            failed_count: pc('failed'),
            failed_volume: round2(p('failed')),
            commission: round2(e.commission || 0),
            vat_on_commission: round2(e.vat || 0),
            net_revenue: round2((e.commission || 0) + (e.vat || 0)),
            provider_net: round2(e.net || 0),
            refunds_completed: round2(r('COMPLETED') + r('completed')),
            refunds_requested_count: refunds.reduce((s, x) => s + (x.count || 0), 0),
            chargebacks: round2(l('chargeback')),
            provider_pending_escrow: round2(l('provider_earning', 'pending')),
            provider_settled: round2(l('payout')),
            provider_debits: round2(l('provider_debit')),
            canceled_orders: cancelledOrders,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ReportsService);
let ApprovalService = class ApprovalService {
    constructor(conn, events) {
        this.conn = conn;
        this.events = events;
    }
    get ops() { return this.conn.collection('financial_operations'); }
    async thresholds() {
        const cfg = await this.conn.collection('finance_config').findOne({ key: 'approval' });
        return {
            large_payout_sar: Number(cfg?.large_payout_sar ?? DEFAULTS.large_payout_sar),
            large_refund_sar: Number(cfg?.large_refund_sar ?? DEFAULTS.large_refund_sar),
        };
    }
    async request(type, payload, requestedBy, reason) {
        if (!reason || !String(reason).trim())
            throw new common_1.BadRequestException('reason is required for sensitive financial operations');
        const doc = {
            id: `fo_${(0, uuid_1.v4)()}`,
            type, payload, reason: String(reason).trim(),
            status: 'pending_approval',
            requested_by: requestedBy,
            createdAt: new Date(), updatedAt: new Date(),
        };
        await this.ops.insertOne(doc);
        await this.conn.collection('notifications').insertOne({
            id: (0, uuid_1.v4)(), role: 'admin',
            title_key: 'عملية مالية تنتظر الموافقة',
            body_key: `${type} بقيمة ${payload?.amount ?? ''} ر.س — السبب: ${doc.reason}`,
            params: {}, type: 'alert', priority: 'high', read_by: [],
            status: 'DELIVERED', createdAt: new Date(), updatedAt: new Date(),
        });
        return doc;
    }
    async listPending() {
        return this.ops.find({ status: 'pending_approval' }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).limit(100).toArray();
    }
    async decide(id, adminId, approve, note, executors = {}) {
        const op = await this.ops.findOne({ id });
        if (!op)
            throw new common_1.NotFoundException('operation not found');
        if (op.status !== 'pending_approval')
            throw new common_1.BadRequestException(`already ${op.status}`);
        if (op.requested_by === adminId)
            throw new common_1.ForbiddenException('maker_checker: requester cannot approve their own operation');
        if (!approve) {
            await this.ops.updateOne({ id }, { $set: { status: 'rejected', decided_by: adminId, decided_at: new Date(), decision_note: note, updatedAt: new Date() } });
            this.events.emit('finance.operation.rejected', { id, type: op.type, by: adminId, payload: op.payload, note });
            return { ok: true, status: 'rejected' };
        }
        const executor = executors[op.type];
        if (!executor)
            throw new common_1.BadRequestException(`no executor wired for ${op.type}`);
        const result = await executor(op.payload);
        await this.ops.updateOne({ id }, {
            $set: { status: 'executed', decided_by: adminId, decided_at: new Date(), decision_note: note, execution_result: result ? JSON.parse(JSON.stringify(result)) : null, updatedAt: new Date() },
        });
        this.events.emit('finance.operation.executed', { id, type: op.type, by: adminId, payload: op.payload });
        return { ok: true, status: 'executed', result };
    }
};
exports.ApprovalService = ApprovalService;
exports.ApprovalService = ApprovalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], ApprovalService);
let FinanceEngineController = class FinanceEngineController {
    constructor(coupons, loyalty, ledger) {
        this.coupons = coupons;
        this.loyalty = loyalty;
        this.ledger = ledger;
    }
    async validateCoupon(u, b) {
        const orderTotal = Number(b?.order_total);
        if (!(orderTotal > 0))
            throw new common_1.BadRequestException('order_total required');
        return this.coupons.validate(u.id, String(b?.code || ''), {
            order_total: orderTotal,
            provider_id: b?.provider_id,
            categories: Array.isArray(b?.categories) ? b.categories : [],
        });
    }
    async loyaltyQuote(u, b) {
        const orderTotal = Number(b?.order_total);
        if (!(orderTotal > 0))
            throw new common_1.BadRequestException('order_total required');
        return this.loyalty.quote(u.id, orderTotal);
    }
    async providerBalance(u) {
        return this.ledger.providerBalance(u.id);
    }
};
exports.FinanceEngineController = FinanceEngineController;
__decorate([
    (0, common_1.Post)('coupons/validate'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceEngineController.prototype, "validateCoupon", null);
__decorate([
    (0, common_1.Post)('loyalty/redeem-quote'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceEngineController.prototype, "loyaltyQuote", null);
__decorate([
    (0, common_1.Get)('provider/balance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceEngineController.prototype, "providerBalance", null);
exports.FinanceEngineController = FinanceEngineController = __decorate([
    (0, common_1.Controller)('finance-engine'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [CouponService,
        LoyaltyRedeemService,
        LedgerService])
], FinanceEngineController);
let AdminFinanceEngineController = class AdminFinanceEngineController {
    constructor(conn, reports, commissions, approvals, refundExec, ledger, fraud) {
        this.conn = conn;
        this.reports = reports;
        this.commissions = commissions;
        this.approvals = approvals;
        this.refundExec = refundExec;
        this.ledger = ledger;
        this.fraud = fraud;
    }
    reportSummary(period, from, to) {
        const p = period === 'weekly' || period === 'monthly' ? period : 'daily';
        return this.reports.summary(p, from, to);
    }
    setCommissionRule(u, b) {
        return this.commissions.setRule(u.id, b || {});
    }
    commissionHistory() {
        return this.commissions.history();
    }
    resolveCommission(b) {
        return this.commissions.resolve(String(b?.service_type || ''), {
            providerId: b?.provider_id, category: b?.category, campaignId: b?.campaign_id,
        });
    }
    pendingApprovals() {
        return this.approvals.listPending();
    }
    requestApproval(u, b) {
        return this.approvals.request(b?.type, b?.payload || {}, u.id, b?.reason);
    }
    async decideApproval(u, id, b) {
        const executors = {
            manual_credit: async (pl) => this.ledger.append({
                type: 'bonus', amount: Number(pl.amount), provider_account_id: pl.provider_account_id,
                ref_type: 'financial_operation', ref_id: id, description: pl.note || 'admin manual credit', actor_id: u.id,
            }),
            manual_debit: async (pl) => this.ledger.append({
                type: 'provider_debit', amount: Number(pl.amount), provider_account_id: pl.provider_account_id,
                ref_type: 'financial_operation', ref_id: id, description: pl.note || 'admin manual debit', actor_id: u.id,
            }),
            negative_adjustment: async (pl) => this.ledger.append({
                type: 'provider_debit', amount: Number(pl.amount), provider_account_id: pl.provider_account_id,
                ref_type: 'financial_operation', ref_id: id, description: pl.note || 'negative adjustment', actor_id: u.id,
            }),
            large_refund: async (pl) => this.refundExec.execute({
                refund_id: pl.refund_id || id, booking_kind: pl.booking_kind, booking_id: pl.booking_id,
                patient_id: pl.patient_id, amount: Number(pl.amount), reason: pl.reason || 'approved large refund', actor_id: u.id,
            }),
            large_payout: async (pl) => ({ authorized: true, withdrawal_id: pl.withdrawal_id }),
        };
        return this.approvals.decide(id, u.id, b?.approve === true, b?.note, executors);
    }
    async executeRefund(u, id) {
        const req = await this.conn.collection('refundrequests').findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('refund request not found');
        const state = String(req.state || req.status || '').toUpperCase();
        if (state !== 'APPROVED')
            throw new common_1.BadRequestException(`refund must be APPROVED first (current: ${state})`);
        const amount = Number(req.refund_amount ?? req.amount ?? 0);
        const th = await this.approvals.thresholds();
        if (amount >= th.large_refund_sar) {
            const op = await this.approvals.request('large_refund', {
                refund_id: req.id, booking_kind: req.booking_kind || 'pharmacy', booking_id: req.booking_id,
                patient_id: req.patient_id, amount, reason: req.reason,
            }, u.id, `large refund ${amount} SAR for booking ${req.booking_id}`);
            return { ok: true, routed_to_approval: true, operation_id: op.id };
        }
        const result = await this.refundExec.execute({
            refund_id: req.id, booking_kind: req.booking_kind || 'pharmacy', booking_id: req.booking_id,
            patient_id: req.patient_id, amount, reason: req.reason || 'admin approved refund', actor_id: u.id,
        });
        await this.conn.collection('refundrequests').updateOne({ id }, { $set: { state: 'COMPLETED', executed_at: new Date(), executed_by: u.id, execution: result } });
        return { ok: true, ...result };
    }
    dupScan(bookingId) {
        return this.fraud.detectDuplicatePayments(bookingId);
    }
    inspectProvider(providerId) {
        return this.ledger.providerBalance(providerId);
    }
};
exports.AdminFinanceEngineController = AdminFinanceEngineController;
__decorate([
    (0, common_1.Get)('reports/summary'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminFinanceEngineController.prototype, "reportSummary", null);
__decorate([
    (0, common_1.Post)('commission-rules'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceEngineController.prototype, "setCommissionRule", null);
__decorate([
    (0, common_1.Get)('commission-rules/history'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminFinanceEngineController.prototype, "commissionHistory", null);
__decorate([
    (0, common_1.Post)('commission-rules/resolve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceEngineController.prototype, "resolveCommission", null);
__decorate([
    (0, common_1.Get)('approvals'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminFinanceEngineController.prototype, "pendingApprovals", null);
__decorate([
    (0, common_1.Post)('approvals/request'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceEngineController.prototype, "requestApproval", null);
__decorate([
    (0, common_1.Post)('approvals/:id/decide'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminFinanceEngineController.prototype, "decideApproval", null);
__decorate([
    (0, common_1.Post)('refunds/:id/execute'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminFinanceEngineController.prototype, "executeRefund", null);
__decorate([
    (0, common_1.Get)('fraud/duplicate-payments/:bookingId'),
    __param(0, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminFinanceEngineController.prototype, "dupScan", null);
__decorate([
    (0, common_1.Get)('provider-balance/:providerId'),
    __param(0, (0, common_1.Param)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminFinanceEngineController.prototype, "inspectProvider", null);
exports.AdminFinanceEngineController = AdminFinanceEngineController = __decorate([
    (0, common_1.Controller)('admin/finance-engine'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        ReportsService,
        CommissionResolver,
        ApprovalService,
        RefundExecutor,
        LedgerService,
        FraudService])
], AdminFinanceEngineController);
let FinanceEngineModule = class FinanceEngineModule {
};
exports.FinanceEngineModule = FinanceEngineModule;
exports.FinanceEngineModule = FinanceEngineModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [FinanceEngineController, AdminFinanceEngineController],
        providers: [LedgerService, CommissionResolver, CouponService, LoyaltyRedeemService, FraudService, RefundExecutor, CancellationPolicy, ReportsService, ApprovalService],
        exports: [LedgerService, CommissionResolver, CouponService, LoyaltyRedeemService, FraudService, RefundExecutor, CancellationPolicy, ReportsService, ApprovalService],
    })
], FinanceEngineModule);
//# sourceMappingURL=finance-engine.module.js.map