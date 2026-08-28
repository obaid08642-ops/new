/**
 * A5 acceptance — the coupon rules engine (percent/amount/min/cap/limits/expiry).
 */
import { applyCoupon } from '../src/modules/admin-enterprise/admin-coupons.controller';

const NOW = new Date('2026-06-15T12:00:00Z');
const ctx = (basket: number, prevUsage = 0) => ({ basket_total: basket, user_id: 'u1', now: NOW, user_previous_usage: prevUsage });

describe('A5 · coupon engine', () => {
  const base: any = { code: 'SAVE10', discount_type: 'percent', value: 10, active: true };

  it('percent discount with cap', () => {
    // 10% of 500 = 50, cap 30 ⇒ 30
    expect(applyCoupon({ ...base, max_discount_cap: 30 }, ctx(500))).toEqual({ ok: true, code: 'SAVE10', discount: 30 });
    // 10% of 200 = 20, under cap
    const r2 = applyCoupon({ ...base, max_discount_cap: 30 }, ctx(200));
    expect(r2.ok && r2.discount).toBe(20);
  });
  it('amount discount never exceeds the basket', () => {
    // amount 25 on a 20 basket ⇒ clamps to 20
    expect(applyCoupon({ code: 'F25', discount_type: 'amount', value: 25, active: true }, ctx(20))).toEqual({ ok: true, code: 'F25', discount: 20 });
  });
  it('min basket gate', () => {
    const minFail = applyCoupon({ ...base, min_basket: 300 }, ctx(299));
    expect(minFail).toEqual({ ok: false, reason: 'min_basket_not_met' });
    const minPass = applyCoupon({ ...base, min_basket: 300 }, ctx(300));
    expect(minPass.ok).toBe(true);
  });
  it('validity window', () => {
    expect(applyCoupon({ ...base, starts_at: new Date('2026-07-01') }, ctx(100))).toEqual({ ok: false, reason: 'not_started' });
    expect(applyCoupon({ ...base, expires_at: new Date('2026-01-01') }, ctx(100))).toEqual({ ok: false, reason: 'expired' });
  });
  it('total + per-user usage limits', () => {
    expect(applyCoupon({ ...base, usage_limit_total: 5, used_count: 5 }, ctx(100))).toEqual({ ok: false, reason: 'usage_limit_reached' });
    const firstUse = applyCoupon({ ...base, usage_limit_per_user: 1 }, ctx(100));
    expect(firstUse.ok).toBe(true);
    expect(applyCoupon({ ...base, usage_limit_per_user: 1 }, ctx(100), )).not.toEqual(expect.objectContaining({ ok: false, reason: 'per_user_limit_reached' }));
    expect(applyCoupon({ ...base, usage_limit_per_user: 1 }, ctx(100, 1))).toEqual({ ok: false, reason: 'per_user_limit_reached' });
  });
  it('inactive and bogus values fail closed', () => {
    const r1: any = applyCoupon({ ...base, active: false }, ctx(100));
    const r2: any = applyCoupon({ ...base, value: 150 }, ctx(100));
    const r3: any = applyCoupon(null, ctx(100));
    expect(r1.reason).toBe('inactive');
    expect(r2.reason).toBe('invalid_value');
    expect(r3.reason).toBe('not_found');
  });
});
