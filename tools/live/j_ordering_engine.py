"""Journey: ordering engine M3 (docs/product/ORDERING_MODEL_2026-10-16.md; the six-step screens call these routes).
  A lab registers, is approved, declares its home/facility prices (PUT /provider/ordering/settings and /items, M1); a patient
  asks POST /ordering/quote for a test, reads the windows, books the group (POST /ordering/bookings) and the price stays locked.
  Checked on the real stack: ownership of the quote, no provider contact data in any answer, one use per quote."""
import uuid

from lib import Client, journey, step

LAT, LNG = 24.7, 46.7


def run():
    import j_admin, j_accounts, j_onboarding, j_lab_preparation_langs as prep
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    r, test_id = prep.admin_test(admin, tag, 'Ordering engine CBC', {})
    step('the admin publishes a test for the lab to price', r.ok and test_id, r)

    journey('ordering engine: a lab declares its prices')
    p = j_onboarding.register_type('lab', {'test_categories': [test_id]})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    lab_id = lab.get('/provider/me').get('account', 'id')
    r = lab.put('/provider/ordering/settings', {'modes': ['home', 'facility'], 'home_fee': 25, 'home_radius_km': 30, 'auto_accept': False, 'walk_in': False})
    step('the lab declares home and facility with a home fee', r.ok, r)
    r = lab.put('/provider/ordering/items', {'service_kind': 'lab', 'catalog_id': test_id, 'prices': {'home': 80, 'facility': 55}})
    step('the lab prices the test for home and for the facility', r.ok, r)

    journey('ordering engine: the patient quotes and compares')
    pat = Client(j_accounts.app_signup(label='ordering-patient')['token'], 'patient')
    ctx = {'mode': 'home', 'lat': LAT, 'lng': LNG, 'payer': 'cash'}
    r = pat.post('/ordering/quote', {'service_kind': 'lab', 'items': [test_id], 'context': ctx})
    best = r.get('best_match') or {}
    step('the quote returns a lowest total with the home fee (80 + 25) and a count', r.ok and (r.get('from_price') or {}).get('total') == 105 and (r.get('from_price') or {}).get('providers_count', 0) >= 1, r)
    step('the best match is a public provider id, not the account id', best.get('provider_id') and best.get('provider_id') != lab_id, best)
    text = str(r.body)
    step('no phone, e-mail or account id appears in the answer', lab_id not in text and p['email'] not in text and "'phone'" not in text and "'account_id'" not in text, text[:300])
    pid = next((c['provider_id'] for c in r.get('compare') or [] if c.get('total') == 105), best.get('provider_id'))
    qid = r.get('quote_id')
    r = pat.get(f'/ordering/windows?provider_id={pid}&mode=home')
    rows = r.get('windows') or []
    step('home windows start with ASAP and list timed windows', r.ok and rows and rows[0].get('asap') is True and len(rows) > 3, r)
    r = pat.post('/ordering/quote', {'service_kind': 'lab', 'items': ['no-such-test'], 'context': ctx})
    step('an unknown test is refused with a code', r.status == 400 and 'unknown_catalog_item' in str(r.body), r)

    journey('ordering engine: booking, ownership and the locked price')
    other = Client(j_accounts.app_signup(label='ordering-stranger')['token'], 'patient')
    r = other.post('/ordering/bookings', {'quote_id': qid, 'selections': {'home': {'provider_id': pid, 'window': {'asap': True}}}, 'payment_method': 'card'})
    step("another patient cannot use the first patient's quote (404)", r.status == 404, r)
    r = pat.post('/ordering/bookings', {'quote_id': qid, 'selections': {'home': {'provider_id': pid, 'window': {'asap': True}}}, 'payment_method': 'cash'})
    step('cash is refused for a home visit', r.status == 400 and 'cash_not_allowed_for_home' in str(r.body), r)
    r = pat.post('/ordering/bookings', {'quote_id': qid, 'selections': {'home': {'provider_id': pid, 'window': {'asap': True}}}, 'payment_method': 'card'})
    bk = (r.get('bookings') or [{}])[0]
    step('the group is created: one booking at 105, payment pending', r.status == 201 and bk.get('total') == 105 and (r.get('payment') or {}).get('status') == 'pending', r)
    r2 = pat.post('/ordering/bookings', {'quote_id': qid, 'selections': {'home': {'provider_id': pid, 'window': {'asap': True}}}, 'payment_method': 'card'})
    step('the same quote cannot be booked twice (409)', r2.status == 409, r2)
    r = lab.put('/provider/ordering/items', {'service_kind': 'lab', 'catalog_id': test_id, 'prices': {'home': 400, 'facility': 55}})
    step('the lab raises its price afterwards', r.ok, r)
    r = pat.get(f"/labs/bookings/{bk.get('id')}")
    step('the booking keeps the locked total of 105', r.ok and r.get('total') == 105, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
