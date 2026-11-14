"""Journey PT-03: a guardian adds a minor dependant and books a consultation for them.
  The dependant has no account (Patient Terms: users are 18 or over; Privacy Policy: a minor's data is managed from the guardian's
  account). POST /family/dependants stores the minor with the guardian's consent; the guardian books with family_member_id: the visit
  stays on the guardian's account (they book and pay) and records who it is for. Nobody else can list, use or remove the dependant.
  Stack: backend :8002.
"""
import datetime
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation
    from j_nursing import fake_pay
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin)

    guardian = Client(j_accounts.app_signup(label='guardian')['token'], 'patient')
    stranger = Client(j_accounts.app_signup(label='guardian-stranger')['token'], 'patient')
    guardian_id = guardian.get('/auth/me').get('id')

    journey('PT-03: the guardian adds a minor')
    born = (datetime.date.today() - datetime.timedelta(days=365 * 7 + 30)).isoformat()
    body = {'name': 'سارة', 'birth_date': born, 'relation_code': 'child', 'gender': 'female', 'guardian_consent': True}
    r = guardian.post('/family/dependants', {**body, 'guardian_consent': False})
    step('without the guardian\'s consent nothing is created', r.status == 400, r)
    r = guardian.post('/family/dependants', {**body, 'birth_date': (datetime.date.today() + datetime.timedelta(days=2)).isoformat()})
    step('a birth date in the future is refused', r.status == 400, r)
    r = guardian.post('/family/dependants', body)
    dep = r.get('id')
    step('the guardian adds the dependant (a 7-year-old)', r.ok and dep and r.get('is_minor') is True and r.get('guardian_consent_at'), r)
    r = guardian.get('/family/dependants')
    step('the guardian lists the dependant', r.ok and dep in [x.get('id') for x in r.items()], r)
    r = stranger.get('/family/dependants')
    step('another account lists nothing of theirs', r.ok and dep not in [x.get('id') for x in r.items()], r)

    journey('PT-03: the guardian books a consultation for the minor')
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    day = j_consultation.tomorrow().isoformat()
    r = guardian.get(f'/care/doctors/{prof_id}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the doctor has free clinic slots tomorrow', r.ok and free, r)
    if not free:
        return
    s0 = free[0]
    slot = (s0.get('start') or s0.get('slot_start') or s0.get('time')) if isinstance(s0, dict) else s0
    appt = {'doctor_id': prof_id, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'family_member_id': dep}
    r = stranger.post('/care/appointments', appt, headers={'Idempotency-Key': f'appt-dep-stranger-{uuid.uuid4()}'})
    step('another account cannot book for the dependant', r.status == 404, r)
    lock = guardian.post('/slot-locks/reserve', {'provider_id': prof_id, 'booking_kind': 'consultation', 'slot_start': slot}).get('id')
    r = guardian.post('/care/appointments', {**appt, 'slot_lock_id': lock}, headers={'Idempotency-Key': f'appt-dep-{uuid.uuid4()}'})
    aid = r.get('id')
    step('the guardian books it', r.ok and aid, r)
    if not aid:
        return
    a = guardian.get(f'/care/appointments/{aid}')
    step('the visit stays on the guardian\'s account and records who it is for', a.get('patient_id') == guardian_id and a.get('family_member_id') == dep, a)

    journey('PT-03: the guardian pays')
    r = guardian.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the guardian gets an https checkout link', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = guardian.post(f"/payments/verify/{txn['id']}", {})
        step('the payment is verified', r.ok and r.get('status') == 'paid', r)
    r = stranger.get(f'/care/appointments/{aid}')
    step('another account cannot read the booking', r.status in (403, 404), r)

    journey('PT-03: the guardian removes the dependant')
    r = stranger.delete(f'/family/dependants/{dep}')
    step('another account cannot remove it', r.status == 404, r)
    r = guardian.delete(f'/family/dependants/{dep}')
    step('the guardian removes it', r.ok, r)
    r = guardian.get('/family/dependants')
    step('it is no longer listed', r.ok and dep not in [x.get('id') for x in r.items()], r)
    r = guardian.post('/care/appointments', {**appt, 'slot_start': slot}, headers={'Idempotency-Key': f'appt-dep-gone-{uuid.uuid4()}'})
    step('a removed dependant cannot be booked for', r.status == 404, r)
    a = guardian.get(f'/care/appointments/{aid}')
    step('the visit already booked keeps its record', a.ok and a.get('family_member_id') == dep, a)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
