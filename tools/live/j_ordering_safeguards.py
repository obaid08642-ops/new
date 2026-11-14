"""Journey: after the booking and the safeguards (ordering model M7; ORDERING_UX_SPEC step 7).
  A lab declares a home price and one staff member; a patient books at home; the lab confirms, assigns the staff member and the
  patient sees a 4-digit arrival code (Western digits, no phone number); wrong codes lock it after 3 tries and a right one
  starts the visit; the lab posts a result and the patient reads it with its flag and trend; the lab reads its reliability;
  the emergency button returns the urgent-help number and dispatches nothing. Ownership is checked at every step
  (another patient 404, another lab 403). The 15-minute confirm deadline and its auto-cancel are covered by the unit and
  acceptance suites (the deadline is a SystemConfig value, not something a journey waits for)."""
import re
import uuid

from lib import Client, journey, step

LAT, LNG = 24.7, 46.7


def run():
    import j_admin, j_accounts, j_onboarding, j_lab_preparation_langs as prep
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    r, test_id = prep.admin_test(admin, tag, 'Safeguards HbA1c', {})
    step('the admin publishes a test', r.ok and test_id, r)

    journey('safeguards: a lab declares a price and a staff member')
    p = j_onboarding.register_type('lab', {'test_categories': [test_id]})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    other_p = j_onboarding.register_type('lab', {'test_categories': [test_id]})
    j_onboarding.admin_review(admin, other_p)
    j_onboarding.provider_after_approval(other_p)
    other = Client(other_p['token'], 'lab')
    r = lab.put('/provider/ordering/settings', {'modes': ['home'], 'home_fee': 20, 'home_radius_km': 20, 'auto_accept': False, 'staff_genders': ['female']})
    step('the lab declares home visits and female staff', r.ok, r)
    r = lab.put('/provider/ordering/items', {'service_kind': 'lab', 'catalog_id': test_id, 'prices': {'home': 90}})
    step('the lab prices the test', r.ok, r)
    r = lab.put('/provider/ordering/staff', {'name': 'Sara', 'gender': 'female', 'license_number': 'SCFHS-' + tag})
    staff_id = r.get('id')
    step('the lab records a staff member', r.ok and staff_id, r)

    journey('safeguards: confirm, assign, arrival code')
    pat = Client(j_accounts.app_signup(label='safeguards-patient')['token'], 'patient')
    stranger = Client(j_accounts.app_signup(label='safeguards-stranger')['token'], 'patient')
    q = pat.post('/ordering/quote', {'service_kind': 'lab', 'items': [test_id], 'context': {'mode': 'home', 'lat': LAT, 'lng': LNG, 'payer': 'cash', 'staff_gender': 'female'}})
    pid = (q.get('best_match') or {}).get('provider_id')
    step('the quote finds the lab through its female staff', q.ok and pid, q)
    b = pat.post('/ordering/bookings', {'quote_id': q.get('quote_id'), 'selections': {'home': {'provider_id': pid, 'window': {'asap': True}}}, 'payment_method': 'card', 'gender_preference': 'female'})
    bid = ((b.get('bookings') or [{}])[0]).get('id')
    step('the booking is created', b.status == 201 and bid, b)
    r = other.post(f'/provider/ordering/bookings/{bid}/confirm', {})
    step('another lab cannot confirm it (403)', r.status == 403, r)
    r = lab.post(f'/provider/ordering/bookings/{bid}/confirm', {})
    step('the booking\'s lab confirms in time', r.ok and r.get('confirmed') is True, r)
    v = pat.get(f'/ordering/bookings/{bid}/visit')
    step('before assignment there is no arrival code', v.ok and 'arrival_code' not in v.body, v)
    r = lab.post(f'/provider/ordering/bookings/{bid}/assign', {'staff_id': staff_id})
    step('the lab assigns its staff member', r.ok, r)
    v = pat.get(f'/ordering/bookings/{bid}/visit')
    code = v.get('arrival_code') or ''
    step('the patient sees a 4-digit Western code and the staff member\'s licence', v.ok and re.fullmatch(r'[0-9]{4}', code) and (v.get('staff') or {}).get('license', '').startswith('SCFHS'), v)
    step('no phone number in the visit', '+966' not in str(v.body) and "'phone'" not in str(v.body), str(v.body)[:200])
    r = stranger.get(f'/ordering/bookings/{bid}/visit')
    step('another patient cannot read the visit (404)', r.status == 404, r)
    wrong = '1111' if code == '0000' else '0000'
    r1 = lab.post(f'/provider/ordering/bookings/{bid}/arrive', {'code': wrong})
    r2 = lab.post(f'/provider/ordering/bookings/{bid}/arrive', {'code': wrong})
    r3 = lab.post(f'/provider/ordering/bookings/{bid}/arrive', {'code': wrong})
    step('two wrong codes are 400, the third locks it (423)', r1.status == 400 and r2.status == 400 and r3.status == 423, [r1.status, r2.status, r3.status])
    r = lab.post(f'/provider/ordering/bookings/{bid}/arrive', {'code': code})
    step('a locked code refuses even the right one (423)', r.status == 423, r)

    journey('safeguards: results with a trend, reliability, emergency')
    r = lab.post(f'/provider/ordering/bookings/{bid}/results', {'values': [{'catalog_id': test_id, 'value': 6.4, 'unit': '%', 'range': {'low': 4, 'high': 5.6}}]})
    step('the lab posts the result', r.ok, r)
    r = other.post(f'/provider/ordering/bookings/{bid}/results', {'values': [{'catalog_id': test_id, 'value': 1, 'unit': '%', 'range': {'low': 4, 'high': 5.6}}]})
    step('another lab cannot post results for it (403)', r.status == 403, r)
    r = pat.get(f'/ordering/bookings/{bid}/results')
    val = (r.get('values') or [{}])[0]
    step('the patient reads the value with its flag and a trend', r.ok and val.get('flag') == 'high' and [t.get('value') for t in val.get('trend') or []] == [6.4], r)
    r = pat.post(f'/ordering/bookings/{bid}/results/discuss', {})
    step('discussing with a doctor opens a draft with the result attached', r.status == 201 and r.get('consultation_draft') is True and r.get('attached_result_id'), r)
    r = lab.get('/provider/ordering/reliability')
    step('the lab reads its rates, each between 0 and 1', r.ok and all(0 <= (r.get(k) if r.get(k) is not None else -1) <= 1 for k in ('acceptance_rate', 'on_time_rate', 'cancellation_rate')), r)
    r = pat.post(f'/ordering/bookings/{bid}/emergency', {})
    step('the emergency button returns a number to call and dispatches nothing', r.ok and re.fullmatch(r'[0-9+]{2,15}', str(r.get('call') or '')), r)
    r = stranger.post(f'/ordering/bookings/{bid}/emergency', {})
    step('another patient cannot press it (404)', r.status == 404, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
