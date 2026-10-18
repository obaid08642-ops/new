/**
 * Phase 22.11 — fraud and risk scoring.
 *
 * What existed: four single-purpose detectors in the finance engine (refund abuse, payment velocity, coupon guessing,
 * duplicate payment) raising `fraud_alerts`, and an admin list of those alerts. What was missing: a score per person that
 * combines what is seen, the patterns the plan names that nothing looked for (fake orders, cash-on-delivery abuse, account
 * farms, promo abuse, card testing), and a dashboard to work from.
 *
 * Origins: when an account is registered or signs in, a hashed form of the device and of the address is kept for 90 days
 * (`risk_origins`) — the raw values are never stored here, and the address is never part of an identity: it only helps to
 * see that many new accounts come from one place.
 *
 * 3-D Secure: card payments are created at Moyasar and completed on its hosted page (`source.transaction_url`), which
 * runs 3-D Secure; this code has no path that marks a card payment paid without the gateway saying so. Failed payments are
 * scored here (`card_testing`, `payment_velocity`).
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHmac, randomUUID } from 'crypto';
import { currentLogContext } from '../../common/structured-logger';
import { DEFAULT_RISK_RULES, RiskLevel, RiskRules, SignalType, levelOf, mergeRules } from './risk.rules';

export interface Signal {
  type: SignalType;
  weight: number;
  /** Counts and ids a reviewer needs; never a raw address, device id, card or message. */
  evidence: Record<string, unknown>;
}

export interface RiskScore {
  user_id: string;
  score: number;
  level: RiskLevel;
  signals: Signal[];
  computed_at: Date;
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Alert types of the finance detectors, mapped to the signals they feed. */
const ALERT_SIGNAL: Record<string, SignalType> = {
  refund_abuse: 'refund_abuse',
  payment_velocity_abuse: 'payment_velocity',
  coupon_abuse: 'coupon_guessing',
  duplicate_payment: 'duplicate_payment',
};

@Injectable()
export class RiskService {
  private readonly logger = new Logger('Risk');
  private indexReady: Promise<unknown> | null = null;
  /** Rescoring one person at most once every few seconds, however many events arrive. */
  private recent = new Map<string, number>();
  static readonly MIN_GAP_MS = 5_000;

  constructor(@InjectConnection() private readonly conn: Connection) {}

  private col(name: string) { return this.conn.collection(name); }

  private hash(kind: 'ip' | 'device', value?: string): string | null {
    if (!value) return null;
    const key = process.env.RISK_HASH_KEY || process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'risk-dev-key');
    if (!key) return null; // production without a secret: store nothing rather than guessable hashes
    return createHmac('sha256', key).update(`${kind}:${value}`).digest('hex').slice(0, 32);
  }

  private ensureIndexes() {
    return (this.indexReady ??= (async () => {
      const origins = this.col('risk_origins');
      await origins.createIndex({ at: 1 }, { expireAfterSeconds: 90 * 24 * 3600 }).catch(() => undefined);
      await origins.createIndex({ device_h: 1, at: -1 }).catch(() => undefined);
      await origins.createIndex({ ip_h: 1, at: -1 }).catch(() => undefined);
      await origins.createIndex({ user_id: 1, at: -1 }).catch(() => undefined);
      await this.col('risk_scores').createIndex({ user_id: 1 }, { unique: true }).catch(() => undefined);
      await this.col('risk_scores').createIndex({ score: -1 }).catch(() => undefined);
      await this.col('risk_scores').createIndex({ level: 1, score: -1, computed_at: -1 }).catch(() => undefined);
      await this.col('risk_scores').createIndex({ 'signals.type': 1 }).catch(() => undefined);
      await this.col('risk_locks').createIndex({ at: 1 }, { expireAfterSeconds: 2 * 3600 }).catch(() => undefined);
    })().catch(() => { this.indexReady = null; }));
  }

  async rules(): Promise<RiskRules> {
    const doc: any = await this.col('system_configs').findOne({ key: 'risk_rules' }, { projection: { value: 1 } }).catch(() => null);
    return mergeRules(doc?.value);
  }

  /** Remember where an account was registered or signed in from (hashed), from the request in flight. */
  async recordOrigin(userId: string, kind: 'register' | 'login', ctx = currentLogContext()): Promise<void> {
    const device_h = this.hash('device', ctx.deviceId);
    const ip_h = this.hash('ip', ctx.ip);
    if (!userId || (!device_h && !ip_h)) return;
    await this.ensureIndexes();
    await this.col('risk_origins').insertOne({ user_id: userId, kind, device_h, ip_h, at: new Date() });
  }

  /* ---------------- signals ---------------- */

  private async accountFarm(userId: string, r: RiskRules): Promise<Signal[]> {
    const mine = await this.col('risk_origins').find({ user_id: userId, kind: 'register' }).sort({ at: -1 }).limit(5).toArray();
    const window = (o: Record<string, unknown>) => ({ $gte: new Date(new Date(o.at as Date).getTime() - r.farm_window_hours * HOUR), $lte: new Date(new Date(o.at as Date).getTime() + r.farm_window_hours * HOUR) });
    // a device match on any of the registrations is the strong signal: look for it first, then for a shared address
    for (const o of mine) {
      if (!o.device_h) continue;
      const accounts = await this.col('risk_origins').distinct('user_id', { kind: 'register', device_h: o.device_h, at: window(o) });
      if (accounts.length >= r.farm_device_accounts) {
        return [{ type: 'account_farm', weight: r.weights.account_farm, evidence: { by: 'device', accounts: accounts.length, window_hours: r.farm_window_hours, user_ids: accounts.slice(0, 20) } }];
      }
    }
    for (const o of mine) {
      if (!o.ip_h) continue;
      const accounts = await this.col('risk_origins').distinct('user_id', { kind: 'register', ip_h: o.ip_h, at: window(o) });
      if (accounts.length >= r.farm_ip_accounts) {
        return [{ type: 'account_farm', weight: Math.min(r.farm_ip_weight, r.weights.account_farm), evidence: { by: 'address', accounts: accounts.length, window_hours: r.farm_window_hours, user_ids: accounts.slice(0, 20) } }];
      }
    }
    return [];
  }

  private async deviceSharing(userId: string, r: RiskRules, now: number): Promise<Signal[]> {
    const since = new Date(now - r.sharing_window_days * DAY);
    const devices = await this.col('risk_origins').distinct('device_h', { user_id: userId, at: { $gte: since }, device_h: { $ne: null } });
    for (const d of devices) {
      const accounts = await this.col('risk_origins').distinct('user_id', { device_h: d, at: { $gte: since } });
      if (accounts.length >= r.sharing_device_accounts) {
        return [{ type: 'device_sharing', weight: r.weights.device_sharing, evidence: { accounts: accounts.length, window_days: r.sharing_window_days } }];
      }
    }
    return [];
  }

  private async fakeOrders(userId: string, r: RiskRules, now: number): Promise<Signal[]> {
    const since = new Date(now - r.fake_window_days * DAY);
    const orders: any[] = await this.col('pharmacy_orders').find({ patient_account_id: userId, createdAt: { $gte: since } }, { projection: { status: 1, createdAt: 1, timeline: 1, cancellation_reason: 1 } }).limit(500).toArray();
    if (orders.some((o) => ['delivered', 'completed'].includes(String(o.status)))) return [];
    const quick = orders.filter((o) => {
      if (String(o.status) !== 'cancelled') return false;
      const cancelled = (o.timeline || []).find((t: any) => t?.event === 'cancelled_by_patient');
      const at = cancelled?.ts ? new Date(cancelled.ts).getTime() : NaN;
      return Number.isFinite(at) && at - new Date(o.createdAt).getTime() <= r.fake_order_max_age_hours * HOUR;
    });
    return quick.length >= r.fake_orders_cancelled
      ? [{ type: 'fake_orders', weight: r.weights.fake_orders, evidence: { cancelled_quickly: quick.length, window_days: r.fake_window_days, delivered: 0 } }]
      : [];
  }

  private async codAbuse(userId: string, r: RiskRules, now: number): Promise<Signal[]> {
    const since = new Date(now - r.cod_window_days * DAY);
    const orders: any[] = await this.col('pharmacy_orders').find({ patient_account_id: userId, payment_method: 'cod', status: 'cancelled', createdAt: { $gte: since } }, { projection: { id: 1, timeline: 1 } }).limit(200).toArray();
    const dispatched = (t: any) => /out_for_delivery|dispatched/.test(String(t?.event));
    // the pharmacy marks "out for delivery" on its allocation (the order's own timeline can carry it too)
    const viaAllocation = new Set<string>();
    const ids = orders.map((o) => o.id).filter(Boolean);
    if (ids.length) {
      const allocs: any[] = await this.col('pharmacy_allocations').find({ order_id: { $in: ids }, 'timeline.event': { $in: ['out_for_delivery', 'dispatched'] } }, { projection: { order_id: 1 } }).limit(500).toArray();
      for (const a of allocs) viaAllocation.add(String(a.order_id));
    }
    const late = orders.filter((o) => (o.timeline || []).some(dispatched) || viaAllocation.has(String(o.id)));
    return late.length >= r.cod_cancelled_after_dispatch
      ? [{ type: 'cod_abuse', weight: r.weights.cod_abuse, evidence: { cancelled_after_dispatch: late.length, window_days: r.cod_window_days } }]
      : [];
  }

  private async cardTesting(userId: string, r: RiskRules, now: number): Promise<Signal[]> {
    const since = new Date(now - r.card_window_minutes * 60_000);
    const failed: any[] = await this.col('moyasar_payments').find({ patient_id: userId, status: 'failed', createdAt: { $gte: since } }, { projection: { source: 1 } }).limit(200).toArray();
    // the masked number the gateway returns tells cards apart; a failed payment with no card detail counts as one unknown card
    const cards = new Set(failed.map((p) => String(p.source?.number || p.source?.name || 'unknown')));
    return cards.size >= r.card_distinct_failed
      ? [{ type: 'card_testing', weight: r.weights.card_testing, evidence: { distinct_cards_failed: cards.size, failed_payments: failed.length, window_minutes: r.card_window_minutes } }]
      : [];
  }

  private async promoAbuse(userId: string, r: RiskRules): Promise<Signal[]> {
    const mine = await this.col('coupon_redemptions').find({ user_id: userId }).limit(50).toArray();
    if (!mine.length) return [];
    const devices = await this.col('risk_origins').distinct('device_h', { user_id: userId, device_h: { $ne: null } });
    if (!devices.length) return [];
    const sharing = await this.col('risk_origins').distinct('user_id', { device_h: { $in: devices } });
    for (const code of [...new Set(mine.map((m) => String(m.code)))]) {
      const redeemers = await this.col('coupon_redemptions').distinct('user_id', { code, user_id: { $in: sharing } });
      if (redeemers.length >= r.promo_accounts_per_device) {
        return [{ type: 'promo_abuse', weight: r.weights.promo_abuse, evidence: { coupon: code, accounts_on_one_device: redeemers.length } }];
      }
    }
    return [];
  }

  /** The finance detectors' open alerts for this person, as signals. */
  private async detectorAlerts(userId: string, r: RiskRules, now: number): Promise<Signal[]> {
    const alerts: any[] = await this.col('fraud_alerts').find({ userId, status: { $in: ['pending', 'flagged'] }, createdAt: { $gte: new Date(now - 30 * DAY) } }).limit(50).toArray();
    const seen = new Set<SignalType>();
    const out: Signal[] = [];
    for (const a of alerts) {
      const type = ALERT_SIGNAL[a.flagType];
      if (!type || seen.has(type)) continue;
      seen.add(type);
      out.push({ type, weight: r.weights[type], evidence: { alert_id: a.id, confidence: a.confidenceScore ?? null, details: a.details ?? {} } });
    }
    return out;
  }

  /* ---------------- score ---------------- */

  /** Compute, store and (when high) raise an alert for one person's risk. */
  async evaluate(userId: string, opts: { force?: boolean; now?: number } = {}): Promise<RiskScore | null> {
    if (!userId) return null;
    const now = opts.now ?? Date.now();
    const last = this.recent.get(userId) ?? 0;
    if (!opts.force && now - last < RiskService.MIN_GAP_MS) return null;
    this.recent.set(userId, now);
    if (this.recent.size > 5000) this.recent.clear();
    try {
      return await this.compute(userId, now);
    } catch (e) {
      this.recent.delete(userId); // a failed evaluation must not hold off the next try
      throw e;
    }
  }

  private async compute(userId: string, now: number): Promise<RiskScore | null> {
    await this.ensureIndexes();
    const r = await this.rules();
    const parts = await Promise.all([
      this.accountFarm(userId, r), this.deviceSharing(userId, r, now), this.fakeOrders(userId, r, now), this.codAbuse(userId, r, now),
      this.cardTesting(userId, r, now), this.promoAbuse(userId, r), this.detectorAlerts(userId, r, now),
    ]);
    const signals = parts.flat();
    const score = Math.min(100, signals.reduce((s, x) => s + x.weight, 0));
    const level = levelOf(score, r.levels);
    const doc: RiskScore = { user_id: userId, score, level, signals, computed_at: new Date(now) };
    const prev: any = await this.col('risk_scores').findOneAndUpdate({ user_id: userId }, { $set: doc as any, $setOnInsert: { first_seen_at: new Date(now) } }, { upsert: true, returnDocument: 'before' });
    if (level === 'high' && prev?.level !== 'high') await this.raiseAlert(doc);
    return doc;
  }

  private async raiseAlert(score: RiskScore): Promise<void> {
    const open = await this.col('fraud_alerts').findOne({ userId: score.user_id, flagType: 'risk_high', status: { $in: ['pending', 'flagged'] } });
    if (open) return;
    await this.col('fraud_alerts').insertOne({
      id: `fa_${randomUUID()}`, userId: score.user_id, providerId: null, flagType: 'risk_high', confidenceScore: Math.min(0.99, score.score / 100),
      severity: 'high', details: { score: score.score, signals: score.signals.map((s) => s.type) }, status: 'pending', createdAt: new Date(), updatedAt: new Date(),
    } as never);
    this.logger.warn(`RISK HIGH user=${score.user_id} score=${score.score} signals=${score.signals.map((s) => s.type).join(',')}`);
  }

  /* ---------------- events ---------------- */

  // patients and providers are scored; the platform's own staff are not (their sign-ins would only add noise)
  private static readonly STAFF = new Set(['admin', 'super_admin']);
  @OnEvent('user.registered') async onRegistered(p: { user_id?: string; role?: string }) {
    if (RiskService.STAFF.has(String(p?.role))) return;
    await this.safe(async () => {
      await this.recordOrigin(p.user_id!, 'register');
      const scored = await this.evaluate(p.user_id!, { force: true });
      // the newest account is the one that completes a farm: the accounts that came before it are scored again, or they would keep their old, lower score
      const farm = scored?.signals.find((x) => x.type === 'account_farm' && (x.evidence as { by?: string }).by === 'device');
      const others = ((farm?.evidence as { user_ids?: string[] } | undefined)?.user_ids ?? []).filter((id) => id !== p.user_id).slice(0, 20);
      for (const id of others) await this.evaluate(id, { force: true });
    });
  }
  @OnEvent('user.logged_in') async onLoggedIn(p: { user_id?: string; role?: string }) {
    if (RiskService.STAFF.has(String(p?.role))) return;
    await this.safe(async () => { await this.recordOrigin(p.user_id!, 'login'); await this.evaluate(p.user_id!); });
  }
  @OnEvent('pharmacy.order.cancelled') async onOrderCancelled(p: { patient_account_id?: string }) { await this.safe(() => this.evaluate(p.patient_account_id!, { force: true })); }
  @OnEvent('payment.failed') async onPaymentFailed(p: { patient_id?: string }) { await this.safe(() => this.evaluate(p.patient_id!, { force: true })); }

  private async safe(fn: () => Promise<unknown>) {
    try { await fn(); } catch (e: any) { this.logger.warn(`risk evaluation failed: ${e?.message}`); }
  }

  /**
   * Every night: the people with activity in the last two days, and everyone already flagged (medium/high), so a flagged
   * person who went quiet sees their score fall when the windows move. One replica runs it (a lock row per day).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async rescoreRecent(): Promise<number> {
    await this.ensureIndexes();
    try {
      await this.col('risk_locks').insertOne({ _id: `rescore:${new Date().toISOString().slice(0, 10)}` as never, at: new Date() });
    } catch { return 0; } // another replica has today's run
    const since = new Date(Date.now() - 2 * DAY);
    const ids = new Set<string>();
    for (const id of await this.col('risk_origins').distinct('user_id', { at: { $gte: since } })) ids.add(String(id));
    for (const id of await this.col('pharmacy_orders').distinct('patient_account_id', { updatedAt: { $gte: since } })) ids.add(String(id));
    for (const id of await this.col('risk_scores').distinct('user_id', { level: { $in: ['medium', 'high'] } })) ids.add(String(id));
    let n = 0;
    for (const id of [...ids].slice(0, 5000)) { await this.safe(() => this.evaluate(id, { force: true })); n += 1; }
    return n;
  }

  /* ---------------- dashboard reads ---------------- */

  async summary() {
    await this.ensureIndexes();
    const col = this.col('risk_scores');
    const [high, medium, total, bySignal, lastDay] = await Promise.all([
      col.countDocuments({ level: 'high' }), col.countDocuments({ level: 'medium' }), col.countDocuments({}),
      col.aggregate([{ $match: { level: { $in: ['medium', 'high'] } } }, { $unwind: '$signals' }, { $group: { _id: '$signals.type', users: { $sum: 1 } } }, { $sort: { users: -1 } }]).toArray(),
      col.countDocuments({ level: { $in: ['medium', 'high'] }, first_seen_at: { $gte: new Date(Date.now() - DAY) } }),
    ]);
    const openAlerts = await this.col('fraud_alerts').countDocuments({ status: { $in: ['pending', 'flagged'] } });
    return { scored: total, high, medium, new_flagged_24h: lastDay, open_alerts: openAlerts, by_signal: bySignal.map((b: any) => ({ signal: b._id, users: b.users })), rules: await this.rules() };
  }

  async list(opts: { level?: string; signal?: string; page?: number; limit?: number }): Promise<{ total: number; page: number; limit: number; users: Array<Record<string, unknown>> }> {
    const page = Math.max(1, Math.floor(opts.page || 1));
    const limit = Math.max(1, Math.min(100, Math.floor(opts.limit || 25)));
    const filter: Record<string, unknown> = {};
    if (opts.level === 'high') filter.level = 'high';
    else if (opts.level === 'medium') filter.level = { $in: ['medium', 'high'] };
    else filter.level = { $in: ['medium', 'high'] }; // the dashboard is for people who need a look; low scores are not listed
    if (opts.signal && /^[a-z_]{3,32}$/.test(opts.signal)) filter['signals.type'] = opts.signal;
    const col = this.col('risk_scores');
    const [rows, total] = await Promise.all([
      col.find(filter, { projection: { _id: 0 } }).sort({ score: -1, computed_at: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    return { total, page, limit, users: rows as Array<Record<string, unknown>> };
  }

  async detail(userId: string): Promise<{ user_id: string; score: Record<string, unknown> | null; alerts: Array<Record<string, unknown>> }> {
    const score = await this.col('risk_scores').findOne({ user_id: String(userId) }, { projection: { _id: 0 } });
    const alerts = await this.col('fraud_alerts').find({ userId: String(userId) }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(20).toArray();
    return { user_id: userId, score: (score as Record<string, unknown> | null) ?? null, alerts: alerts as Array<Record<string, unknown>> };
  }
}
export { DEFAULT_RISK_RULES };
