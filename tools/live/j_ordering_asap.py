"""Journey: ASAP home visit broadcast (ordering model M4; ORDERING_UX_SPEC step 1).
  A lab declares a home price (M1, manual accept); a patient asks POST /ordering/asap at the lab's door; the lab sees the
  broadcast (GET /provider/ordering/broadcasts) and accepts (POST .../accept); the patient reads the result and a booking exists.
  Checked on the real stack: one open ASAP per patient (409), another patient cannot read it (404), the second accept is told it is taken (409), and no contact data is in the answers.
  The photo-order half needs a stored upload and is covered by backend/acceptance/ordering-m4."""
import uuid

from lib import Client, journey, step

LAT, LNG = 24.7, 46.7


def run():
    import j_admin, j_accounts, j_onboarding, j_lab_preparation_langs as prep
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    r, test_id = prep.admin_test(admin, tag, 'ASAP CBC', {})
    step('the admin publishes a test', r.ok and test_id, r)

    journey('ASAP: a lab declares a home price and waits for broadcasts')
    p = j_onboarding.register_type('lab', {'test_categories': [test_id]})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    lab_id = lab.get('/provider/me').get('account', 'id')
    r = lab.put('/provider/ordering/settings', {'modes': ['home'], 'home_fee': 15, 'home_radius_km': 20, 'auto_accept': False, 'walk_in': False})
    step('the lab declares home visits, manual acceptance', r.ok, r)
    r = lab.put('/provider/ordering/items', {'service_kind': 'lab', 'catalog_id': test_id, 'prices': {'home': 70}})
    step('the lab prices the test for home', r.ok, r)

    journey('ASAP: the patient broadcasts, the lab accepts')
    pat = Client(j_accounts.app_signup(label='asap-patient')['token'], 'patient')
    stranger = Client(j_accounts.app_signup(label='asap-stranger')['token'], 'patient')
    r = pat.post('/ordering/asap', {'service_kind': 'lab', 'items': [test_id], 'lat': LAT, 'lng': LNG, 'payer': 'cash'})
    bid = r.get('id')
    step('the broadcast starts at stage 1 and reaches the lab', r.status == 201 and bid and r.get('status') == 'broadcasting' and r.get('providers_notified', 0) >= 1, r)
    step('no contact data or account id in the answer', lab_id not in str(r.body) and p['email'] not in str(r.body), str(r.body)[:200])
    r2 = pat.post('/ordering/asap', {'service_kind': 'lab', 'items': [test_id], 'lat': LAT, 'lng': LNG, 'payer': 'cash'})
    step('a second open ASAP of the same patient is refused (409 asap_open)', r2.status == 409 and 'asap_open' in str(r2.body), r2)
    r = stranger.get(f'/ordering/asap/{bid}')
    step("another patient cannot read it (404)", r.status == 404, r)
    r = lab.get('/provider/ordering/broadcasts')
    seen = [b.get('id') for b in (r.get('broadcasts') or [])]
    step('the lab lists the broadcast it was reached by', r.ok and bid in seen, r)
    r = lab.post(f'/provider/ordering/broadcasts/{bid}/accept', {})
    step('the lab accepts and gets the booking id', r.ok and r.get('booking_id'), r)
    booking = r.get('booking_id')
    r = lab.post(f'/provider/ordering/broadcasts/{bid}/accept', {})
    step('a second accept is told it is taken (409)', r.status == 409 and 'broadcast_already_taken' in str(r.body), r)
    r = pat.get(f'/ordering/asap/{bid}')
    step('the patient sees it accepted with the booking', r.ok and r.get('status') == 'accepted' and r.get('booking_id') == booking, r)
    r = pat.get(f'/labs/bookings/{booking}')
    step('the booking is the locked price: 70 + 15 home fee', r.ok and r.get('total') == 85, r)
    r = pat.post(f'/ordering/asap/{bid}/cancel', {})
    step('an accepted broadcast cannot be cancelled (409)', r.status == 409, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
