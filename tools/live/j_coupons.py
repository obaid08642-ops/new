"""Journey (PT-20 coupons and promotions): a coupon made on the admin screen is the coupon the patient's checkout prices.

The admin console writes discount_type/value/min_basket/max_discount_cap/expires_at; checkout (POST /finance-engine/coupons/validate,
the same CouponService the order uses) only read the older discount_percent/min_order/valid_until names, so an admin coupon
discounted nothing and ignored its expiry. Steps: admin creates coupons with a reason (audited), the patient validates them
(minimum basket, cap, fixed amount, expired, switched off, unknown) and gets the same figure as the admin tester; ten wrong codes
in an hour lock the account's attempts. Applying a coupon to an order and giving it back on cancel is covered with a real MongoDB in
coupon-rules.spec.ts and the 50-parallel race in concurrency-races.spec.ts (the legacy order path has no live flow)."""
import time
from lib import Client, journey, step, summary, uniq

REASON = 'عرض تجريبي لاختبار الكوبونات'
VALIDATE = '/finance-engine/coupons/validate'


def code(tag):
    return ('T' + tag + uniq('')[-6:]).upper().replace('_', '')[:20]


def run(admin, pat):
    journey('coupons: the admin creates, the patient prices (PT-20)')
    pct = code('PCT')
    r = admin.post('/admin/admin/coupons', {'code': pct, 'discount_type': 'percent', 'value': 20, 'min_basket': 100,
                                            'max_discount_cap': 15, 'usage_limit_total': 5, 'reason': REASON})
    step('admin creates a 20% coupon (min basket 100, cap 15)', r.ok and r.get('code') == pct, r)
    pct_id = r.get('id')
    r = admin.post('/admin/admin/coupons', {'code': pct, 'discount_type': 'percent', 'value': 20, 'reason': REASON})
    step('the same code twice is refused', r.status == 409, r)
    r = admin.post('/admin/admin/coupons', {'code': code('BAD'), 'discount_type': 'percent', 'value': 120, 'reason': REASON})
    step('a percent above 100 is refused', r.status == 400, r)

    r = pat.post(VALIDATE, {'code': pct, 'order_total': 99})
    step('below the minimum basket: refused with the minimum', r.ok and r.get('valid') is False and r.get('reason') == 'min_order_100', r)
    r = pat.post(VALIDATE, {'code': pct.lower(), 'order_total': 200})
    step('200 SAR: 20% = 40, capped at 15 (the code is case-insensitive)', r.ok and r.get('valid') is True and r.get('discount') == 15, r)
    a = admin.post('/admin/admin/coupons/validate', {'code': pct, 'basket_total': 200})
    step('the admin tester shows the same discount the patient gets', a.ok and a.get('discount') == 15, a)

    amt = code('AMT')
    r = admin.post('/admin/admin/coupons', {'code': amt, 'discount_type': 'amount', 'value': 30, 'reason': REASON})
    step('admin creates a fixed 30 SAR coupon', r.ok, r)
    r = pat.post(VALIDATE, {'code': amt, 'order_total': 200})
    step('fixed amount: 30 off', r.ok and r.get('valid') is True and r.get('discount') == 30, r)
    r = pat.post(VALIDATE, {'code': amt, 'order_total': 20})
    step('a fixed amount never exceeds the basket', r.ok and r.get('discount') == 20, r)

    old = code('OLD')
    r = admin.post('/admin/admin/coupons', {'code': old, 'discount_type': 'percent', 'value': 10,
                                            'expires_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 86400)), 'reason': REASON})
    step('admin creates a coupon that already expired', r.ok, r)
    r = pat.post(VALIDATE, {'code': old, 'order_total': 200})
    step('an expired coupon is refused', r.ok and r.get('valid') is False and r.get('reason') == 'expired', r)

    r = admin.patch(f'/admin/admin/coupons/{pct_id}', {'active': False, 'reason': REASON})
    step('admin switches the 20% coupon off', r.ok, r)
    r = pat.post(VALIDATE, {'code': pct, 'order_total': 200})
    step('a switched-off coupon is refused', r.ok and r.get('valid') is False and r.get('reason') == 'inactive', r)
    r = pat.post(VALIDATE, {'code': 'NOSUCHCODE99', 'order_total': 200})
    step('an unknown code is refused', r.ok and r.get('valid') is False and r.get('reason') == 'not_found', r)

    journey('coupons: guessing is rate limited')
    for i in range(10):
        pat.post(VALIDATE, {'code': f'GUESS{i}XX', 'order_total': 200})
    r = pat.post(VALIDATE, {'code': amt, 'order_total': 200})
    step('after ten wrong codes in an hour even a good code waits', r.ok and r.get('valid') is False and r.get('reason') == 'too_many_attempts', r)


if __name__ == '__main__':
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    pat = Client(j_accounts.app_signup(label='coupon')['token'], 'patient')
    run(admin, pat)
    summary()
