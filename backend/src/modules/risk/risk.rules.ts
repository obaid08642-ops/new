/**
 * 22.11 — the rules of the risk score. Every number has a name here and an admin can change it in
 * `system_configs` (key `risk_rules`); nothing is hard-coded in the detectors.
 *
 * A signal is a pattern seen in a window of time. Each carries a weight; a user's score is the sum of the weights of the
 * signals that fired (capped at 100). The levels are thresholds on that score. Nothing is blocked automatically: a high
 * score raises an alert for a person to look at, because a rule that blocks on a guess blocks real patients.
 */
export type SignalType =
  | 'account_farm' | 'device_sharing' | 'fake_orders' | 'cod_abuse' | 'card_testing' | 'promo_abuse'
  | 'refund_abuse' | 'payment_velocity' | 'coupon_guessing' | 'duplicate_payment';

export interface RiskRules {
  /** Accounts registered from one device (or from one address) inside the window. */
  farm_window_hours: number;
  farm_device_accounts: number;
  farm_ip_accounts: number;
  /** Accounts signed in on one device inside the window. */
  sharing_window_days: number;
  sharing_device_accounts: number;
  /** Orders the patient cancelled within `fake_order_max_age_hours` of creating them, inside the window, with none delivered. */
  fake_window_days: number;
  fake_order_max_age_hours: number;
  fake_orders_cancelled: number;
  /** Cash-on-delivery orders cancelled once they were on the way (or not collected). */
  cod_window_days: number;
  cod_cancelled_after_dispatch: number;
  /** Different cards failing for one account inside the window (card testing). */
  card_window_minutes: number;
  card_distinct_failed: number;
  /** Accounts on one device that redeemed the same coupon. */
  promo_accounts_per_device: number;
  weights: Record<SignalType, number>;
  levels: { medium: number; high: number };
}

export const DEFAULT_RISK_RULES: RiskRules = {
  farm_window_hours: 24,
  farm_device_accounts: 3,
  farm_ip_accounts: 5,
  sharing_window_days: 7,
  sharing_device_accounts: 4,
  fake_window_days: 7,
  fake_order_max_age_hours: 24,
  fake_orders_cancelled: 4,
  cod_window_days: 30,
  cod_cancelled_after_dispatch: 2,
  card_window_minutes: 60,
  card_distinct_failed: 3,
  promo_accounts_per_device: 3,
  weights: {
    account_farm: 45, device_sharing: 20, fake_orders: 40, cod_abuse: 35, card_testing: 50, promo_abuse: 35,
    // the detectors that already existed (finance engine) feed the same score
    refund_abuse: 20, payment_velocity: 30, coupon_guessing: 20, duplicate_payment: 25,
  },
  levels: { medium: 40, high: 70 },
};

export type RiskLevel = 'low' | 'medium' | 'high';

export function levelOf(score: number, levels: { medium: number; high: number }): RiskLevel {
  return score >= levels.high ? 'high' : score >= levels.medium ? 'medium' : 'low';
}

const num = (v: unknown, fallback: number, min = 0, max = 1_000_000) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback);

/** The stored rules over the defaults; a bad number falls back to its default instead of switching a rule off. */
export function mergeRules(stored: unknown): RiskRules {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<RiskRules> & Record<string, any>;
  const d = DEFAULT_RISK_RULES;
  const weights = { ...d.weights } as Record<SignalType, number>;
  for (const k of Object.keys(weights) as SignalType[]) weights[k] = num(s.weights?.[k], d.weights[k], 0, 100);
  const medium = num(s.levels?.medium, d.levels.medium, 1, 100);
  const high = num(s.levels?.high, d.levels.high, 1, 100);
  return {
    farm_window_hours: num(s.farm_window_hours, d.farm_window_hours, 1, 24 * 90),
    farm_device_accounts: num(s.farm_device_accounts, d.farm_device_accounts, 2, 1000),
    farm_ip_accounts: num(s.farm_ip_accounts, d.farm_ip_accounts, 2, 1000),
    sharing_window_days: num(s.sharing_window_days, d.sharing_window_days, 1, 90),
    sharing_device_accounts: num(s.sharing_device_accounts, d.sharing_device_accounts, 2, 1000),
    fake_window_days: num(s.fake_window_days, d.fake_window_days, 1, 90),
    fake_order_max_age_hours: num(s.fake_order_max_age_hours, d.fake_order_max_age_hours, 1, 24 * 30),
    fake_orders_cancelled: num(s.fake_orders_cancelled, d.fake_orders_cancelled, 2, 1000),
    cod_window_days: num(s.cod_window_days, d.cod_window_days, 1, 365),
    cod_cancelled_after_dispatch: num(s.cod_cancelled_after_dispatch, d.cod_cancelled_after_dispatch, 1, 1000),
    card_window_minutes: num(s.card_window_minutes, d.card_window_minutes, 1, 24 * 60),
    card_distinct_failed: num(s.card_distinct_failed, d.card_distinct_failed, 2, 1000),
    promo_accounts_per_device: num(s.promo_accounts_per_device, d.promo_accounts_per_device, 2, 1000),
    weights,
    levels: medium < high ? { medium, high } : d.levels,
  };
}
