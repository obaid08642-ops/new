"""Journey (QA MP-02): a provider card on the providers map leads to the profile, and from there to a paid booking.
  - GET /providers/map?type=doctor (anonymous) lists the approved doctor by the profile id the card links to.
  - The card's id opens the public profile (GET /care/doctors/:id) with the same name.
  - Free clinic slots are read from that id, the slot is held, the appointment is created and paid by card.
  - MongoDB: the appointment row carries the card's doctor id, the patient and paid status.
The card-to-profile-to-book steps use the card id, not a search by specialty (book_paid in j_consultation searches)."""
import datetime
import json
import subprocess
import uuid

from lib import Client, journey, step
from j_nursing import fake_pay

HOME = {'lat': 24.7136, 'lng': 46.6753}


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def items(r):
    return r.body if isinstance(r.body, list) else r.items()


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation
    from lib import summary
    admin, _ = j_admin.login()
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    Client(d['token'], 'doctor').post('/provider-onboarding/step2', {'location': HOME, 'city': 'الرياض'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doc = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, ('clinic',))
    profile_id = doc.get('/provider-onboarding/my-profile').get('id')
    pat = Client(j_accounts.app_signup(label='map-book')['token'], 'patient')
    anon = Client(None, 'anon')
    patient_id = pat.get('/auth/me').get('id')

    journey('providers map MP-02: the card leads to the profile')
    r = anon.get('/providers/map?type=doctor')
    card = next((x for x in items(r) if x.get('id') == profile_id), None)
    step('the approved doctor is a card on the map (id = profile id)', r.ok and card is not None, f'{r.status} {len(items(r))} cards')
    if not card:
        summary()
        return
    name = card.get('name') or card.get('name_ar') or card.get('name_en')
    r = anon.get(f'/care/doctors/{profile_id}')
    step('the card opens the public profile', r.ok and r.get('id') == profile_id, r)
    step('the profile shows the same name as the card', bool(name) and name in json.dumps(r.body, ensure_ascii=False), name)

    journey('providers map MP-02: the profile books a paid clinic visit')
    day = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    r = pat.get(f'/care/doctors/{profile_id}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the profile lists free clinic slots tomorrow', r.ok and free, r.status)
    if not free:
        summary()
        return
    s0 = free[0]
    slot = s0.get('start') or s0.get('slot_start') or s0.get('time') if isinstance(s0, dict) else s0
    r = pat.post('/slot-locks/reserve', {'provider_id': profile_id, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    step('the slot is held', r.ok and lock, r)
    body = {'doctor_id': profile_id, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': lock}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'map-book-{uuid.uuid4()}'})
    aid = r.get('id')
    step('the booking is created for the card\'s doctor', r.ok and aid, r)
    if not aid:
        summary()
        return
    row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, doctor_id: 1, patient_id: 1, status: 1}})')
    step('MongoDB: the appointment is for the card\'s doctor and this patient', bool(row) and row.get('doctor_id') == profile_id and row.get('patient_id') == patient_id, row)
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'map-pay-{aid}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the checkout is created', r.ok and txn.get('id'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = pat.post(f"/payments/verify/{txn['id']}", {})
        step('payment verified', r.ok and r.get('status') == 'paid', r)
    row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, payment_status: 1}})')
    step('MongoDB: the visit is paid', bool(row) and row.get('payment_status') == 'paid', row)
    summary()


if __name__ == '__main__':
    main()
