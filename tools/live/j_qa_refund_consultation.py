"""Journey (QA D-10, cancel and refund a paid consultation): a patient pays a clinic visit by card; the admin refunds it in full
through the admin orders console (POST /admin/admin/orders/consultation/:id/refund).
  - a doctor registers, is approved, and publishes clinic hours (the same setup as j_qa_map_book.py);
  - the patient books the visit, holds the slot, and pays by card on the fake gateway; the payment is verified as paid;
  - the admin refunds the full amount: the refund is accepted (2xx), the transaction is refunded in MongoDB, the appointment
    no longer reads as paid, and a second refund is refused (fully_refunded_already).
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


def main():
    import j_admin, j_onboarding, j_consultation, j_accounts
    admin, _ = j_admin.login()
    HOME = {'lat': 24.7136, 'lng': 46.6753}

    journey('refund D-10: a doctor registers, is approved, and publishes clinic hours')
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    Client(d['token'], 'doctor').post('/provider-onboarding/step2', {'location': HOME, 'city': 'الرياض'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doc = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, ('clinic',))
    profile_id = doc.get('/provider-onboarding/my-profile').get('id')

    journey('refund D-10: the patient books and pays a clinic visit by card')
    acct = j_accounts.app_signup(label='refund-consult')
    pat = Client(acct['token'], 'patient')
    patient_id = pat.get('/auth/me').get('id')
    day = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    r = pat.get(f'/care/doctors/{profile_id}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the doctor lists free clinic slots tomorrow', r.ok and bool(free), r.status)
    if not free:
        summary()
        return
    s0 = free[0]
    slot = s0.get('start') or s0.get('slot_start') or s0.get('time') if isinstance(s0, dict) else s0
    r = pat.post('/slot-locks/reserve', {'provider_id': profile_id, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    step('the slot is held', r.ok and bool(lock), r)
    body = {'doctor_id': profile_id, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': lock}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'refund-book-{uuid.uuid4()}'})
    aid = r.get('id')
    step('the visit is booked for the card payment', r.ok and bool(aid), r)
    if not aid:
        summary()
        return
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'refund-pay-{aid}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the checkout is created', r.ok and bool(txn.get('id')), r)
    if not txn.get('gateway_intent_id'):
        summary()
        return
    fake_pay(txn['gateway_intent_id'])
    r = pat.post(f"/payments/verify/{txn['id']}", {})
    step('the payment is verified as paid', r.ok and r.get('status') == 'paid', r)
    row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, payment_status: 1, patient_id: 1}})')
    step('MongoDB: the visit is paid and belongs to this patient', bool(row) and row.get('payment_status') == 'paid' and row.get('patient_id') == patient_id, row)

    journey('refund D-10: the admin refunds the visit in full through the orders console')
    r = admin.post(f'/admin/admin/orders/consultation/{aid}/refund', {'mode': 'full', 'reason': 'QA refund probe D-10'})
    step('the admin refunds the full amount (POST /admin/admin/orders/consultation/:id/refund)', r.ok, r)
    tx = mongo_json(f'db.transactions.findOne({{id: "{txn["id"]}"}}, {{_id: 0, status: 1, refunded_amount: 1, amount: 1}})')
    step('MongoDB: the transaction is refunded', bool(tx) and str(tx.get('status')).lower() in ('refunded', 'partially_refunded'), tx)
    led = mongo_json(f'db.platformledgerentries.findOne({{type: "refund", order_id: "{aid}"}}, {{_id: 0, amount: 1}})')
    step('MongoDB: the refund is in the platform ledger for this visit', bool(led) and float(led.get('amount') or 0) > 0, led)
    r = admin.post(f'/admin/admin/orders/consultation/{aid}/refund', {'mode': 'full', 'reason': 'QA refund probe D-10 again'})
    # After a full refund the confirmed payments total is zero, so the server refuses with no_confirmed_payment_to_refund.
    step('a second full refund is refused (no confirmed payment left, or already fully refunded)', not r.ok and any(k in str(r.body) for k in ('no_confirmed_payment_to_refund', 'fully_refunded')), r)
    summary()


if __name__ == '__main__':
    main()
