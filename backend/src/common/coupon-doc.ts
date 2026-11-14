/**
 * One reading of a `coupons` document for checkout.
 *
 * Two writers share the collection: the admin console (`admin/coupons`: discount_type + value, min_basket, max_discount_cap,
 * starts_at, expires_at, usage_limit_total) and the older admin-spa route (`coupons`: discount_percent / discount_amount, min_order,
 * max_discount, valid_from, valid_until, max_uses). Checkout (`CouponService`) only read the second shape, so a coupon made on the
 * admin screen discounted nothing, ignored its expiry, its minimum and its total limit. Every field is read through here; when both
 * shapes are present the checkout names win, so existing rows behave as before.
 */
export type CouponRow = Record<string, any>;

const has = (v: unknown) => v !== undefined && v !== null;

export function normalizeCoupon(c: CouponRow): CouponRow {
  const value = Number(c.value);
  const byType = has(c.discount_type) && Number.isFinite(value) && value > 0;
  return {
    ...c,
    discount_percent: has(c.discount_percent) ? c.discount_percent : byType && c.discount_type === 'percent' ? value : undefined,
    discount_amount: has(c.discount_amount) ? c.discount_amount : byType && c.discount_type === 'amount' ? value : undefined,
    min_order: has(c.min_order) ? c.min_order : has(c.min_basket) && Number(c.min_basket) > 0 ? c.min_basket : undefined,
    max_discount: has(c.max_discount) ? c.max_discount : has(c.max_discount_cap) ? c.max_discount_cap : undefined,
    valid_from: has(c.valid_from) ? c.valid_from : c.starts_at,
    valid_until: has(c.valid_until) ? c.valid_until : c.expires_at,
    max_uses: has(c.max_uses) ? c.max_uses : has(c.usage_limit_total) ? c.usage_limit_total : undefined,
  };
}
