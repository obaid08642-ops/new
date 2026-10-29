"""Journey (QA D-10, penalty window): a paid clinic visit starts within the free-cancellation window (under 2 hours), the patient
cancels, and the cancellation states the late-cancel refund (50 % by the default policy). Then the admin refunds the visit in full
through the orders console. Records what the console does with the cancellation's percentage.
  - a doctor opens clinic hours for today, starting about 20 minutes from now (the server needs 15 minutes' notice);
  - the patient books the first slot in that window and pays by card on the fake gateway; the payment is verified;
  - the patient previews and cancels: the preview must state the late percentage (not 100);
  - the admin refunds in full: the ledger amount is compared with the cancellation percentage of the payment.
Money moves only on the local test gateway and the local test database. A missing route is a FAIL, never a PASS."""
import datetime
import json
import subprocess
import urllib.request
import uuid

from lib import Client, journey, step, summary


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def fake_pay(invoice, status='paid'):
    urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:9100/__pay/{invoice}?status={status}', method='POST')).read()


def pending_ids(admin):
    return {x.get('id') for x in admin.get('/admin/admin/providers/provider-deltas').items() if x.get('status') == 'pending'}


def main():
    import j_admin, j_onboarding, j_accounts
    admin, _ = j_admin.login()
    HOME = {'lat': 24.7136, 'lng': 46.6753}

    journey('refund penalty D-10: a doctor registers, is approved, and opens clinic hours for today, starting in about 20 minutes')
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    Client(d['token'], 'doctor').post('/provider-onboarding/step2', {'location': HOME, 'city': 'الرياض'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doc = Client(d['token'], 'doctor')
    profile_id = doc.get('/provider-onboarding/my-profile').get('id')
    now = datetime.datetime.now(datetime.timezone.utc)
    start = (now + datetime.timedelta(minutes=20)).replace(second=0, microsecond=0)
    start = start + datetime.timedelta(minutes=(15 - start.minute % 15) % 15)
    end = start + datetime.timedelta(minutes=90)
    if end.date() != now.date():
        step('the window is still today (UTC)', False, f'{start.isoformat()} to {end.isoformat()}')
        summary()
        return
    dow = (now.weekday() + 1) % 7
    before = pending_ids(admin)
    r = doc.post('/provider/schedule-slots', {'day_of_week': dow, 'start_time': start.strftime('%H:%M'), 'end_time': end.strftime('%H:%M'), 'service_type': 'clinic'})
    step('the doctor opens clinic hours for the window today', r.ok, r)
    new = [x for x in admin.get('/admin/admin/providers/provider-deltas').items() if x.get('status') == 'pending' and x.get('id') not in before]
    for x in new:
        a = admin.post(f"/admin/admin/providers/provider-deltas/{x['id']}/approve", {})
        step('the admin approves the hours', a.ok, a)

    journey('refund penalty D-10: the patient books the visit in the window, pays by card, and cancels inside the 2-hour window')
    acct = j_accounts.app_signup(label='refund-penalty')
    pat = Client(acct['token'], 'patient')
    patient_id = pat.get('/auth/me').get('id')
    day = now.date().isoformat()
    r = pat.get(f'/care/doctors/{profile_id}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the doctor lists a free clinic slot inside the window', r.ok and bool(free), r.status)
    if not free:
        summary()
        return
    s0 = free[0]
    slot = s0.get('start') or s0.get('slot_start') or s0.get('time') if isinstance(s0, dict) else s0
    lock = pat.post('/slot-locks/reserve', {'provider_id': profile_id, 'booking_kind': 'consultation', 'slot_start': slot}).get('id')
    step('the slot is held', bool(lock), slot)
    r = pat.post('/care/appointments', {'doctor_id': profile_id, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': lock},
                 headers={'Idempotency-Key': f'penalty-book-{uuid.uuid4()}'})
    aid = r.get('id')
    step('the visit is booked for the card payment', r.ok and bool(aid), r)
    if not aid:
        summary()
        return
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'penalty-pay-{aid}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the checkout is created', r.ok and bool(txn.get('id')), r)
    if not txn.get('gateway_intent_id'):
        summary()
        return
    fake_pay(txn['gateway_intent_id'])
    r = pat.post(f"/payments/verify/{txn['id']}", {})
    step('the payment is verified as paid', r.ok and r.get('status') == 'paid', r)

    prev = pat.get(f'/care/appointments/{aid}/refund/preview')
    pct = prev.get('refund_percentage')
    step('the preview inside the 2-hour window states the late refund (not 100 %)', prev.ok and pct is not None and pct < 100, prev)
    r = pat.req('PATCH', f'/care/appointments/{aid}/cancel', {'reason': 'QA penalty probe D-10'})
    step('the patient cancels inside the window (PATCH /care/appointments/:id/cancel)', r.ok, r)
    row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, status: 1, refund_percentage: 1, patient_id: 1}})')
    step('MongoDB: the visit is cancelled with the late percentage', bool(row) and row.get('patient_id') == patient_id and row.get('refund_percentage') == pct, row)
    paid = float((mongo_json(f'db.transactions.findOne({{id: "{txn["id"]}"}}, {{_id: 0, amount: 1}})') or {}).get('amount') or 0)
    expected = round(paid * float(pct or 0) / 100, 2)

    journey('refund penalty D-10: the admin refunds in full; the console is compared with the cancellation percentage')
    r = admin.post(f'/admin/admin/orders/consultation/{aid}/refund', {'mode': 'full', 'reason': 'QA penalty probe D-10'})
    step('the admin refunds the full amount (POST /admin/admin/orders/consultation/:id/refund)', r.ok, r)
    led = mongo_json(f'db.platformledgerentries.findOne({{type: "refund", order_id: "{aid}"}}, {{_id: 0, amount: 1}})') or {}
    refunded = round(float(led.get('amount') or 0), 2)
    step(f'the refund equals the late-cancel share of the payment (expected {expected} at {pct} %, the console refunded {refunded})',
         refunded == expected, {'paid': paid, 'pct': pct, 'refunded': refunded})
    summary()


if __name__ == '__main__':
    main()
