import { Cron } from '@nestjs/schedule';
import { ScheduledOnce } from '../../common/scheduled-once';
import { normalizeCoupon } from '../../common/coupon-doc';
import { shadowFields } from '../../common/halala-shadow';
import { copayRefundable, findCopayTransaction } from '../../common/copay-transaction';
import { riyadhDayRange, riyadhMonthStart } from '../../common/riyadh-clock';
import { ModuleRef } from '@nestjs/core';
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
  Optional, ConflictException } from '@nestjs/common';
import { ValidateCouponDto, LoyaltyQuoteDto, SetCommissionRuleDto, ResolveCommissionDto, RequestApprovalDto, DecideApprovalDto } from './finance-engine.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard, CurrentUser, Roles, SelfService } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { moyasarBase } from '../../common/moyasar-base';
import { timedFetch } from '../../common/external-call';
import { settlementDelayDefault, DEFAULT_COMMISSION_PERCENT, DEFAULT_VAT_PERCENT } from '../../common/commission-defaults';
import { PROMO_COLLECTION, promoState, type CommissionPromo } from '../../common/commission-promo';
import { DurableEventsService, emitDurable } from '../durable-events/durable-events.service';
import { roundSar, toHalalas } from '../../common/money';
import { clawbackShares } from './refund-clawback';
import { halalasSum, reportFigures } from './report-totals';
import { patientAbsentPercent, patientAbsentRefund, pharmacyCancelRefund, refundsDeliveryFeeBeforeDispatch } from './refund-policy-rules';

export const LEDGER_TYPES = [
  'provider_earning', 'provider_debit', 'payout', 'refund', 'commission',
  'vat', 'adjustment', 'chargeback', 'penalty', 'bonus', 'referral',
  'loyalty', 'settlement',
  // platform-side reversal of the commission and of the VAT on it, in proportion to a refund of a service whose earning was credited
  'commission_reversal', 'vat_reversal',
] as const;
export type LedgerType = typeof LEDGER_TYPES[number];

const DEFAULTS = {
  commission_percent: DEFAULT_COMMISSION_PERCENT,
  vat_percent: DEFAULT_VAT_PERCENT,
  settlement_delay_days: 3,
  minimum_payout_sar: 100,
  large_payout_sar: 10000,
  large_refund_sar: 5000,
  loyalty_max_redeem_percent: 10,
  loyalty_point_value_sar: 0.1,
  refund_abuse_count_30d: 3,
  payment_velocity_failed_1h: 5,
  coupon_abuse_failed_1h: 10,
};
/** Read-only view of the finance defaults for other modules (admin urgent-alert rule defaults). */
export const FINANCE_DEFAULTS: Readonly<typeof DEFAULTS> = DEFAULTS;

const round2 = (n: number) => roundSar(Number(n) || 0);

// ═══════════════════════════════════════════════════════════════════════════
// LedgerService — append-only + escrow (EPIC S8/S9/S10)
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class LedgerService {
  private readonly logger = new Logger('LedgerService');
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get col() { return this.conn.collection('platformledgerentries'); }
  private maturityIndex?: Promise<unknown>;

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
      // R11 dual write: integer halalas next to the legacy double (docs/platform/R11-money-integrity.md); readers still use the doubles
      amount_halalas: toHalalas(round2(entry.amount)),
      ...(entry.gross !== undefined && entry.gross !== null ? { gross_halalas: toHalalas(entry.gross) } : {}),
      ...(entry.commission !== undefined && entry.commission !== null ? { commission_halalas: toHalalas(entry.commission) } : {}),
      ...(entry.vat !== undefined && entry.vat !== null ? { vat_halalas: toHalalas(entry.vat) } : {}),
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

  /**
   * Escrow maturation for EVERY provider, on a schedule. Until now an earning only turned from pending to cleared when somebody called `providerBalance` for that provider, so any
   * reader that sums the ledger directly (the withdrawal request, the admin statement, the finance reports) saw matured money as still pending until then, and a provider who asked to
   * withdraw without opening the balance screen first was refused "insufficient_available_balance". Idempotent and cheap (one indexed update).
   */
  @Cron('*/10 * * * *')
  @ScheduledOnce({ ttlMs: 5 * 60_000, holdMs: 60_000 })
  async matureAllDueEscrow(now: Date = new Date()): Promise<number> {
    // the ledger has no index for this filter: without one every run would read the whole collection. A small partial index (pending earnings only) makes it a look at the few rows that wait.
    await (this.maturityIndex ??= Promise.resolve().then(() => this.col.createIndex({ available_at: 1 }, { name: 'ledger_pending_earning_due', partialFilterExpression: { type: 'provider_earning', state: 'pending' } })).catch(() => null));
    const res: any = await this.col.updateMany(
      { type: 'provider_earning', state: 'pending', available_at: { $lte: now } } as any,
      { $set: { state: 'cleared', matured_at: now } },
    );
    return Number(res?.modifiedCount ?? 0);
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
    return cfg?.settlement?.delay_days?.[serviceType || 'default'] ?? cfg?.settlement?.delay_days?.default ?? settlementDelayDefault();
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
   *   campaign rule → the provider's running promotion → the provider's own commission (provider rule, then the percent set on the
   *   provider) → category rule → service rule → finance_config → the one system default (commission-defaults.ts)
   * Only rules that are active AND inside their effective window apply.
   */
  async resolve(serviceType: string, opts: { providerId?: string; category?: string; campaignId?: string; paymentMethod?: string; now?: Date; skipPromoIds?: string[] } = {}): Promise<{ percent: number; source: string; rule_id?: string; promo_id?: string }> {
    const now = opts.now ?? new Date();
    const windowQ: any = {
      active: { $ne: false },
      $and: [
        { $or: [{ effective_from: { $exists: false } }, { effective_from: null }, { effective_from: { $lte: now } }] },
        { $or: [{ effective_to: { $exists: false } }, { effective_to: null }, { effective_to: { $gte: now } }] },
      ],
    };
    const ruleFor = async (c: { scope: string; scope_id?: string; source: string }) => {
      const q: any = { ...windowQ, scope: c.scope };
      if (c.scope_id) q.scope_id = c.scope_id;
      if (c.scope === 'service') q.$or = [{ service_type: serviceType }, { scope_id: serviceType }];
      const rule: any = await this.rules.findOne(q, { sort: { version: -1, createdAt: -1 } } as any);
      if (rule && Number(rule.percent ?? rule.commission) >= 0) {
        return { percent: Number(rule.percent ?? rule.commission), source: c.source, rule_id: rule.id || String(rule._id) };
      }
      return null;
    };

    // 1. a campaign rule
    if (opts.campaignId) { const hit = await ruleFor({ scope: 'campaign', scope_id: opts.campaignId, source: 'campaign_override' }); if (hit) return hit; }
    if (opts.providerId) {
      // 2. the provider's promotion (commission X% from A to B, or for the first N orders; 0 is allowed). It ends by itself.
      const promo = await this.activePromo(opts.providerId, now, opts.skipPromoIds);
      if (promo) return { percent: promo.percent, source: 'provider_promo', promo_id: promo.id };
      // 3. the provider's own commission: a provider rule, then the percent set on the provider (cash, or insurance for an insured visit)
      const rule = await ruleFor({ scope: 'provider', scope_id: opts.providerId, source: 'provider_override' }); if (rule) return rule;
      const own = await this.profileOverride(opts.providerId, opts.paymentMethod);
      if (own !== null) return { percent: own, source: 'provider_profile' };
    }
    // 4. a category rule, 5. the service rule, 6. finance_config, 7. the one system default
    if (opts.category) { const hit = await ruleFor({ scope: 'category', scope_id: opts.category, source: 'category_override' }); if (hit) return hit; }
    const service = await ruleFor({ scope: 'service', scope_id: serviceType, source: 'service_default' }); if (service) return service;
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' } as any);
    const pct = cfg?.service_types?.[serviceType]?.percent;
    if (Number(pct) >= 0) return { percent: Number(pct), source: 'finance_config' };
    return { percent: DEFAULTS.commission_percent, source: 'system_default' };
  }

  /** The provider's promotion that is running at `now`, if any (the newest one when the admin left two). */
  async activePromo(providerId: string, now: Date, skip: string[] = []): Promise<CommissionPromo | null> {
    const rows: any[] = await this.conn.collection(PROMO_COLLECTION).find({ provider_account_id: providerId, active: { $ne: false } } as any).sort({ createdAt: -1 }).toArray();
    return rows.find((p) => !skip.includes(p.id) && promoState({ ...p, max_orders: p.max_orders ?? null }, now) === 'active') ?? null;
  }

  /** The percent the admin set on the provider itself (`commission_insurance_pct` for an insured visit, else `commission_cash_pct`); null = none. */
  private async profileOverride(providerId: string, paymentMethod?: string): Promise<number | null> {
    const profile: any = await this.conn.collection('provider_profiles').findOne(
      { $or: [{ account_id: providerId }, { user_id: providerId }] },
      { projection: { _id: 0, commission_cash_pct: 1, commission_insurance_pct: 1 } },
    );
    const own = String(paymentMethod || '').toLowerCase() === 'insurance' ? profile?.commission_insurance_pct : profile?.commission_cash_pct;
    return typeof own === 'number' && Number.isFinite(own) && own >= 0 && own <= 100 ? own : null;
  }

  /**
   * Counts one completed order against a promo (at most `max_orders` ever succeed, even with two completions at once).
   * false = the promo has no order left: the caller asks `resolve` again, skipping it.
   */
  async claimPromoOrder(promoId: string): Promise<boolean> {
    const res: any = await this.conn.collection(PROMO_COLLECTION).updateOne(
      { id: promoId, active: { $ne: false }, $or: [{ max_orders: null }, { max_orders: { $exists: false } }, { $expr: { $lt: ['$used_orders', '$max_orders'] } }] } as any,
      { $inc: { used_orders: 1 }, $set: { updatedAt: new Date() } } as any,
    );
    return (res?.modifiedCount ?? res?.matchedCount ?? 0) > 0;
  }

  /** Gives back an order a losing creditEarning had claimed (the earning was already credited by a parallel call): never below 0. */
  async releasePromoOrder(promoId: string): Promise<void> {
    await this.conn.collection(PROMO_COLLECTION).updateOne({ id: promoId, used_orders: { $gt: 0 } } as any, { $inc: { used_orders: -1 }, $set: { updatedAt: new Date() } } as any);
  }

  /** Create a new rule version; supersedes older versions of the same scope. */
  async setRule(adminId: string, rule: {
    scope: 'service' | 'provider' | 'category' | 'campaign';
    scope_id?: string; service_type?: string; percent: number;
    effective_from?: Date | string; effective_to?: Date | string;
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
export interface CouponContext {
  order_total: number;
  /** SAR value of the prescription-only lines of the cart (16.12 / D-10): they are never discounted. */
  rx_total?: number;
  provider_id?: string;
  categories?: string[];
}

/** What a coupon (or a points redemption) may discount: the cart without its prescription-only lines. */
export function couponEligibleTotal(ctx: { order_total: number; rx_total?: number }): number {
  const total = Number(ctx.order_total);
  const rx = Math.max(0, Number(ctx.rx_total) || 0);
  return Number.isFinite(total) ? Math.max(0, round2(total - rx)) : 0;
}

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
  async validate(userId: string, code: string, ctx: CouponContext): Promise<{ valid: boolean; discount: number; reason?: string; coupon?: any }> {
    const result = await this.evaluate(userId, code, ctx);
    // 16.12: every refused attempt is counted; ten in an hour stop further guessing for that account
    if (!result.valid && result.reason !== 'code_required' && result.reason !== 'too_many_attempts') {
      await this.conn.collection('coupon_failures').insertOne({ user_id: userId, code: String(code).toUpperCase().slice(0, 40), reason: result.reason, at: new Date() } as any).catch(() => undefined);
    }
    return result;
  }

  private async evaluate(userId: string, code: string, ctx: CouponContext): Promise<{ valid: boolean; discount: number; reason?: string; coupon?: any }> {
    if (!code) return { valid: false, discount: 0, reason: 'code_required' };
    const failures = await this.conn.collection('coupon_failures').countDocuments({ user_id: userId, at: { $gte: new Date(Date.now() - 3600 * 1000) } } as any);
    if (failures >= DEFAULTS.coupon_abuse_failed_1h) return { valid: false, discount: 0, reason: 'too_many_attempts' };
    // 16.12 / D-10: a coupon never discounts a prescription-only line. What it can discount is the rest of the cart.
    const eligibleTotal = couponEligibleTotal(ctx);
    if (!(eligibleTotal > 0)) return { valid: false, discount: 0, reason: 'rx_only_cart' };
    const raw: any = await this.coupons.findOne({ code: String(code).toUpperCase() } as any);
    if (!raw) return { valid: false, discount: 0, reason: 'not_found' };
    const c: any = normalizeCoupon(raw);
    if (c.active === false) return { valid: false, discount: 0, reason: 'inactive' };
    const now = new Date();
    if (c.valid_from && new Date(c.valid_from) > now) return { valid: false, discount: 0, reason: 'not_yet_valid' };
    if (c.valid_until && new Date(c.valid_until) < now) return { valid: false, discount: 0, reason: 'expired' };
    if (c.max_uses != null && (c.used_count || 0) >= c.max_uses) return { valid: false, discount: 0, reason: 'max_uses_reached' };

    // Single-use per user (default) or multiple-use (usage_limit_per_user > 1)
    const perUserLimit = Number(c.usage_limit_per_user ?? 1);
    const myUses = await this.usages.countDocuments({ code: c.code, user_id: userId } as any);
    if (myUses >= perUserLimit) return { valid: false, discount: 0, reason: 'already_used' };

    if (c.min_order != null && eligibleTotal < Number(c.min_order)) {
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
      const [legacy, current] = await Promise.all([
        this.conn.collection('orders').countDocuments({ patient_id: userId, state: { $nin: ['CANCELLED'] } } as any),
        this.conn.collection('pharmacy_orders').countDocuments({ patient_account_id: userId, status: { $nin: ['draft', 'cancelled'] } } as any),
      ]);
      const prior = legacy + current;
      if (prior > 0) return { valid: false, discount: 0, reason: 'first_order_only' };
    }

    let discount = 0;
    if (Number(c.discount_percent) > 0) discount = (eligibleTotal * Number(c.discount_percent)) / 100;
    else if (Number(c.discount_amount) > 0) discount = Number(c.discount_amount);
    if (Number(c.max_discount) > 0) discount = Math.min(discount, Number(c.max_discount));
    discount = Math.min(round2(discount), round2(eligibleTotal));
    if (!(discount > 0)) return { valid: false, discount: 0, reason: 'no_discount' };
    return { valid: true, discount, coupon: { code: c.code, discount_percent: c.discount_percent, discount_amount: c.discount_amount } };
  }

  /**
   * Apply a coupon to an order — atomic usage recording.
   * The $inc guard on used_count < max_uses prevents race-condition overuse.
   */
  async apply(userId: string, code: string, orderId: string, ctx: CouponContext) {
    const v = await this.validate(userId, code, ctx);
    if (!v.valid) throw new BadRequestException(`coupon_invalid: ${v.reason}`);
    const c: any = normalizeCoupon(await this.coupons.findOne({ code: String(code).toUpperCase() } as any) as any);

    if (c.max_uses != null) {
      const r = await this.coupons.updateOne(
        { code: c.code, used_count: { $lt: c.max_uses } } as any,
        { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } },
      );
      if (!r.matchedCount) throw new BadRequestException('coupon_invalid: max_uses_reached');
    } else {
      await this.coupons.updateOne({ code: c.code } as any, { $inc: { used_count: 1 }, $set: { updatedAt: new Date() } });
    }

    // R21: validate() counted this user's earlier uses, then many parallel orders could each pass that count. The per-user use is TAKEN with one conditional
    // atomic update on a counter (coupon_user_counts) before the usage row is written: exactly `limit` of any number of parallel applies get it.
    const perUserLimit = Number(c.usage_limit_per_user ?? 1);
    if (!(await this.takePerUserUse(c.code, userId, perUserLimit))) {
      await this.coupons.updateOne({ code: c.code } as any, { $inc: { used_count: -1 } });
      throw new BadRequestException('coupon_invalid: per_user_limit_reached');
    }
    try {
      await this.usages.insertOne({
        id: `cu_${uuid()}`, code: c.code, user_id: userId, order_id: orderId,
        discount: v.discount, createdAt: new Date(),
      } as any);
    } catch (e: any) {
      // duplicate (user, code, order) — roll both counters back
      await this.userCounts.updateOne({ code: c.code, user_id: userId } as any, { $inc: { count: -1 } });
      await this.coupons.updateOne({ code: c.code } as any, { $inc: { used_count: -1 } });
      throw new BadRequestException('coupon_invalid: already_applied');
    }
    return { discount: v.discount, code: c.code };
  }

  private userCountIndex?: Promise<void>;
  private get userCounts() { return this.conn.collection('coupon_user_counts'); }

  /**
   * Takes one of the user's `limit` uses of a coupon. The counter row is seeded once from the usages that already exist (uses from before this counter), then raised
   * with `count < limit` in the filter, so two requests can never both get the last use. Usage rows are written AFTER this call, so the seed never counts them twice.
   */
  private async takePerUserUse(code: string, userId: string, limit: number): Promise<boolean> {
    await (this.userCountIndex ??= this.userCounts.createIndex({ code: 1, user_id: 1 }, { unique: true }).then(() => undefined));
    const filter = { code, user_id: userId } as any;
    if (!(await this.userCounts.findOne(filter))) {
      const existing = await this.usages.countDocuments(filter);
      await this.userCounts.updateOne(filter, { $setOnInsert: { code, user_id: userId, count: existing } }, { upsert: true }).catch((e: any) => { if (e?.code !== 11000) throw e; });
    }
    const r = await this.userCounts.updateOne({ ...filter, count: { $lt: limit } }, { $inc: { count: 1 } });
    return r.matchedCount === 1;
  }

  /** Release a coupon usage when an unpaid order is cancelled. */
  async release(orderId: string) {
    const usage: any = await this.usages.findOne({ order_id: orderId } as any);
    if (!usage) return;
    await this.usages.deleteOne({ order_id: orderId } as any);
    await this.userCounts.updateOne({ code: usage.code, user_id: usage.user_id, count: { $gt: 0 } } as any, { $inc: { count: -1 } });
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
      max_redeem_percent: Number(v.max_redeem_percent ?? DEFAULTS.loyalty_max_redeem_percent),
      point_value_sar: Number(v.point_value_sar ?? DEFAULTS.loyalty_point_value_sar),
    };
  }

  /** How many points may be applied to this order, and their SAR value. */
  async quote(userId: string, orderTotal: number, rxTotal = 0) {
    const cfg = await this.config();
    // 16.12 / D-10: points are redeemed against the part of the cart that is not prescription-only
    orderTotal = couponEligibleTotal({ order_total: orderTotal, rx_total: rxTotal });
    const acc: any = await this.conn.collection('loyalty_accounts').findOne({ user_id: userId } as any);
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

  /**
   * Redeem points against an order. HARD CAP: never more than
   * max_redeem_percent of the order total (EPIC S12 — no full-order points
   * purchases). Atomic balance guard prevents negative balances.
   */
  async redeem(userId: string, orderId: string, points: number, orderTotal: number, rxTotal = 0) {
    const cfg = await this.config();
    if (!cfg.enabled) throw new BadRequestException('loyalty_redemption_disabled');
    const pts = Math.floor(Number(points));
    if (!(pts > 0)) throw new BadRequestException('points_must_be_positive');

    const q = await this.quote(userId, orderTotal, rxTotal);
    if (pts > q.max_points_for_order) {
      throw new BadRequestException(`points_exceed_cap: max ${q.max_points_for_order} (${cfg.max_redeem_percent}% of order)`);
    }

    // Atomic debit with balance guard — race-safe
    const balField = (await this.conn.collection('loyalty_accounts').findOne({ user_id: userId } as any))?.points != null ? 'points' : 'balance';
    const r = await this.conn.collection('loyalty_accounts').updateOne(
      { user_id: userId, [balField]: { $gte: pts } } as any,
      { $inc: { [balField]: -pts }, $set: { updatedAt: new Date() } },
    );
    if (!r.matchedCount) throw new BadRequestException('insufficient_points');

    const discount = round2(pts * cfg.point_value_sar);
    await this.conn.collection('loyalty_transactions').insertOne({
      id: `lt_${uuid()}`, user_id: userId, points_delta: -pts, points: -pts,
      kind: 'redeem', reason: 'order_redemption', order_id: orderId,
      ref_type: 'order', ref_id: orderId, discount_sar: discount, createdAt: new Date(),
    } as any);
    return { points: pts, discount_sar: discount };
  }

  /** Re-credit points when a paid order that used points is cancelled/refunded. Idempotent. */
  async refundRedemption(userId: string, orderId: string) {
    const tx: any = await this.conn.collection('loyalty_transactions').findOne({ order_id: orderId, kind: 'redeem' } as any);
    if (!tx) return null;
    const already: any = await this.conn.collection('loyalty_transactions').findOne({ order_id: orderId, kind: 'redeem_refund' } as any);
    if (already) return null;
    const pts = Math.abs(tx.points_delta ?? tx.points ?? 0);
    if (!(pts > 0)) return null;
    const acc: any = await this.conn.collection('loyalty_accounts').findOne({ user_id: userId } as any);
    const balField = acc?.points != null ? 'points' : 'balance';
    await this.conn.collection('loyalty_accounts').updateOne(
      { user_id: userId } as any,
      { $inc: { [balField]: pts }, $set: { updatedAt: new Date() } },
      { upsert: true } as any,
    );
    await this.conn.collection('loyalty_transactions').insertOne({
      id: `lt_${uuid()}`, user_id: userId, points_delta: pts, points: pts,
      kind: 'redeem_refund', reason: 'order_cancelled_recredit', order_id: orderId,
      ref_type: 'order', ref_id: orderId, createdAt: new Date(),
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
interface RefundExecuteOpts { refund_id: string; booking_kind: string; booking_id: string; patient_id: string; amount: number; reason: string; actor_id: string }
interface RefundReservation {
  refund_id: string; booking_id: string; halalas: number; takenOver?: boolean;
  /** Set on a taken-over reservation from what the crashed execution recorded: the gateway's refund id, and the payment's refunded total (SAR) it expected once this refund was applied. */
  gateway_refund_id?: string; expected_refunded_after?: number;
}
interface RefundCtx { reservation: RefundReservation | null; committed: boolean }

@Injectable()
export class RefundExecutor {
  private readonly logger = new Logger('RefundExecutor');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ledger: LedgerService,
    private readonly fraud: FraudService,
    private readonly events: EventEmitter2,
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional() private readonly durable?: DurableEventsService,
  ) {}

  /** What the gateway says was refunded on a Moyasar payment so far, in halalas; null when it cannot be read (no id, no key, a timeout, an error, an unreadable answer). */
  private async gatewayRefundedHalalas(paymentId: string | undefined): Promise<number | null> {
    if (!paymentId || String(paymentId).startsWith('sandbox_')) return null;
    try {
      const resp = await timedFetch(`${moyasarBase()}/payments/${paymentId}`, {
        method: 'GET',
        headers: { Authorization: `Basic ${Buffer.from(`${this.moyasarKey()}:`).toString('base64')}` },
      }, { label: 'finance.refund.lookup', timeoutCode: 'refund_gateway_timeout' });
      if (!resp.ok) return null;
      const data: any = await resp.json().catch(() => ({}));
      const n = Number(data?.refunded);
      return Number.isSafeInteger(n) && n >= 0 ? n : null;
    } catch { return null; }
  }

  /**
   * Double-refund guard for a TAKEN-OVER reservation (an earlier execution of this refund id crashed and left `reserved` behind).
   * The gateway call has no idempotency key, so before it is made again we must know whether the first execution already made it:
   *  - 'applied': the payment row already shows the refunded total this refund was going to produce (the crashed run got as far as updating it);
   *  - 'gateway_only': the gateway already refunded this amount on top of what we had recorded, but the local row was not updated;
   *  - 'proceed': the gateway shows nothing more than we recorded, so the first run never reached it and the call is made now.
   * If the gateway cannot be asked, the answer is not guessed: the takeover is refused (409) and an operator retries after checking the payment.
   * An execution that is not a takeover is always 'proceed' and costs nothing extra.
   */
  private async takeoverState(ctx: RefundCtx, gatewayPaymentId: string | undefined, localRefundedSar: number, amountSar: number): Promise<'proceed' | 'applied' | 'gateway_only'> {
    const r = ctx.reservation;
    if (!r?.takenOver) return 'proceed';
    if (typeof r.expected_refunded_after === 'number' && localRefundedSar >= r.expected_refunded_after - 0.001) return 'applied';
    const gateway = await this.gatewayRefundedHalalas(gatewayPaymentId);
    if (gateway === null) {
      this.logger.error(`refund ${r.refund_id}: takeover refused, the gateway refund status of ${gatewayPaymentId || 'the payment'} cannot be read`);
      throw new ConflictException('refund_gateway_status_unknown: check the payment at the gateway before retrying');
    }
    return gateway >= toHalalas(localRefundedSar) + toHalalas(amountSar) ? 'gateway_only' : 'proceed';
  }

  /** Written BEFORE the gateway call: the payment's refunded total once this refund is applied (what a takeover compares with). Refuses to go on if it cannot be written. */
  private async recordExpectedAfter(ctx: RefundCtx, expected: number): Promise<void> {
    if (!ctx.reservation) return;
    await this.reservations.updateOne({ refund_id: ctx.reservation.refund_id } as any, { $set: { expected_refunded_after: expected } });
  }

  /** Written as soon as the gateway returned its refund id, for audit and for a takeover. The money has moved: a failure here is logged, never thrown. */
  private async recordGatewayRefundId(ctx: RefundCtx, gatewayRefundId: string | undefined): Promise<void> {
    if (!ctx.reservation || !gatewayRefundId) return;
    await this.reservations.updateOne({ refund_id: ctx.reservation.refund_id } as any, { $set: { gateway_refund_id: gatewayRefundId } })
      .catch((e: any) => this.logger.error(`refund ${ctx.reservation?.refund_id}: gateway refund id ${gatewayRefundId} not recorded on the reservation: ${e?.message}`));
  }

  private moyasarKey(): string {
    const k = process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || process.env.MOYASAR_API_KEY || '';
    if (!k) throw new BadRequestException('payment_gateway_not_configured');
    return k;
  }

  /**
   * Execute an approved refund end-to-end. Idempotent per refund_id.
   * 7A-A2: refunds go to the original payment method only — card payments via
   * Moyasar (full or partial); cash is a ledger record with no wallet credit.
   * There is no patient-wallet branch anymore.
   *  1. Refund via Moyasar when a gateway payment exists (full or partial).
   *  2. Otherwise the booking must be cash-collected: record a cash ledger row.
   *  3. Append ledger entries (refund + commission reversal).
   *  4. Provider debit: if the provider was already credited, claw the net
   *     back as provider_debit — the balance goes NEGATIVE and is deducted
   *     from the next settlement. The platform never loses money (S9).
   *  5. Update booking payment_status + notify the patient.
   */
  async execute(opts: RefundExecuteOpts): Promise<{ ok: boolean; method: string; gateway_refund_id?: string; provider_debited?: number }> {
    // R21: the reservation (see reserveRefund) is taken inside the core once the paid total is known, and given back here if anything fails before the ledger row exists.
    const ctx: RefundCtx = { reservation: null, committed: false };
    try {
      return await this.executeCore(opts, ctx);
    } catch (e) {
      if (ctx.reservation && !ctx.committed) await this.releaseRefund(ctx.reservation).catch(() => undefined);
      throw e;
    }
  }

  private refundIndexes?: Promise<void>;
  private static readonly RESERVATION_STALE_MS = 10 * 60_000;
  private get reservations() { return this.conn.collection('refund_reservations'); }
  private get refundTotals() { return this.conn.collection('refund_totals'); }

  /**
   * R21: two refunds of one booking at the same time (different refund ids), or the same refund id twice (a double click on "execute"), both passed the
   * read-then-write checks and could refund twice. Now: (1) a unique row per refund id (`refund_reservations`): the second execution of the same id
   * gets a conflict while the first runs, and a no-op once it is done; (2) a per-booking running total in integer halalas (`refund_totals`) raised with a
   * conditional atomic update, so the sum of reservations can never pass what was paid.
   */
  private async reserveRefund(refundId: string, bookingId: string, amount: number, paidTotal: number, alreadyRefunded: number): Promise<RefundReservation | 'done'> {
    await (this.refundIndexes ??= Promise.all([
      this.reservations.createIndex({ refund_id: 1 }, { unique: true }),
      this.refundTotals.createIndex({ booking_id: 1 }, { unique: true }),
    ]).then(() => undefined));
    const reservation: RefundReservation = { refund_id: refundId, booking_id: bookingId, halalas: toHalalas(amount) };
    try {
      await this.reservations.insertOne({ ...reservation, state: 'reserved', createdAt: new Date() } as any);
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
      const row: any = await this.reservations.findOne({ refund_id: refundId } as any);
      if (row?.state === 'done') return 'done';
      // a crashed execution leaves 'reserved' behind: after 10 minutes another one may take it over (its amount is already counted in the total)
      const took = await this.reservations.findOneAndUpdate({ refund_id: refundId, state: 'reserved', createdAt: { $lt: new Date(Date.now() - RefundExecutor.RESERVATION_STALE_MS) } } as any, { $set: { createdAt: new Date() } });
      if (!took) throw new ConflictException('refund_in_progress');
      return { ...reservation, takenOver: true, gateway_refund_id: row?.gateway_refund_id, expected_refunded_after: row?.expected_refunded_after };
    }
    await this.refundTotals.updateOne({ booking_id: bookingId } as any, { $setOnInsert: { booking_id: bookingId, refunded_halalas: toHalalas(alreadyRefunded), createdAt: new Date() } }, { upsert: true }).catch((e: any) => { if (e?.code !== 11000) throw e; });
    const room = toHalalas(paidTotal) - reservation.halalas;
    const raised = await this.refundTotals.updateOne({ booking_id: bookingId, refunded_halalas: { $lte: room } } as any, { $inc: { refunded_halalas: reservation.halalas } });
    if (!raised.matchedCount) {
      await this.reservations.deleteOne({ refund_id: refundId, state: 'reserved' } as any);
      throw new BadRequestException(`refund_exceeds_paid: paid ${paidTotal}, already refunded or being refunded`);
    }
    return reservation;
  }

  private async releaseRefund(r: RefundReservation) {
    if (r.takenOver) return;     // the first execution's amount stays counted; only a clean failure of the owner gives it back
    await this.refundTotals.updateOne({ booking_id: r.booking_id } as any, { $inc: { refunded_halalas: -r.halalas } });
    await this.reservations.deleteOne({ refund_id: r.refund_id, state: 'reserved' } as any);
  }

  private async executeCore(opts: RefundExecuteOpts, ctx: RefundCtx): Promise<{ ok: boolean; method: string; gateway_refund_id?: string; provider_debited?: number }> {
    let amount = round2(opts.amount);
    if (!(amount > 0)) throw new BadRequestException('refund amount must be positive');

    // Idempotency: a completed execution for this refund_id is a no-op
    const prior = await this.ledger.exists('refund', 'refund', opts.refund_id);
    if (prior) return { ok: true, method: 'already_executed' };

    // Total refunded so far for this booking must never exceed what was paid
    const paidPayment: any = await this.conn.collection('moyasar_payments').findOne(
      { booking_id: opts.booking_id, status: { $in: ['paid', 'refunded'] } } as any,
      { sort: { createdAt: -1 } } as any,
    );
    let paidTransaction: any = await this.conn.collection('transactions').findOne({
      booking_kind: opts.booking_kind, booking_id: opts.booking_id, status: 'paid',
    } as any);
    const bookingCollections: Record<string, string> = {
      pharmacy: 'orders', order: 'orders', consultation: 'appointments', appointment: 'appointments',
      lab: 'labbookings', radiology: 'radiologybookings', nursing: 'homecarebookings',
    };
    const bookingCollection = bookingCollections[opts.booking_kind];
    let booking: any = bookingCollection
      ? await this.conn.collection(bookingCollection).findOne({ id: opts.booking_id } as any)
      : null;
    // Pharmacy orders live in pharmacy_orders (governed broadcast flow); the
    // legacy `orders` collection is only the fallback.
    if (!booking && ['pharmacy', 'order'].includes(String(opts.booking_kind))) {
      booking = await this.conn.collection('pharmacy_orders').findOne({ id: opts.booking_id } as any);
    }
    if (booking) {
      const owner = String(booking.patient_id || booking.patient_account_id || booking.user_id || '');
      if (owner && owner !== String(opts.patient_id)) throw new ForbiddenException('refund_patient_mismatch');
    }
    // Q96: an insured booking's copay is paid on its insurance request (booking_kind
    // 'insurance'), never on the booking: refund that card payment, capped at it.
    let viaCopay = false;
    if (!paidTransaction && !paidPayment && booking) {
      paidTransaction = await findCopayTransaction(this.conn as never, booking, opts.booking_id);
      viaCopay = !!paidTransaction;
    }
    // The patient paid only the copay: a refund of the booking's price returns at most what is left of it.
    if (viaCopay) amount = Math.min(amount, round2(copayRefundable(paidTransaction)));
    if (!(amount > 0)) throw new BadRequestException('refund_exceeds_paid: nothing left to refund');
    const originalMethod = String(paidTransaction?.method || booking?.payment_method || '').toLowerCase();
    const bookingState = String(booking?.status || '').toLowerCase();
    const cashLike = originalMethod === 'cash' || originalMethod === 'cod' || originalMethod === 'cash_on_delivery';
    const cashCollected = cashLike && (
      paidTransaction?.status === 'paid' || String(booking?.payment_status || '').toLowerCase() === 'paid'
      || Number(booking?.collection_proof?.amount_collected || 0) > 0
      // COD collected at the door: a delivered/completed order means the courier took the money.
      || (originalMethod !== 'cash' && ['delivered', 'completed'].includes(bookingState))
    );
    // A paid transactions row is payment evidence too (card payments live there;
    // moyasar_payments only exists for the legacy gateway flow).
    const cardPaidTx = paidTransaction?.status === 'paid';
    if (!paidPayment && !cashCollected && !cardPaidTx) throw new BadRequestException('original_payment_not_found');
    if (paidPayment && (!paidPayment.moyasar_id || String(paidPayment.moyasar_id).startsWith('sandbox_'))) {
      throw new BadRequestException('original_card_refund_unavailable');
    }
    // Cash-like orders may carry no payment total (e.g. governed pharmacy_orders
    // with total_price 0) — fall back to the priced items the refund was computed from.
    const itemsTotal = Array.isArray(booking?.items)
      ? booking.items.reduce((sum: number, it: any) => sum + Number(it?.price || 0) * Number(it?.qty ?? it?.quantity ?? 1), 0)
      : 0;
    let paidTotal = paidPayment
      ? Number(paidPayment.amount || 0)
      : Number(paidTransaction?.amount || booking?.total_price || booking?.total || booking?.price || booking?.collection_proof?.amount_collected || itemsTotal || 0);
    if (!(paidTotal > 0)) {
      // Cash-like with no recorded totals (e.g. governed pharmacy_orders carry no
      // prices): cap by the originating return request's server-computed items.
      try {
        const returnId = String(opts.refund_id || '').replace(/^return_/, '');
        const ret: any = returnId ? await this.conn.collection('returnrequests').findOne({ id: returnId } as any) : null;
        const retTotal = Array.isArray(ret?.items)
          ? ret.items.reduce((sum: number, it: any) => sum + Number(it?.price || 0) * Number(it?.qty ?? it?.quantity ?? 1), 0)
          : 0;
        if (retTotal > 0) paidTotal = retTotal;
      } catch { /* cap stays 0 → the guard below refuses */ }
    }
    // What was refunded BEFORE this refund (SAR); used for the cap and for the booking's status below.
    let alreadyRefunded = Number(paidPayment?.refunded_amount || paidTransaction?.refunded_amount || booking?.refunded_amount || 0);
    if (paidTotal != null) {
      // A takeover of a run that died after it updated the payment row: that row already contains THIS refund, so counting it again would make a
      // full refund fail the cap on every retry (refund_exceeds_paid), and the ledger row, the provider clawback and the booking status would never be written.
      try {
        const prior: any = await this.reservations.findOne({ refund_id: opts.refund_id } as any);
        if (prior?.state === 'reserved' && typeof prior.expected_refunded_after === 'number' && alreadyRefunded >= prior.expected_refunded_after - 0.001) {
          alreadyRefunded = round2(alreadyRefunded - amount);
        }
      } catch { /* no reservation row to read: a normal first execution */ }
      if (alreadyRefunded + amount > paidTotal + 0.001) {
        throw new BadRequestException(`refund_exceeds_paid: paid ${paidTotal}, already refunded ${alreadyRefunded}`);
      }
      if (paidTotal > 0) {
        const got = await this.reserveRefund(opts.refund_id, opts.booking_id, amount, Number(paidTotal), alreadyRefunded);
        if (got === 'done') return { ok: true, method: 'already_executed' };
        ctx.reservation = got;
      }
    }

    let method = 'cash';
    let gatewayRefundId: string | undefined;

    // 1) Gateway refund (real money back to the card)
    if (paidPayment && paidPayment.moyasar_id && !String(paidPayment.moyasar_id).startsWith('sandbox_')) {
      const newRefunded = round2(Number(paidPayment.refunded_amount || 0) + amount);
      // a taken-over reservation first finds out whether the crashed run already refunded at the gateway (see takeoverState)
      const state = await this.takeoverState(ctx, paidPayment.moyasar_id, Number(paidPayment.refunded_amount || 0), amount);
      if (state === 'applied') {
        method = 'gateway';
        gatewayRefundId = ctx.reservation?.gateway_refund_id;
      } else {
        if (state === 'proceed') {
          await this.recordExpectedAfter(ctx, newRefunded);
          const key = this.moyasarKey();
          // Sent once (no idempotency key). On a timeout the refund is NOT recorded here: the gateway may or may not have done it. A retry of this
          // refund id after the reservation goes stale first asks the gateway what it has refunded (takeoverState) instead of sending it again.
          const resp = await timedFetch(`${moyasarBase()}/payments/${paidPayment.moyasar_id}/refund`, {
            method: 'POST',
            headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: toHalalas(amount), reason: opts.reason?.slice(0, 255) || 'refund' }),
          }, { label: 'finance.refund', timeoutCode: 'refund_gateway_timeout' });
          const data: any = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            this.logger.error(`Moyasar refund failed for ${paidPayment.moyasar_id}: ${data?.message || resp.status}`);
            throw new BadRequestException(`gateway_refund_failed: ${data?.message || resp.status}`);
          }
          gatewayRefundId = data?.id;
          await this.recordGatewayRefundId(ctx, gatewayRefundId);
        } else {
          this.logger.warn(`refund ${opts.refund_id}: the gateway already refunded ${amount} on ${paidPayment.moyasar_id}; not sent again, the local payment row is brought up to date`);
          gatewayRefundId = ctx.reservation?.gateway_refund_id ?? 'recovered_from_gateway';
        }
        method = 'gateway';
        await this.conn.collection('moyasar_payments').updateOne(
          { _id: paidPayment._id } as any,
          { $set: { refunded_amount: newRefunded, ...shadowFields({ refunded_amount: newRefunded }, ['refunded_amount']), status: newRefunded >= Number(paidPayment.amount || 0) - 0.001 ? 'refunded' : 'paid', refunded_at: new Date() } },
        );
      }
    }
    // 1b) A card payment kept in `transactions` (the current checkout, copays included) goes back
    // to the card through the gateway; before this it only got a ledger row.
    else if (cardPaidTx && !cashLike) {
      // Loaded here, not at the top: payments.module imports this file, so a static import is a cycle
      // that leaves PaymentsService's own dependencies undefined at boot.
      const { PaymentsService } = await import('../payments/payments.module');
      const payments: any = this.moduleRef?.get(PaymentsService, { strict: false });
      if (!payments) throw new BadRequestException('payment_gateway_not_configured');
      const txGatewayId = paidTransaction.gateway === 'moyasar' ? (paidTransaction.gateway_charge_id || paidTransaction.gateway_intent_id) : undefined;
      const state = await this.takeoverState(ctx, txGatewayId, Number(paidTransaction.refunded_amount || 0), amount);
      if (state === 'applied') {
        method = 'gateway';
        gatewayRefundId = ctx.reservation?.gateway_refund_id;
      } else {
        if (state === 'proceed') await this.recordExpectedAfter(ctx, round2(Number(paidTransaction.refunded_amount || 0) + amount));
        // 'gateway_only': the gateway already refunded it, so only the local transaction is brought up to date (no second gateway call)
        const r = state === 'gateway_only'
          ? await payments.refundTransactionAsSystem(String(paidTransaction.id), amount, opts.reason, { skipGateway: true })
          : await payments.refundTransactionAsSystem(String(paidTransaction.id), amount, opts.reason);
        method = 'gateway';
        gatewayRefundId = r?.gateway_refund_id ?? (state === 'gateway_only' ? (ctx.reservation?.gateway_refund_id ?? 'recovered_from_gateway') : undefined);
        await this.recordGatewayRefundId(ctx, r?.gateway_refund_id);
      }
    }
    // 2) Cash: the money never entered the platform — record the refund in the
    // ledger only. No patient wallet is created, credited, or read here.

    // 3) Ledger: refund record (+ commission reversal note for reports)
    await this.ledger.append({
      type: 'refund', amount,
      provider_account_id: null,
      ref_type: 'refund', ref_id: opts.refund_id, order_id: opts.booking_id,
      description: `Patient refund (${method}) — ${opts.reason || ''}`.trim(),
      actor_id: opts.actor_id,
      meta: { booking_kind: opts.booking_kind, patient_id: opts.patient_id, method, gateway_refund_id: gatewayRefundId },
    });
    // the refund is now in the ledger: the reservation is spent, not to be given back whatever fails below
    ctx.committed = true;
    if (ctx.reservation) await this.reservations.updateOne({ refund_id: opts.refund_id } as any, { $set: { state: 'done', done_at: new Date() } }).catch(() => undefined);

    // 4) Provider debit — claw back the credited net earning (S9)
    let providerDebited = 0;
    const earning: any = await this.conn.collection('platformledgerentries').findOne({
      type: 'provider_earning',
      $or: [{ ref_id: opts.booking_id }, { order_id: opts.booking_id }],
    } as any);
    if (earning && Number(earning.amount) > 0) {
      // The share of what the PATIENT PAID that is refunded. The earning's gross is only the provider's own lines (the platform's service, home-visit and
      // transport fees are not in it), so dividing by it clawed back all of the provider's net when only half of the payment was refunded.
      const shares = clawbackShares(earning, amount, Number(paidTotal) || 0);
      const fraction = shares.fraction;
      providerDebited = shares.provider;
      // The platform's commission and the VAT on it were earned on the part of the price that is now refunded: they are reversed in the same
      // proportion (provider net share + commission share + VAT share = the refund). They are platform rows (no provider), so a provider's
      // balance does not move twice; the finance report subtracts them (ReportsService.summary).
      for (const [type, share] of [['commission_reversal', shares.commission], ['vat_reversal', shares.vat]] as const) {
        if (share > 0 && !(await this.ledger.exists(type, 'refund', opts.refund_id))) {
          await this.ledger.append({
            type, amount: share, provider_account_id: null, ref_type: 'refund', ref_id: opts.refund_id, order_id: opts.booking_id,
            description: `${type === 'commission_reversal' ? 'Commission' : 'VAT on the commission'} reversed with refund ${opts.refund_id} on earning ${earning.id}`,
            actor_id: opts.actor_id, meta: { provider_account_id: earning.provider_account_id, earning_id: earning.id, fraction },
          });
        }
      }
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
      // The booking is fully refunded when everything refunded so far (earlier refunds plus this one) reaches what was paid: a second partial refund
      // that completes the payment used to leave it 'partially_refunded' because only this refund's amount was compared with the total.
      const newStatus = paidTotal != null && round2(alreadyRefunded + amount) < paidTotal - 0.001 ? 'partially_refunded' : 'refunded';
      const set = { $set: { payment_status: newStatus, refund_status: 'REFUNDED', updatedAt: new Date() } };
      const res: any = await this.conn.collection(coll).updateOne({ id: opts.booking_id } as any, set);
      // Current pharmacy orders live in pharmacy_orders; `orders` is the legacy cart checkout.
      if (coll === 'orders' && !res?.matchedCount) await this.conn.collection('pharmacy_orders').updateOne({ id: opts.booking_id } as any, set);
    }
    await this.conn.collection('notifications').insertOne({
      id: uuid(), user_id: opts.patient_id,
      title_key: 'تم استرداد المبلغ', body_key: `تم إرجاع ${amount} ر.س ${method === 'gateway' ? 'إلى بطاقتك البنكية' : 'تم تسجيله نقدًا'} — ${opts.reason || ''}`.trim(),
      params: {}, type: 'payment', priority: 'high', read_by: [],
      status: 'DELIVERED', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    // R2: recorded durably under the refund id (the same id the refund listeners and the ledger use), so a replay of execute() never announces twice.
    await emitDurable(this.durable, this.events, 'payment.refund', {
      actor_id: opts.actor_id, transaction_id: gatewayRefundId || opts.refund_id,
      booking_id: opts.booking_id, booking_kind: opts.booking_kind,
      patient_id: opts.patient_id, amount, method,
    }, `payment.refund:${opts.refund_id}`);

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
// AppointmentRefundListener — consumes appointment.refund.calculated (P0-07).
// Executes the policy-computed refund via RefundExecutor (idempotent per
// refund_id: gateway when a card payment exists, else patient wallet credit,
// plus ledger + provider clawback), and records the 50 SAR doctor penalty as
// a provider_debit when the doctor cancelled. Never throws: a failed consumer
// must not break the cancellation that already persisted.
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class AppointmentRefundListener {
  private readonly logger = new Logger('AppointmentRefundListener');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly refundExec: RefundExecutor,
    private readonly ledger: LedgerService,
  ) {}

  @OnEvent('appointment.refund.calculated')
  async onRefundCalculated(e: any) {
    try {
      const pct = Number(e?.refund_percentage || 0);
      // The percentage applies to what the patient actually paid, never above it (RefundExecutor caps at the paid amount).
      const paidTxn: any = e?.appointment_id
        ? await this.conn.collection('transactions').findOne({ booking_kind: 'consultation', booking_id: e.appointment_id, status: 'paid' } as any)
        : null;
      const paid = Number(paidTxn?.amount);
      const total = Number.isFinite(paid) && paid > 0 ? paid : Number(e?.total_price || 0);
      const amount = Math.round(total * (pct / 100) * 100) / 100;
      if (amount > 0 && e?.appointment_id && e?.patient_id) {
        await this.refundExec.execute({
          refund_id: `appt-refund-${e.appointment_id}`,
          booking_kind: 'consultation',
          booking_id: e.appointment_id,
          patient_id: e.patient_id,
          amount,
          reason: `appointment_cancel_policy_${pct}pct`,
          actor_id: 'system',
        });
      } else {
        this.logger.log(`refund skipped (0% policy): appointment ${e?.appointment_id}`);
      }
      const penalty = Number(e?.penalty_amount || 0);
      if (penalty > 0 && e?.doctor_id) {
        const pref = `appt-penalty-${e.appointment_id}`;
        const dup = await this.ledger.exists('provider_debit', 'refund', pref).catch(() => false);
        if (!dup) {
          const prof: any = await this.conn.collection('provider_profiles').findOne(
            { $or: [{ id: e.doctor_id }, { account_id: e.doctor_id }] },
            { projection: { _id: 0, user_id: 1, account_id: 1 } },
          ).catch(() => null);
          const accountId = prof?.account_id || prof?.user_id;
          if (accountId) {
            await this.ledger.append({
              type: 'provider_debit', amount: penalty,
              provider_account_id: accountId,
              ref_type: 'refund', ref_id: pref, order_id: e.appointment_id,
              description: `Doctor cancellation penalty (${pct}% policy)`,
              actor_id: 'system',
            });
          } else {
            this.logger.warn(`penalty skipped (no provider account): appointment ${e?.appointment_id}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`appointment refund consumer failed: ${err?.message} (appointment ${e?.appointment_id})`);
      // A failed refund must reach operations, not only the log: the dead-letter queue is what the admin reliability screen lists.
      await this.conn.collection('event_dlq').insertOne({
        original_event_id: `appt-refund-${e?.appointment_id || ''}`,
        type: 'appointment.refund.calculated',
        entity_type: 'appointment',
        entity_id: e?.appointment_id,
        payload: e,
        attempts: 0,
        last_error: String(err?.message || err).slice(0, 500),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any).catch((dlqErr: any) => this.logger.error(`appointment refund failure not queued: ${dlqErr?.message}`));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NursingRefundListener — consumes homecare.booking_cancelled (D-26).
// Patient cancels before the nurse is on the way: 100%. Once IN_TRANSIT:
// 100% minus the admin trip fee. Never throws: a failed consumer must not
// break the cancellation that already persisted.
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class NursingRefundListener {
  private readonly logger = new Logger('NursingRefundListener');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly refundExec: RefundExecutor,
  ) {}

  @OnEvent('homecare.booking_cancelled')
  async onNursingCancelled(e: any) {
    try {
      const bookingId = String(e?.booking_id || '');
      const patientId = String(e?.patient_id || '');
      if (!bookingId || !patientId) return;
      const policyDoc: any = await this.conn.collection('system_configs').findOne({ key: 'refund_policy' }).catch(() => null);
      const tripFee = Number(policyDoc?.value?.home_visit?.trip_fee_sar ?? 40);
      const total = Math.round(Number(e?.total || 0) * 100) / 100;
      if (!(total > 0)) return;
      const afterTransit = String(e?.prior_state || '').toUpperCase() === 'IN_TRANSIT';
      const amount = afterTransit ? Math.max(0, Math.round((total - tripFee) * 100) / 100) : total;
      if (!(amount > 0)) return;
      await this.refundExec.execute({
        refund_id: `nursing-cancel-${bookingId}`,
        booking_kind: 'nursing',
        booking_id: bookingId,
        patient_id: patientId,
        amount,
        reason: afterTransit ? 'nursing_cancel_after_transit' : 'nursing_cancel_before_transit',
        actor_id: 'system',
      });
    } catch (err: any) {
      this.logger.error(`nursing refund consumer failed: ${err?.message} (booking ${e?.booking_id})`);
    }
  }
}

// ════════════════════════════════════════════════════════════
// NursingNoShowRefundListener — consumes homecare.booking_no_show (screens-audit-3 gap 24).
// The nurse marked the visit "patient absent" after the 10-minute wait. The admin policy
// `home_visit.patient_absent_percent` (default 0: nothing is refunded, as before) is the share of what the patient paid that comes back.
// Never throws.
// ════════════════════════════════════════════════════════════
@Injectable()
export class NursingNoShowRefundListener {
  private readonly logger = new Logger('NursingNoShowRefundListener');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly refundExec: RefundExecutor,
  ) {}

  @OnEvent('homecare.booking_no_show')
  async onNoShow(e: any) {
    try {
      const bookingId = String(e?.booking_id || '');
      const patientId = String(e?.patient_id || '');
      if (!bookingId || !patientId) return;
      const policyDoc: any = await this.conn.collection('system_configs').findOne({ key: 'refund_policy' }).catch(() => null);
      const percent = patientAbsentPercent(policyDoc?.value);
      if (!(percent > 0)) return;
      const amount = patientAbsentRefund(Number(e?.total || 0), percent);
      if (!(amount > 0)) return;
      await this.refundExec.execute({
        refund_id: `nursing-noshow-${bookingId}`,
        booking_kind: 'nursing',
        booking_id: bookingId,
        patient_id: patientId,
        amount,
        reason: 'nursing_patient_absent',
        actor_id: 'system',
      });
    } catch (err: any) {
      this.logger.error(`nursing no-show refund consumer failed: ${err?.message} (booking ${e?.booking_id})`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PharmacyRefundListener — consumes pharmacy.order.cancelled (D-26).
// Cancel before dispatch: 100% including the delivery fee. Once the order is
// out for delivery: 100% minus the delivery fee. Never throws.
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class PharmacyRefundListener {
  private readonly logger = new Logger('PharmacyRefundListener');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly refundExec: RefundExecutor,
  ) {}

  @OnEvent('pharmacy.order.cancelled')
  async onPharmacyOrderCancelled(e: any) {
    try {
      const orderId = String(e?.entity_id || e?.order_id || '');
      const patientId = String(e?.patient_account_id || '');
      if (!orderId || !patientId) return;
      const total = Math.round(Number(e?.meta?.total || 0) * 100) / 100;
      if (!(total > 0)) return;
      const dispatched = String(e?.meta?.prior_status || '').toLowerCase() === 'out_for_delivery';
      const fee = Math.round(Number(e?.meta?.delivery_fee || 0) * 100) / 100;
      // screens-audit-3 gap 24: `pharmacy.refund_delivery_fee_before_dispatch` is read (default yes: 100 % before dispatch, the fee kept after)
      const policyDoc: any = await this.conn.collection('system_configs').findOne({ key: 'refund_policy' }).catch(() => null);
      const amount = pharmacyCancelRefund(total, fee, dispatched, refundsDeliveryFeeBeforeDispatch(policyDoc?.value));
      if (!(amount > 0)) return;
      await this.refundExec.execute({
        refund_id: `pharmacy-cancel-${orderId}`,
        booking_kind: 'pharmacy',
        booking_id: orderId,
        patient_id: patientId,
        amount,
        reason: dispatched ? 'pharmacy_cancel_after_dispatch' : 'pharmacy_cancel_before_dispatch',
        actor_id: 'system',
      });
    } catch (err: any) {
      this.logger.error(`pharmacy refund consumer failed: ${err?.message} (order ${e?.entity_id || e?.order_id})`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════
// ProviderCancelRefundListener — a provider or admin cancels a paid booking (refund policy 3.0: "the provider cancels or does not attend:
// 100%", for nursing, lab, radiology and pharmacy).
// The kind listeners above answer the PATIENT's own cancel (and the lab's / the pharmacy's own routes). The generic provider action
// (POST /provider/jobs/:type/:id/reject) and the admin cancel move the booking to CANCELLED through the workflow engine and emit only
// `service.cancelled`, which nothing refunded: a paid booking the nurse rejected stayed paid. This listens to that universal event for a
// non-patient actor and refunds what was paid in full, under the SAME refund id as the kind listener (so one cancel is never refunded
// twice, whichever path announced it first). Never throws; a failure goes to the dead-letter queue.
// ═════════════════════════════════════════════════════════════════════
@Injectable()
export class ProviderCancelRefundListener {
  private readonly logger = new Logger('ProviderCancelRefundListener');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly refundExec: RefundExecutor,
  ) {}

  private static readonly KINDS: Record<string, { kind: 'nursing' | 'lab' | 'radiology' | 'pharmacy'; id: (b: string) => string }> = {
    nursing_booking: { kind: 'nursing', id: (b) => `nursing-cancel-${b}` },
    lab_booking: { kind: 'lab', id: (b) => `lab-cancel-${b}` },
    radiology_booking: { kind: 'radiology', id: (b) => `radiology-cancel-${b}` },
    order: { kind: 'pharmacy', id: (b) => `pharmacy-cancel-${b}` },
  };

  @OnEvent('service.cancelled')
  async onServiceCancelled(e: any) {
    const spec = ProviderCancelRefundListener.KINDS[String(e?.entity_type || '')];
    const role = String(e?.actor_role || '').toLowerCase();
    if (!spec || !e?.entity_id || !e?.patient_account_id || !role || role === 'patient') return;
    const bookingId = String(e.entity_id);
    try {
      const paid: any = await this.conn.collection('transactions').findOne({ booking_kind: spec.kind, booking_id: bookingId, status: 'paid' } as any);
      if (!paid) return; // cash, insurance or never paid by card: nothing to send back
      const left = Math.max(0, Math.round((Number(paid.amount || 0) - Number(paid.refunded_amount || 0)) * 100) / 100);
      if (!(left > 0)) return;
      await this.refundExec.execute({
        refund_id: spec.id(bookingId), booking_kind: spec.kind, booking_id: bookingId, patient_id: String(e.patient_account_id),
        amount: left, reason: `${spec.kind}_cancel_by_${role}`, actor_id: 'system',
      });
    } catch (err: any) {
      this.logger.error(`${spec.kind} provider-cancel refund failed: ${err?.message} (booking ${bookingId})`);
      await this.conn.collection('event_dlq').insertOne({
        original_event_id: spec.id(bookingId), type: 'service.cancelled', entity_type: String(e.entity_type), entity_id: bookingId,
        payload: e, attempts: 0, last_error: String(err?.message || err).slice(0, 500), status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      } as any).catch((dlqErr: any) => this.logger.error(`provider-cancel refund failure not queued: ${dlqErr?.message}`));
    }
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
    // the day and the month of the report are Riyadh's (the server clock is UTC)
    else if (period === 'monthly') from = riyadhMonthStart(now);
    else from = riyadhDayRange(undefined, now)!.start;
    const to = toQ ? new Date(toQ) : now;
    const dateQ = { createdAt: { $gte: from, $lte: to } };

    // R11 P2: the groups add whole halalas (the `*_halalas` shadow, the double only for a row that has none); see report-totals.ts
    const [payments, ledgerRows, refunds, cancelledOrders] = await Promise.all([
      this.conn.collection('moyasar_payments').aggregate([
        { $match: dateQ },
        { $group: { _id: '$status', total: halalasSum('amount'), count: { $sum: 1 } } },
      ] as any[]).toArray().catch(() => [] as any[]),
      this.conn.collection('platformledgerentries').aggregate([
        { $match: dateQ },
        { $group: { _id: { type: '$type', state: '$state' }, total: halalasSum('amount'), count: { $sum: 1 } } },
      ] as any[]).toArray().catch(() => [] as any[]),
      this.conn.collection('refundrequests').aggregate([
        { $match: dateQ },
        { $group: { _id: '$state', total: halalasSum('refund_amount'), count: { $sum: 1 } } },
      ] as any[]).toArray().catch(() => [] as any[]),
      Promise.all([
        this.conn.collection('orders').countDocuments({ ...dateQ, state: 'CANCELLED' } as any),
        this.conn.collection('pharmacy_orders').countDocuments({ ...dateQ, status: 'cancelled' } as any),
      ]).then(([a, b]) => a + b).catch(() => 0),
    ]);

    // commission & vat come from earning rows' embedded fields
    const ev: any[] = await this.conn.collection('platformledgerentries').aggregate([
      { $match: { ...dateQ, type: 'provider_earning' } },
      { $group: { _id: null, commission: halalasSum('commission'), vat: halalasSum('vat'), gross: halalasSum('gross'), net: halalasSum('amount') } },
    ] as any[]).toArray().catch(() => [] as any[]);

    return {
      period, from, to,
      ...reportFigures(payments as any[], ledgerRows as any[], refunds as any[], ev[0] || {}),
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
@SelfService()
@UseGuards(JwtAuthGuard)
export class FinanceEngineController {
  constructor(
    private readonly coupons: CouponService,
    private readonly loyalty: LoyaltyRedeemService,
    private readonly ledger: LedgerService,
  ) {}

  /** Validate a coupon against a cart (patient checkout). */
  @Post('coupons/validate')
  async validateCoupon(@CurrentUser() u: any, @Body() b: ValidateCouponDto) {
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
  async loyaltyQuote(@CurrentUser() u: any, @Body() b: LoyaltyQuoteDto) {
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
  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Post('commission-rules')
  setCommissionRule(@CurrentUser() u: any, @Body() b: SetCommissionRuleDto) {
    return this.commissions.setRule(u.id, { ...b });
  }

  @Get('commission-rules/history')
  commissionHistory(): Promise<any[]> {
    return this.commissions.history();
  }

  @RequirePermissions(Permission.FINANCE_READ)
  @Post('commission-rules/resolve')
  resolveCommission(@Body() b: ResolveCommissionDto) {
    return this.commissions.resolve(String(b?.service_type || ''), {
      providerId: b?.provider_id, category: b?.category, campaignId: b?.campaign_id,
    });
  }

  /** Maker-checker queue (S14). */
  @Get('approvals')
  pendingApprovals(): Promise<any[]> {
    return this.approvals.listPending();
  }

  @RequirePermissions(Permission.FINANCE_PAYOUT_APPROVE)
  @Post('approvals/request')
  requestApproval(@CurrentUser() u: any, @Body() b: RequestApprovalDto) {
    return this.approvals.request(b?.type, b?.payload || {}, u.id, b?.reason);
  }

  @RequirePermissions(Permission.FINANCE_PAYOUT_APPROVE)
  @Post('approvals/:id/decide')
  async decideApproval(@CurrentUser() u: any, @Param('id') id: string, @Body() b: DecideApprovalDto) {
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
  @RequirePermissions(Permission.ORDER_REFUND)
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
// LabRadiologyRefundListener — consumes lab.booking_cancelled and radiology.booking_cancelled.
// A lab or radiology booking can be cancelled only before the sample is taken or the patient arrives, so nothing was
// delivered: what the patient paid by card goes back in full. A lab collector already on the way (IN_TRANSIT) keeps the
// same trip fee the nursing refund keeps. Before this, a paid card booking cancelled with no refund at all.
// Idempotent per booking (refund_id); a booking that was never paid by card is a no-op. Never throws.
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class LabRadiologyRefundListener {
  private readonly logger = new Logger('LabRadiologyRefundListener');
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly refundExec: RefundExecutor,
  ) {}

  @OnEvent('lab.booking_cancelled')
  async onLabCancelled(e: any) { await this.refund('lab', e); }

  @OnEvent('radiology.booking_cancelled')
  async onRadiologyCancelled(e: any) { await this.refund('radiology', e); }

  async refund(kind: 'lab' | 'radiology', e: any): Promise<void> {
    const bookingId = String(e?.booking_id || '');
    const patientId = String(e?.patient_id || '');
    if (!bookingId || !patientId) return;
    try {
      const paid: any = await this.conn.collection('transactions').findOne({ booking_kind: kind, booking_id: bookingId, status: 'paid' } as any)
        || await findCopayTransaction(this.conn as never, await this.conn.collection(kind === 'lab' ? 'labbookings' : 'radiologybookings').findOne({ id: bookingId } as any), bookingId);
      if (!paid || paid.status !== 'paid') return;
      const left = Math.max(0, Math.round((Number(paid.amount || 0) - Number(paid.refunded_amount || 0)) * 100) / 100);
      const policyDoc: any = await this.conn.collection('system_configs').findOne({ key: 'refund_policy' }).catch(() => null);
      const tripFee = Number(policyDoc?.value?.home_visit?.trip_fee_sar ?? 40);
      // refund policy 3.0: after the collector set off the PATIENT bears the trip fee; the provider cancelling or not attending refunds 100%
      const keepsTripFee = kind === 'lab' && String(e?.prior_state || '').toUpperCase() === 'IN_TRANSIT' && e?.cancelled_by !== 'provider';
      const amount = keepsTripFee ? Math.max(0, Math.round((left - tripFee) * 100) / 100) : left;
      if (!(amount > 0)) return;
      await this.refundExec.execute({
        refund_id: `${kind}-cancel-${bookingId}`,
        booking_kind: kind,
        booking_id: bookingId,
        patient_id: patientId,
        amount,
        reason: keepsTripFee ? `${kind}_cancel_after_transit` : `${kind}_cancel_before_service`,
        actor_id: 'system',
      });
    } catch (err: any) {
      this.logger.error(`${kind} refund consumer failed: ${err?.message} (booking ${bookingId})`);
      await this.conn.collection('event_dlq').insertOne({
        original_event_id: `${kind}-cancel-${bookingId}`, type: `${kind}.booking_cancelled`, entity_type: `${kind}_booking`, entity_id: bookingId,
        payload: e, attempts: 0, last_error: String(err?.message || err).slice(0, 500), status: 'pending', createdAt: new Date(), updatedAt: new Date(),
      } as any).catch((dlqErr: any) => this.logger.error(`${kind} refund failure not queued: ${dlqErr?.message}`));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
@Global()
@Module({
  controllers: [FinanceEngineController, AdminFinanceEngineController],
  providers: [LedgerService, CommissionResolver, CouponService, LoyaltyRedeemService, FraudService, RefundExecutor, CancellationPolicy, ReportsService, ApprovalService, AppointmentRefundListener, NursingRefundListener, NursingNoShowRefundListener, PharmacyRefundListener, LabRadiologyRefundListener, ProviderCancelRefundListener],
  exports: [LedgerService, CommissionResolver, CouponService, LoyaltyRedeemService, FraudService, RefundExecutor, CancellationPolicy, ReportsService, ApprovalService],
})
export class FinanceEngineModule {}
