"""Journey (QA D-10, refunds of a paid consultation), two cases on one doctor and two paid visits by card:
  - a doctor registers, is approved, and publishes clinic hours (the same setup as j_qa_map_book.py);
  - case A, the patient cancels the paid visit: the cancellation refunds it by the policy percentage (the refund is in the
    platform ledger and the transaction is refunded). The admin's full refund of the same visit is then REFUSED, because no
    confirmed payment is left (no_confirmed_payment_to_refund) or it is fully refunded already: no double refund;
  - case B, the patient does NOT cancel: the admin refunds the visit in full through the orders console; the refund is
    accepted (2xx), the transaction is refunded, the ledger holds the paid amount, and a second full refund is refused.
Money moves only on the local test gateway and the local test database. A missing route or slot is a FAIL, never a PASS."""
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


def book_and_pay(pat, profile_id, slot, label):
    """Books the slot for a card payment and pays it on the fake gateway. Returns (appointment id, transaction) or (None, None)."""
    r = pat.post('/slot-locks/reserve', {'provider_id': profile_id, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    step(f'{label}: the slot is held', r.ok and bool(lock), r)
    body = {'doctor_id': profile_id, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': lock}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'refund-book-{uuid.uuid4()}'})
    aid = r.get('id')
    step(f'{label}: the visit is booked for the card payment', r.ok and bool(aid), r)
    if not aid:
        return None, None
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'refund-pay-{aid}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step(f'{label}: the checkout is created', r.ok and bool(txn.get('id')), r)
    if not txn.get('gateway_intent_id'):
        return None, None
    fake_pay(txn['gateway_intent_id'])
    r = pat.post(f"/payments/verify/{txn['id']}", {})
    step(f'{label}: the payment is verified as paid', r.ok and r.get('status') == 'paid', r)
    row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, payment_status: 1}})')
    step(f'{label}: MongoDB: the visit is paid', bool(row) and row.get('payment_status') == 'paid', row)
    return aid, txn


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

    journey('refund D-10: the patient lists two free clinic slots for tomorrow')
    acct = j_accounts.app_signup(label='refund-consult')
    pat = Client(acct['token'], 'patient')
    patient_id = pat.get('/auth/me').get('id')
    day = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    r = pat.get(f'/care/doctors/{profile_id}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the doctor lists at least two free clinic slots tomorrow (one per case)', r.ok and len(free) >= 2, r.status)
    if len(free) < 2:
        summary()
        return
    slot_of = lambda s: (s.get('start') or s.get('slot_start') or s.get('time')) if isinstance(s, dict) else s

    journey('refund D-10 case A: the patient cancels the paid visit; the cancellation refunds it')
    aid, txn = book_and_pay(pat, profile_id, slot_of(free[0]), 'case A')
    if not aid:
        summary()
        return
    prev = pat.get(f'/care/appointments/{aid}/refund/preview')
    pct = prev.get('refund_percentage')
    step('the cancellation preview states a refund percentage (GET /care/appointments/:id/refund/preview)', prev.ok and pct is not None, prev)
    r = pat.req('PATCH', f'/care/appointments/{aid}/cancel', {'reason': 'QA cancel probe D-10'})
    step('the patient cancels the paid visit (PATCH /care/appointments/:id/cancel)', r.ok, r)
    row = mongo_json(f'db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, status: 1, refund_percentage: 1}})')
    step('MongoDB: the visit is cancelled with the refund percentage', bool(row) and str(row.get('status')).lower() in ('cancelled', 'canceled') and row.get('refund_percentage') == pct, row)
    paid_tx = mongo_json(f'db.transactions.findOne({{id: "{txn["id"]}"}}, {{_id: 0, amount: 1}})')
    paid_amount = float((paid_tx or {}).get('amount') or 0)
    expected_refund = round(paid_amount * float(pct or 0) / 100, 2)
    led = mongo_json(f'db.platformledgerentries.findOne({{type: "refund", order_id: "{aid}"}}, {{_id: 0, amount: 1}})')
    step('MongoDB: the cancellation put the refund in the platform ledger', bool(led) and float(led.get('amount') or 0) > 0, led)
    step(f'the cancellation refund is the cancellation percentage of the payment (expected {expected_refund})', bool(led) and round(float(led.get('amount') or 0), 2) == expected_refund, led)
    tx = mongo_json(f'db.transactions.findOne({{id: "{txn["id"]}"}}, {{_id: 0, status: 1}})')
    step('MongoDB: the transaction is refunded by the cancellation', bool(tx) and str(tx.get('status')).lower() in ('refunded', 'partially_refunded'), tx)

    journey('refund D-10 case A: the admin cannot refund the same visit again (no double refund)')
    r = admin.post(f'/admin/admin/orders/consultation/{aid}/refund', {'mode': 'full', 'reason': 'QA refund probe D-10 after cancel'})
    # After the cancellation refund the confirmed payments total is zero, so the server refuses (no_confirmed_payment_to_refund).
    step('the admin full refund after the patient cancel is refused (no confirmed payment left, or already fully refunded)', not r.ok and r.status == 400 and any(k in str(r.body) for k in ('no_confirmed_payment_to_refund', 'fully_refunded')), r)
    led_after = mongo_json(f'db.platformledgerentries.find({{type: "refund", order_id: "{aid}"}}, {{_id: 0, amount: 1}}).toArray()')
    step('MongoDB: still one refund in the ledger for this visit (no second one written)', isinstance(led_after, list) and len(led_after) == 1, led_after)

    journey('refund D-10 case B: the patient does not cancel; the admin refunds the visit in full')
    aid2, txn2 = book_and_pay(pat, profile_id, slot_of(free[1]), 'case B')
    if not aid2:
        summary()
        return
    paid2 = mongo_json(f'db.transactions.findOne({{id: "{txn2["id"]}"}}, {{_id: 0, amount: 1}})')
    paid2_amount = float((paid2 or {}).get('amount') or 0)
    r = admin.post(f'/admin/admin/orders/consultation/{aid2}/refund', {'mode': 'full', 'reason': 'QA refund probe D-10 case B'})
    step('the admin refunds the full amount of a visit the patient did not cancel (POST /admin/admin/orders/consultation/:id/refund)', r.ok, r)
    tx2 = mongo_json(f'db.transactions.findOne({{id: "{txn2["id"]}"}}, {{_id: 0, status: 1, refunded_amount: 1, amount: 1}})')
    step('MongoDB: the transaction is refunded', bool(tx2) and str(tx2.get('status')).lower() in ('refunded', 'partially_refunded'), tx2)
    led2 = mongo_json(f'db.platformledgerentries.findOne({{type: "refund", order_id: "{aid2}"}}, {{_id: 0, amount: 1}})')
    step(f'the refund in the platform ledger is the paid amount (expected {paid2_amount})', bool(led2) and round(float(led2.get('amount') or 0), 2) == round(paid2_amount, 2), led2)
    r = admin.post(f'/admin/admin/orders/consultation/{aid2}/refund', {'mode': 'full', 'reason': 'QA refund probe D-10 case B again'})
    step('a second full refund of the same visit is refused', not r.ok and r.status == 400 and any(k in str(r.body) for k in ('no_confirmed_payment_to_refund', 'fully_refunded')), r)
    summary()


if __name__ == '__main__':
    main()
