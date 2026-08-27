/**
 * EPIC 1 — FINANCE & MARKETPLACE ENGINE
 * Enterprise-grade financial core for the Nabd marketplace:
 *  - LedgerService         append-only platform ledger + escrow maturation
 *  - CommissionResolver    default/category/provider/campaign overrides with
 *                          effective dates, versioning and audit history
 *  - CouponService         full promo/coupon rules engine, atomic usage
 *  - LoyaltyRedeemService  points redemption with admin-configurable max %
 *  - FraudService          refund abuse / velocity / coupon abuse / duplicates
 *  - RefundExecutor        real refund execution + provider negative balance
 *  - CancellationPolicy    stage-based cancel fee/refund matrix
 *  - ReportsService        daily/weekly/monthly financial aggregation
 *  - ApprovalService       maker-checker for sensitive financial operations
 * Golden rules:
 *  1. Money never moves without a gateway-verified payment or an approved op.
 *  2. The ledger is append-only — corrections are compensating entries.
 *  3. Provider balances may go negative and are deducted from the next
 *     settlement — the platform never loses a riyal.
 */
import {
  Module, Global, Injectable, Controller, Post, Get, Put, Body, Param, Query,
  UseGuards, BadRequestException, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

export const LEDGER_TYPES = [
  'provider_earning', 'provider_debit', 'payout', 'refund', 'commission',
  'vat', 'adjustment', 'chargeback', 'penalty', 'bonus', 'referral',
  'loyalty', 'settlement',
] as const;
export type LedgerType = typeof LEDGER_TYPES[number];

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

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// ═══════════════════════════════════════════════════════════════════════════
// LedgerService — append-only + escrow (EPIC S8/S9/S10)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class LedgerService {
  private readonly logger = new Logger('LedgerService');
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get col() { return this.conn.collection('platformledgerentries'); }

  /** Append a new entry. The ledger is immutable — there is no update path. */
  async append(entry: {
    provider_account_id?: string | null;
    type: LedgerType;
    amount: number;
    state?: 'pending' | 'cleared' | 'locked' | 'released';
    available_at?: Date;
    ref_type?: string;
    ref_id?: string;
    order_id?: string;
    gross?: number;
    commission_percent?: number;
    commission?: number;
    vat?: number;
    description?: string;
    actor_id?: string;
    meta?: any;
  }) {
    if (!LEDGER_TYPES.includes(entry.type)) throw new BadRequestException(`invalid ledger type ${entry.type}`);
    if (!(Number(entry.amount) >= 0)) throw new BadRequestException('ledger amount must be >= 0 (direction is expressed by type)');
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
    await this.col.insertOne(doc as any);
    return doc;
  }

  /** Idempotency check for a (type, ref_type, ref_id) triple. */
  async exists(type: LedgerType, refType: string, refId: string): Promise<any> {
    return this.col.findOne({ type, ref_type: refType, ref_id: refId } as any);
  }

  /** Escrow maturation: pending → cleared once available_at passes. */
  async matureEscrow(providerId: string) {
    await this.col.updateMany(
      { provider_account_id: providerId, type: 'provider_earning', state: 'pending', available_at: { $lte: new Date() } } as any,
      { $set: { state: 'cleared', matured_at: new Date() } },
    );
  }

  /** Provider balance decomposition — available may go NEGATIVE (S9). */
  async providerBalance(providerId: string) {
    await this.matureEscrow(providerId);
    const w: any[] = await this.col.aggregate([
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
    ] as any[]).toArray().catch(() => [] as any[]);
    const r: any = w[0] || {};
    // Available = cleared earnings − payouts − debits. NEVER clamped at 0:
    // a negative value is a real debt deducted from future settlements (S9).
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

  async settlementDelayDays(serviceType?: string): Promise<number> {
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' } as any);
    return cfg?.settlement?.delay_days?.[serviceType || 'default'] ?? cfg?.settlement?.delay_days?.default ?? DEFAULTS.settlement_delay_days;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CommissionResolver — overrides + effective dates + versioning (EPIC S11)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class CommissionResolver {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get rules() { return this.conn.collection('commissionrules'); }

  /**
   * Resolution order (most specific wins):
   *   campaign → provider → category → service default → finance_config → 10%
   * Only rules that are active AND inside their effective window apply.
   */
  async resolve(serviceType: string, opts: { providerId?: string; category?: string; campaignId?: string } = {}): Promise<{ percent: number; source: string; rule_id?: string }> {
    const now = new Date();
    const windowQ: any = {
      active: { $ne: false },
      $and: [
        { $or: [{ effective_from: { $exists: false } }, { effective_from: null }, { effective_from: { $lte: now } }] },
        { $or: [{ effective_to: { $exists: false } }, { effective_to: null }, { effective_to: { $gte: now } }] },
      ],
    };
    const candidates: Array<{ scope: string; scope_id?: string; source: string }> = [];
    if (opts.campaignId) candidates.push({ scope: 'campaign', scope_id: opts.campaignId, source: 'campaign_override' });
    if (opts.providerId) candidates.push({ scope: 'provider', scope_id: opts.providerId, source: 'provider_override' });
    if (opts.category) candidates.push({ scope: 'category', scope_id: opts.category, source: 'category_override' });
    candidates.push({ scope: 'service', scope_id: serviceType, source: 'service_default' });

    for (const c of candidates) {
      const q: any = { ...windowQ, scope: c.scope };
      if (c.scope_id) q.scope_id = c.scope_id;
      if (c.scope === 'service') q.$or = [{ service_type: serviceType }, { scope_id: serviceType }];
      const rule: any = await this.rules.findOne(q, { sort: { version: -1, createdAt: -1 } } as any);
      if (rule && Number(rule.percent ?? rule.commission) >= 0) {
        return { percent: Number(rule.percent ?? rule.commission), source: c.source, rule_id: rule.id || String(rule._id) };
      }
    }
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' } as any);
    const pct = cfg?.service_types?.[serviceType]?.percent;
    if (Number(pct) >= 0) return { percent: Number(pct), source: 'finance_config' };
    return { percent: DEFAULTS.commission_percent, source: 'system_default' };
  }

  /** Create a new rule version; supersedes older versions of the same scope. */
  async setRule(adminId: string, rule: {
    scope: 'service' | 'provider' | 'category' | 'campaign';
    scope_id?: string; service_type?: string; percent: number;
    effective_from?: Date; effective_to?: Date;
  }) {
    if (!['service', 'provider', 'category', 'campaign'].includes(rule.scope)) throw new BadRequestException('invalid scope');
    if (!(Number(rule.percent) >= 0 && Number(rule.percent) <= 100)) throw new BadRequestException('percent must be 0..100');
    if (rule.scope !== 'service' && !rule.scope_id) throw new BadRequestException('scope_id required');
    if (rule.scope === 'service' && !rule.service_type && !rule.scope_id) throw new BadRequestException('service_type required');

    const matchQ: any = { scope: rule.scope };
    if (rule.scope_id) matchQ.scope_id = rule.scope_id;
    if (rule.service_type) matchQ.service_type = rule.service_type;
    const prev: any = await this.rules.findOne(matchQ, { sort: { version: -1 } } as any);
    const version = (prev?.version || 0) + 1;
    if (prev) await this.rules.updateMany(matchQ, { $set: { active: false, superseded_at: new Date() } });

    const doc = {
      id: `cr_${uuid()}`,
      scope: rule.scope, scope_id: rule.scope_id, service_type: rule.service_type,
      percent: round2(rule.percent),
      effective_from: rule.effective_from ? new Date(rule.effective_from) : null,
      effective_to: rule.effective_to ? new Date(rule.effective_to) : null,
      active: true, version,
      supersedes: prev ? (prev.id || String(prev._id)) : null,
      created_by: adminId, createdAt: new Date(), updatedAt: new Date(),
    };
    await this.rules.insertOne(doc as any);
    await this.conn.collection('commission_rule_history').insertOne({
      ...doc, action: 'created', previous: prev ? { percent: prev.percent ?? prev.commission, version: prev.version } : null,
    } as any);
    return doc;
  }

  async history(filter: any = {}): Promise<any[]> {
    return this.conn.collection('commission_rule_history').find(filter as any, { projection: { _id: 0 } } as any)
      .sort({ createdAt: -1 }).limit(200).toArray();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CouponService — full promo rules engine (EPIC S13)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class CouponService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get coupons() { return this.conn.collection('coupons'); }
  private get usages() { return this.conn.collection('coupon_usages'); }

  /**
   * Validate a coupon for a cart. Returns the computed discount or a reason.
   * Checks: active, expiry window, max uses, per-user single use, min order,
   * max discount cap, provider scope, category scope, first-order only.
   */
  async validate(userId: string, code: string, ctx: { order_total: number; provider_id?: string; categories?: string[] }): Promise<{ valid: boolean; discount: number; reason?: string; coupon?: any }> {
    if (!code) return { valid: false, discount: 0, reason: 'code_required' };
    const c: any = await this.coupons.findOne({ code: String(code).toUpperCase() } as any);
    if (!c) return { valid: false, discount: 0, reason: 'not_found' };
    if (c.active === false) return { valid: false, discount: 0, reason: 'inactive' };
    const now = new Date();
    if (c.valid_from && new Date(c.valid_from) > now) return { valid: false, discount: 0, reason: 'not_yet_valid' };
    if (c.valid_until && new Date(c.valid_until) < now) return { valid: false, discount: 0, reason: 'expired' };
    if (c.max_uses != null && (c.used_count || 0) >= c.max_uses) return { valid: false, discount: 0, reason: 'max_uses_reached' };

    // Single-use per user (default) or multiple-use (usage_limit_per_user > 1)
    const perUserLimit = Number(c.usage_limit_per_user ?? 1);
    const myUses = await this.usages.countDocuments({ code: c.code, user_id: userId } as any);
    if (myUses >= perUserLimit) return { valid: false, discount: 0, reason: 'already_used' };

    if (c.min_order != null && ctx.order_total < Number(c.min_order)) {
      return { valid: false, discount: 0, reason: `min_order_${c.min_order}` };
    }
    if (c.provider_id && ctx.provider_id && c.provider_id !== ctx.provider_id) {
      return { valid: false, discount: 0, reason: 'wrong_provider' };
    }
    if (Array.isArray(c.categories) && c.categories.length > 0) {
      const overlap = (ctx.categories || []).some((cat) => c.categories.includes(cat));
      if (!overlap) return { valid: false, discount: 0, reason: 'wrong_category' };
    }
    if (c.first_order_only) {
      const prior = await this.conn.collection('orders').countDocuments({ patient_id: userId, state: { $nin: ['CANCELLED'] } } as any);
      if (prior > 0) return { valid: false, discount: 0, reason: 'first_order_only' };
    }

    let discount = 0;
    if (Number(c.discount_percent) > 0) discount = (ctx.order_total * Number(c.discount_percent)) / 100;
    else if (Number(c.discount_amount) > 0) discount = Number(c.discount_amount);
    if (Number(c.max_discount) > 0) discount = Math.min(discount, Number(c.max_discount));
    discount = Math.min(round2(discount), round2(ctx.order_total));
    if (!(discount > 0)) return { valid: false, discount: 0, reason: 'no_discount' };
    return { valid: true, discount, coupon: { code: c.code, discount_percent: c.discount_percent, discount_amount: c.discount_amount } };
  }

  /**
   * Apply a coupon to an order — atomic usage recording.
   * The $inc guard on used_count < max_uses prevents race-condition overuse.
   */
  async apply(userId: string, code: string, orderId: string, ctx: { order_total: number; provider_id?: string; categories?: string[] }) {
    const v = await this.validate(userId, code, ctx);
    if (!v.valid) throw new BadRequestException(`coupon_invalid: ${v.reason}`);
    const c: any = await this.coupons.findOne({ code: String(code).toUpperCase() } as any);

    if (c.max_uses != null) {
      const r = await this.coupons.updateOne(
        { code: c.code, used_count: { $lt: c.max_uses } } as any,
        { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } },
      );
      if (!r.matchedCount) throw new BadRequestException('coupon_invalid: max_uses_reached');
    } else {
      await this.coupons.updateOne({ code: c.code } as any, { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } });
    }

    try {
      await this.usages.insertOne({
        id: `cu_${uuid()}`, code: c.code, user_id: userId, order_id: orderId,
        discount: v.discount, createdAt: new Date(),
      } as any);
    } catch (e: any) {
      // duplicate (user, code, order) — roll the counter back
      await this.coupons.updateOne({ code: c.code } as any, { $inc: { used_count: -1 } });
      throw new BadRequestException('coupon_invalid: already_applied');
    }
    return { discount: v.discount, code: c.code };
  }

  /** Release a coupon usage when an unpaid order is cancelled. */
  async release(orderId: string) {
    const usage: any = await this.usages.findOne({ order_id: orderId } as any);
    if (!usage) return;
    await this.usages.deleteOne({ order_id: orderId } as any);
    await this.coupons.updateOne({ code: usage.code } as any, { $inc: { used_count: -1 } });
  }

  async ensureIndexes() {
    await this.usages.createIndex({ order_id: 1 }, { unique: true } as any).catch(() => null);
    await this.usages.createIndex({ code: 1, user_id: 1 } as any).catch(() => null);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LoyaltyRedeemService — points at checkout with max redeem % (EPIC S12)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class LoyaltyRedeemService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private async config() {
    const doc: any = await this.conn.collection('loyalty_config').findOne({ key: 'global' } as any);
    const v = doc?.value || {};
    return {
      enabled: v.redeem_enabled !== false,
      // PAY-004: points are a checkout discount only and can never exceed 5%.
      // Configuration may disable redemption or set a lower rate, but may not raise the cap.
      max_redeem_percent: Math.min(5, Math.max(0, Number(v.max_redeem_percent ?? 5))),
      point_value_sar: Number(v.point_value_sar ?? DEFAULTS.loyalty_point_value_sar),
    };
  }

  /** How many points may be applied to this order, and their SAR value. */
  async quote(userId: string, orderTotal: number) {
    const cfg = await this.config();
    const acc: any = await this.conn.collection('loyalty_accounts').findOne({ user_id: userId } as any);
    const balance = Number(acc?.points ?? 0);
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
      pricing_snapshot_total_sar: round2(orderTotal),
    };
  }

  /**
   * Redeem points against an order. HARD CAP: never more than
   * max_redeem_percent of the order total (EPIC S12 — no full-order points
   * purchases). Atomic balance guard prevents negative balances.
   */
  async redeem(userId: string, orderId: string, points: number, orderTotal: number) {
    const cfg = await this.config();
    if (!cfg.enabled) throw new BadRequestException('loyalty_redemption_disabled');
    const pts = Math.floor(Number(points));
    if (!(pts > 0)) throw new BadRequestException('points_must_be_positive');

    const q = await this.quote(userId, orderTotal);
    if (pts > q.max_points_for_order) {
      throw new BadRequestException(`points_exceed_cap: max ${q.max_points_for_order} (${cfg.max_redeem_percent}% of order)`);
    }

    // Atomic points-only debit with balance guard — points are never a wallet balance.
    const r = await this.conn.collection('loyalty_accounts').updateOne(
      { user_id: userId, points: { $gte: pts } } as any,
      { $inc: { points: -pts }, $set: { updatedAt: new Date() } },
    );
    if (!r.matchedCount) throw new BadRequestException('insufficient_points');

    const discount = round2(pts * cfg.point_value_sar);
    await this.conn.collection('loyalty_transactions').insertOne({
      id: `lt_${uuid()}`, user_id: userId, points_delta: -pts, points: -pts,
      kind: 'redeem', reason: 'order_redemption', order_id: orderId,
      ref_type: 'order', ref_id: orderId, discount_sar: discount,
      pricing_snapshot_total_sar: q.pricing_snapshot_total_sar,
      cap_percent: q.max_redeem_percent,
      cap_discount_sar: q.max_discount_sar,
      point_value_sar: q.point_value_sar,
      createdAt: new Date(),
    } as any);
    return { points: pts, discount_sar: discount, cap_percent: q.max_redeem_percent, pricing_snapshot_total_sar: q.pricing_snapshot_total_sar };
  }

  /** Re-credit points when a paid order that used points is cancelled/refunded. Idempotent. */
  async refundRedemption(userId: string, orderId: string) {
    const tx: any = await this.conn.collection('loyalty_transactions').findOne({ order_id: orderId, kind: 'redeem' } as any);
    if (!tx) return null;
    const already: any = await this.conn.collection('loyalty_transactions').findOne({ order_id: orderId, kind: 'redeem_refund' } as any);
    if (already) return null;
    const pts = Math.abs(tx.points_delta ?? tx.points ?? 0);
    if (!(pts > 0)) return null;
    await this.conn.collection('loyalty_accounts').updateOne(
      { user_id: userId } as any,
      { $inc: { points: pts }, $set: { updatedAt: new Date() } },
      { upsert: true } as any,
    );
    await this.conn.collection('loyalty_transactions').insertOne({
      id: `lt_${uuid()}`, user_id: userId, points_delta: pts, points: pts,
      kind: 'redeem_refund', reason: 'order_cancelled_recredit', order_id: orderId,
      ref_type: 'order', ref_id: orderId, reversal_of: tx.id,
      pricing_snapshot_total_sar: tx.pricing_snapshot_total_sar,
      cap_percent: tx.cap_percent,
      discount_sar: tx.discount_sar,
      createdAt: new Date(),
    } as any);
    return { points_recredited: pts };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FraudService — detection hooks (EPIC S15)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class FraudService {
  private readonly logger = new Logger('FraudService');
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get alerts() { return this.conn.collection('fraud_alerts'); }

  async raise(opts: { userId?: string; providerId?: string; flagType: string; confidence: number; details?: any; severity?: string }) {
    // De-duplicate identical open alerts for the same user+type
    const dup: any = await this.alerts.findOne({ userId: opts.userId || null, flagType: opts.flagType, status: { $in: ['pending', 'flagged'] } } as any);
    if (dup) return dup;
    const doc = {
      id: `fa_${uuid()}`,
      userId: opts.userId || null,
      providerId: opts.providerId || null,
      flagType: opts.flagType,
      confidenceScore: opts.confidence,
      severity: opts.severity || (opts.confidence >= 0.8 ? 'high' : 'medium'),
      details: opts.details || {},
      status: 'pending',
      createdAt: new Date(), updatedAt: new Date(),
    };
    await this.alerts.insertOne(doc as any);
    this.logger.warn(`FRAUD ALERT ${opts.flagType} user=${opts.userId} conf=${opts.confidence}`);
    return doc;
  }

  /** Refund abuse: ≥ N refund requests in 30 days. */
  async checkRefundAbuse(userId: string) {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const count = await this.conn.collection('refundrequests').countDocuments({ patient_id: userId, createdAt: { $gte: since } } as any);
    if (count >= DEFAULTS.refund_abuse_count_30d) {
      await this.raise({ userId, flagType: 'refund_abuse', confidence: Math.min(0.5 + count * 0.1, 0.99), details: { refunds_30d: count } });
      return true;
    }
    return false;
  }

  /** Payment velocity: ≥ N failed payments in the last hour (card testing / bot). */
  async checkPaymentVelocity(userId: string) {
    const since = new Date(Date.now() - 3600 * 1000);
    const count = await this.conn.collection('moyasar_payments').countDocuments({ patient_id: userId, status: 'failed', createdAt: { $gte: since } } as any);
    if (count >= DEFAULTS.payment_velocity_failed_1h) {
      await this.raise({ userId, flagType: 'payment_velocity_abuse', confidence: 0.85, details: { failed_1h: count } });
      return true;
    }
    return false;
  }

  /** Coupon abuse: repeated invalid coupon attempts. */
  async recordCouponFailure(userId: string, code: string) {
    await this.conn.collection('coupon_failures').insertOne({ user_id: userId, code, at: new Date() } as any);
    const since = new Date(Date.now() - 3600 * 1000);
    const count = await this.conn.collection('coupon_failures').countDocuments({ user_id: userId, at: { $gte: since } } as any);
    if (count >= DEFAULTS.coupon_abuse_failed_1h) {
      await this.raise({ userId, flagType: 'coupon_abuse', confidence: 0.8, details: { failed_1h: count } });
      return true;
    }
    return false;
  }

  /**
   * Duplicate payment detection (EPIC S3/S15): two PAID payments for the same
   * booking = a double charge. Raises a CRITICAL alert for admin review.
   */
  async detectDuplicatePayments(bookingId: string) {
    const paid: any[] = await this.conn.collection('moyasar_payments')
      .find({ booking_id: bookingId, status: 'paid' } as any).toArray();
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
}

// ═══════════════════════════════════════════════════════════════════════════
// RefundExecutor — real refund execution (EPIC S4) + negative balance (S9)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class RefundExecutor {
  private readonly logger = new Logger('RefundExecutor');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ledger: LedgerService,
    private readonly fraud: FraudService,
    private readonly events: EventEmitter2,
  ) {}

  private moyasarKey(): string {
    const k = process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || process.env.MOYASAR_API_KEY || '';
    if (!k) throw new BadRequestException('payment_gateway_not_configured');
    return k;
  }

  /**
   * Execute an approved refund end-to-end. Idempotent per refund_id.
   *  1. Refund via Moyasar when a gateway payment exists (full or partial).
   *  2. For a cash commitment, create an auditable manual cash-settlement task.
   *  3. Append ledger entries (refund + commission reversal).
   *  4. Provider debit: if the provider was already credited, claw the net
   *     back as provider_debit — the balance goes NEGATIVE and is deducted
   *     from the next settlement. The platform never loses money (S9).
   *  5. Update booking payment_status + notify the patient.
   */
  async execute(opts: {
    refund_id: string;
    booking_kind: string;
    booking_id: string;
    patient_id: string;
    amount: number;
    reason: string;
    actor_id: string;
  }): Promise<{ ok: boolean; method: string; gateway_refund_id?: string; provider_debited?: number }> {
    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new BadRequestException('refund amount must be positive');

    // Idempotency: a completed execution for this refund_id is a no-op
    const prior = await this.ledger.exists('refund', 'refund', opts.refund_id);
    if (prior) return { ok: true, method: 'already_executed' };

    // Total refunded so far for this booking must never exceed what was paid
    const paidPayment: any = await this.conn.collection('moyasar_payments').findOne(
      { booking_id: opts.booking_id, status: { $in: ['paid', 'refunded'] } } as any,
      { sort: { createdAt: -1 } } as any,
    );
    const paidTotal = paidPayment ? Number(paidPayment.amount || 0) : null;
    if (paidTotal != null) {
      const alreadyRefunded = Number(paidPayment.refunded_amount || 0);
      if (alreadyRefunded + amount > paidTotal + 0.001) {
        throw new BadRequestException(`refund_exceeds_paid: paid ${paidTotal}, already refunded ${alreadyRefunded}`);
      }
    }

    let method = 'cash_manual_settlement';
    let gatewayRefundId: string | undefined;

    // 1) Gateway refund (real money back to the card)
    if (paidPayment && paidPayment.moyasar_id && !String(paidPayment.moyasar_id).startsWith('sandbox_')) {
      const key = this.moyasarKey();
      const resp = await fetch(`https://api.moyasar.com/v1/payments/${paidPayment.moyasar_id}/refund`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount * 100), reason: opts.reason?.slice(0, 255) || 'refund' }),
      });
      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        this.logger.error(`Moyasar refund failed for ${paidPayment.moyasar_id}: ${data?.message || resp.status}`);
        throw new BadRequestException(`gateway_refund_failed: ${data?.message || resp.status}`);
      }
      method = 'gateway';
      gatewayRefundId = data?.id;
      const newRefunded = round2(Number(paidPayment.refunded_amount || 0) + amount);
      await this.conn.collection('moyasar_payments').updateOne(
        { _id: paidPayment._id } as any,
        { $set: { refunded_amount: newRefunded, status: newRefunded >= Number(paidPayment.amount || 0) - 0.001 ? 'refunded' : 'paid', refunded_at: new Date() } },
      );
    } else {
      // Cash commitments have no electronic original payment to refund. Never
      // convert the amount into a customer balance; finance must record the
      // actual handover before the return is marked settled.
      await this.conn.collection('manual_refund_settlements').updateOne(
        { refund_id: opts.refund_id } as any,
        {
          $setOnInsert: {
            id: `mrs_${uuid()}`,
            refund_id: opts.refund_id,
            booking_kind: opts.booking_kind,
            booking_id: opts.booking_id,
            patient_id: opts.patient_id,
            amount,
            currency: 'SAR',
            reason: opts.reason,
            status: 'PENDING_CASH_HANDOVER',
            requested_by: opts.actor_id,
            createdAt: new Date(),
          },
        },
        { upsert: true } as any,
      );
    }

    // 3) Ledger: refund record (+ commission reversal note for reports)
    await this.ledger.append({
      type: 'refund', amount,
      provider_account_id: null,
      ref_type: 'refund', ref_id: opts.refund_id, order_id: opts.booking_id,
      description: `Patient refund (${method}) — ${opts.reason || ''}`.trim(),
      actor_id: opts.actor_id,
      meta: { booking_kind: opts.booking_kind, patient_id: opts.patient_id, method, gateway_refund_id: gatewayRefundId },
    });

    // 4) Provider debit — claw back the credited net earning (S9)
    let providerDebited = 0;
    const earning: any = await this.conn.collection('platformledgerentries').findOne({
      type: 'provider_earning',
      $or: [{ ref_id: opts.booking_id }, { order_id: opts.booking_id }],
    } as any);
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

    // 5) Booking payment_status + notification + audit event
    const kindCollection: Record<string, string> = {
      pharmacy: 'orders', order: 'orders', orders: 'orders',
      consultation: 'appointments', appointment: 'appointments',
      lab: 'labbookings', radiology: 'radiologybookings',
      nursing: 'homecarebookings', 'home-care': 'homecarebookings',
    };
    const coll = kindCollection[opts.booking_kind];
    if (coll) {
      const newStatus = paidTotal != null && amount < paidTotal - 0.001 ? 'partially_refunded' : 'refunded';
      await this.conn.collection(coll).updateOne(
        { id: opts.booking_id } as any,
        { $set: { payment_status: newStatus, refund_status: 'REFUNDED', updatedAt: new Date() } },
      );
    }
    await this.conn.collection('notifications').insertOne({
      id: uuid(), user_id: opts.patient_id,
      title_key: 'تم استرداد المبلغ', body_key: `تم إرجاع ${amount} ر.س ${method === 'gateway' ? 'إلى بطاقتك البنكية' : 'إلى محفظتك'} — ${opts.reason || ''}`.trim(),
      params: {}, type: 'payment', priority: 'high', read_by: [],
      status: 'DELIVERED', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    this.events.emit('payment.refund', {
      actor_id: opts.actor_id, transaction_id: gatewayRefundId || opts.refund_id,
      booking_id: opts.booking_id, booking_kind: opts.booking_kind,
      patient_id: opts.patient_id, amount, method,
    });

    return { ok: true, method, gateway_refund_id: gatewayRefundId, provider_debited: providerDebited };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CancellationPolicy — stage-based matrix (EPIC S6)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class CancellationPolicy {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /**
   * Who bears the cost at each stage (defaults overridable via
   * finance_config { key: 'cancel_policy' }):
   *  - before ACCEPTED            → full refund, no fee
   *  - ACCEPTED..PREPARING        → full refund, stock restored, no fee
   *  - READY_FOR_DISPATCH..OUT    → patient cancels: delivery fee retained
   *                                 (courier compensation); provider/admin: full
   *  - DELIVERED+                 → no cancellation (use returns flow)
   */
  async forOrder(state: string, actorRole: string, deliveryFee = 0): Promise<{ refundable_percent: number; fee_sar: number; fee_reason?: string; restore_stock: boolean; allowed: boolean; block_reason?: string }> {
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'cancel_policy' } as any);
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
    // CREATED / VALIDATED / PHARMACY_RECEIVED / BROADCAST / NEW / PENDING_INSURANCE …
    return { allowed: true, refundable_percent: 100, fee_sar: 0, restore_stock: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ReportsService — daily/weekly/monthly financial aggregation (EPIC S16)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class ReportsService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async summary(period: 'daily' | 'weekly' | 'monthly' = 'daily', fromQ?: string, toQ?: string) {
    const now = new Date();
    let from: Date;
    if (fromQ) from = new Date(fromQ);
    else if (period === 'weekly') from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    else if (period === 'monthly') from = new Date(now.getFullYear(), now.getMonth(), 1);
    else from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = toQ ? new Date(toQ) : now;
    const dateQ = { createdAt: { $gte: from, $lte: to } };

    const [payments, ledgerRows, refunds, cancelledOrders] = await Promise.all([
      this.conn.collection('moyasar_payments').aggregate([
        { $match: dateQ },
        { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ] as any[]).toArray().catch(() => [] as any[]),
      this.conn.collection('platformledgerentries').aggregate([
        { $match: dateQ },
        { $group: { _id: { type: '$type', state: '$state' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ] as any[]).toArray().catch(() => [] as any[]),
      this.conn.collection('refundrequests').aggregate([
        { $match: dateQ },
        { $group: { _id: '$state', total: { $sum: '$refund_amount' }, count: { $sum: 1 } } },
      ] as any[]).toArray().catch(() => [] as any[]),
      this.conn.collection('orders').countDocuments({ ...dateQ, state: 'CANCELLED' } as any).catch(() => 0),
    ]);

    const p = (st: string) => (payments as any[]).filter((x) => x._id === st).reduce((s, x) => s + (x.total || 0), 0);
    const pc = (st: string) => (payments as any[]).filter((x) => x._id === st).reduce((s, x) => s + (x.count || 0), 0);
    const l = (type: string, state?: string) =>
      (ledgerRows as any[]).filter((x) => x._id?.type === type && (!state || x._id?.state === state)).reduce((s, x) => s + (x.total || 0), 0);
    const r = (st: string) => (refunds as any[]).filter((x) => String(x._id).toUpperCase() === st).reduce((s, x) => s + (x.total || 0), 0);

    const gross = round2(p('paid') + p('refunded'));

    // commission & vat come from earning rows' embedded fields
    const ev: any[] = await this.conn.collection('platformledgerentries').aggregate([
      { $match: { ...dateQ, type: 'provider_earning' } },
      { $group: { _id: null, commission: { $sum: '$commission' }, vat: { $sum: '$vat' }, gross: { $sum: '$gross' }, net: { $sum: '$amount' } } },
    ] as any[]).toArray().catch(() => [] as any[]);
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
      refunds_requested_count: (refunds as any[]).reduce((s, x) => s + (x.count || 0), 0),
      chargebacks: round2(l('chargeback')),
      provider_pending_escrow: round2(l('provider_earning', 'pending')),
      provider_settled: round2(l('payout')),
      provider_debits: round2(l('provider_debit')),
      canceled_orders: cancelledOrders,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ApprovalService — maker-checker for sensitive operations (EPIC S14)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class ApprovalService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly events: EventEmitter2,
  ) {}

  private get ops() { return this.conn.collection('financial_operations'); }

  async thresholds() {
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'approval' } as any);
    return {
      large_payout_sar: Number(cfg?.large_payout_sar ?? DEFAULTS.large_payout_sar),
      large_refund_sar: Number(cfg?.large_refund_sar ?? DEFAULTS.large_refund_sar),
    };
  }

  /** Create a pending operation that a DIFFERENT admin must approve. */
  async request(type: 'manual_credit' | 'manual_debit' | 'large_payout' | 'large_refund' | 'negative_adjustment', payload: any, requestedBy: string, reason?: string) {
    if (!reason || !String(reason).trim()) throw new BadRequestException('reason is required for sensitive financial operations');
    const doc = {
      id: `fo_${uuid()}`,
      type, payload, reason: String(reason).trim(),
      status: 'pending_approval',
      requested_by: requestedBy,
      createdAt: new Date(), updatedAt: new Date(),
    };
    await this.ops.insertOne(doc as any);
    await this.conn.collection('notifications').insertOne({
      id: uuid(), role: 'admin',
      title_key: 'عملية مالية تنتظر الموافقة',
      body_key: `${type} بقيمة ${payload?.amount ?? ''} ر.س — السبب: ${doc.reason}`,
      params: {}, type: 'alert', priority: 'high', read_by: [],
      status: 'DELIVERED', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    return doc;
  }

  async listPending(): Promise<any[]> {
    return this.ops.find({ status: 'pending_approval' } as any, { projection: { _id: 0 } } as any).sort({ createdAt: 1 }).limit(100).toArray();
  }

  /**
   * Approve/reject. Maker-checker: the approver can NEVER be the requester.
   * Execution of the approved payload is delegated to the caller-provided
   * executor map (wired in the controller to real services).
   */
  async decide(id: string, adminId: string, approve: boolean, note?: string, executors: Record<string, (payload: any) => Promise<any>> = {}) {
    const op: any = await this.ops.findOne({ id } as any);
    if (!op) throw new NotFoundException('operation not found');
    if (op.status !== 'pending_approval') throw new BadRequestException(`already ${op.status}`);
    if (op.requested_by === adminId) throw new ForbiddenException('maker_checker: requester cannot approve their own operation');

    if (!approve) {
      await this.ops.updateOne({ id } as any, { $set: { status: 'rejected', decided_by: adminId, decided_at: new Date(), decision_note: note, updatedAt: new Date() } });
      // S3: a rejected financial operation (e.g. refund) must notify the affected user
      this.events.emit('finance.operation.rejected', { id, type: op.type, by: adminId, payload: op.payload, note });
      return { ok: true, status: 'rejected' };
    }

    const executor = executors[op.type];
    if (!executor) throw new BadRequestException(`no executor wired for ${op.type}`);
    const result = await executor(op.payload);

    await this.ops.updateOne({ id } as any, {
      $set: { status: 'executed', decided_by: adminId, decided_at: new Date(), decision_note: note, execution_result: result ? JSON.parse(JSON.stringify(result)) : null, updatedAt: new Date() },
    });
    this.events.emit('finance.operation.executed', { id, type: op.type, by: adminId, payload: op.payload });
    return { ok: true, status: 'executed', result };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Controllers
// ═══════════════════════════════════════════════════════════════════════════

/** Patient/provider-facing financial engine endpoints. */
@Controller('finance-engine')
@UseGuards(JwtAuthGuard)
export class FinanceEngineController {
  constructor(
    private readonly coupons: CouponService,
    private readonly loyalty: LoyaltyRedeemService,
    private readonly ledger: LedgerService,
  ) {}

  /** Validate a coupon against a cart (patient checkout). */
  @Post('coupons/validate')
  async validateCoupon(@CurrentUser() u: any, @Body() b: any) {
    const orderTotal = Number(b?.order_total);
    if (!(orderTotal > 0)) throw new BadRequestException('order_total required');
    return this.coupons.validate(u.id, String(b?.code || ''), {
      order_total: orderTotal,
      provider_id: b?.provider_id,
      categories: Array.isArray(b?.categories) ? b.categories : [],
    });
  }

  /** Loyalty redemption quote for a cart (patient checkout). */
  @Post('loyalty/redeem-quote')
  async loyaltyQuote(@CurrentUser() u: any, @Body() b: any) {
    const orderTotal = Number(b?.order_total);
    if (!(orderTotal > 0)) throw new BadRequestException('order_total required');
    return this.loyalty.quote(u.id, orderTotal);
  }

  /** Provider: full balance decomposition (available/pending/locked/negative). */
  @Get('provider/balance')
  async providerBalance(@CurrentUser() u: any) {
    return this.ledger.providerBalance(u.id);
  }
}

/** Admin financial engine endpoints (EPIC S11/S14/S16). */
@Controller('admin/finance-engine')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminFinanceEngineController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly reports: ReportsService,
    private readonly commissions: CommissionResolver,
    private readonly approvals: ApprovalService,
    private readonly refundExec: RefundExecutor,
    private readonly ledger: LedgerService,
    private readonly fraud: FraudService,
  ) {}

  /** Financial reports: daily/weekly/monthly (S16). */
  @Get('reports/summary')
  reportSummary(@Query('period') period?: string, @Query('from') from?: string, @Query('to') to?: string) {
    const p = period === 'weekly' || period === 'monthly' ? period : 'daily';
    return this.reports.summary(p as any, from, to);
  }

  /** Commission rules with overrides + effective dates + versioning (S11). */
  @Post('commission-rules')
  setCommissionRule(@CurrentUser() u: any, @Body() b: any) {
    return this.commissions.setRule(u.id, b || {});
  }

  @Get('commission-rules/history')
  commissionHistory(): Promise<any[]> {
    return this.commissions.history();
  }

  @Post('commission-rules/resolve')
  resolveCommission(@Body() b: any) {
    return this.commissions.resolve(String(b?.service_type || ''), {
      providerId: b?.provider_id, category: b?.category, campaignId: b?.campaign_id,
    });
  }

  /** Maker-checker queue (S14). */
  @Get('approvals')
  pendingApprovals(): Promise<any[]> {
    return this.approvals.listPending();
  }

  @Post('approvals/request')
  requestApproval(@CurrentUser() u: any, @Body() b: any) {
    return this.approvals.request(b?.type, b?.payload || {}, u.id, b?.reason);
  }

  @Post('approvals/:id/decide')
  async decideApproval(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    const executors: Record<string, (payload: any) => Promise<any>> = {
      // Manual provider credit/debit → ledger adjustment entries (append-only)
      manual_credit: async (pl: any) => this.ledger.append({
        type: 'bonus', amount: Number(pl.amount), provider_account_id: pl.provider_account_id,
        ref_type: 'financial_operation', ref_id: id, description: pl.note || 'admin manual credit', actor_id: u.id,
      }),
      manual_debit: async (pl: any) => this.ledger.append({
        type: 'provider_debit', amount: Number(pl.amount), provider_account_id: pl.provider_account_id,
        ref_type: 'financial_operation', ref_id: id, description: pl.note || 'admin manual debit', actor_id: u.id,
      }),
      negative_adjustment: async (pl: any) => this.ledger.append({
        type: 'provider_debit', amount: Number(pl.amount), provider_account_id: pl.provider_account_id,
        ref_type: 'financial_operation', ref_id: id, description: pl.note || 'negative adjustment', actor_id: u.id,
      }),
      large_refund: async (pl: any) => this.refundExec.execute({
        refund_id: pl.refund_id || id, booking_kind: pl.booking_kind, booking_id: pl.booking_id,
        patient_id: pl.patient_id, amount: Number(pl.amount), reason: pl.reason || 'approved large refund', actor_id: u.id,
      }),
      // large_payout execution stays in the withdrawals flow; approval here
      // simply authorizes it (the withdrawals execute endpoint checks this).
      large_payout: async (pl: any) => ({ authorized: true, withdrawal_id: pl.withdrawal_id }),
    };
    return this.approvals.decide(id, u.id, b?.approve === true, b?.note, executors);
  }

  /** Execute an APPROVED refund request (S4/S14). Large amounts need maker-checker. */
  @Post('refunds/:id/execute')
  async executeRefund(@CurrentUser() u: any, @Param('id') id: string) {
    const req: any = await this.conn.collection('refundrequests').findOne({ id } as any);
    if (!req) throw new NotFoundException('refund request not found');
    const state = String(req.state || req.status || '').toUpperCase();
    if (state !== 'APPROVED') throw new BadRequestException(`refund must be APPROVED first (current: ${state})`);

    const amount = Number(req.refund_amount ?? req.amount ?? 0);
    const th = await this.approvals.thresholds();
    if (amount >= th.large_refund_sar) {
      // Route through maker-checker instead of direct execution
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
    await this.conn.collection('refundrequests').updateOne(
      { id } as any,
      { $set: { state: 'COMPLETED', executed_at: new Date(), executed_by: u.id, execution: result } },
    );
    return { ok: true, ...result };
  }

  /** Duplicate-payment scan for a booking (S15). */
  @Get('fraud/duplicate-payments/:bookingId')
  dupScan(@Param('bookingId') bookingId: string) {
    return this.fraud.detectDuplicatePayments(bookingId);
  }

  /** Provider balance inspector (admin view incl. negative balances, S9). */
  @Get('provider-balance/:providerId')
  inspectProvider(@Param('providerId') providerId: string) {
    return this.ledger.providerBalance(providerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
@Global()
@Module({
  controllers: [FinanceEngineController, AdminFinanceEngineController],
  providers: [LedgerService, CommissionResolver, CouponService, LoyaltyRedeemService, FraudService, RefundExecutor, CancellationPolicy, ReportsService, ApprovalService],
  exports: [LedgerService, CommissionResolver, CouponService, LoyaltyRedeemService, FraudService, RefundExecutor, CancellationPolicy, ReportsService, ApprovalService],
})
export class FinanceEngineModule {}
