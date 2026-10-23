"""Journey: the payment provider's webhook (needs-review 551, patient-web /pharmacy/payment "provider not exercised").
  The hosted checkout, the return page and verify were already driven against the provider double (tools/live/fake_moyasar.py)
  on a MongoDB replica set; the webhook never was. Here the double completes a consultation payment and the provider's
  webhook (Moyasar documents no signature header: its body carries `secret_token`, the secret set on the webhook) tells the
  backend, with no patient token and no verify call.
  Checked: a body with a wrong or missing secret is refused (400) and changes nothing; the right secret marks the payment
  and the booking paid; a redelivery changes nothing; an unknown payment id is answered without error and changes nothing."""
import os
import uuid

from lib import Client, journey, step

SECRET = os.environ.get('MOYASAR_WEBHOOK_SECRET', 'live-journeys-webhook-token')


def book_unpaid(pat, doctor):
    """The first half of j_consultation.book_paid: a card consultation with a held slot, not yet paid."""
    from j_consultation import tomorrow
    did = doctor.get('/provider-onboarding/my-profile').get('id') or doctor.get('/provider/me').get('account', 'id')
    day = tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the doctor has a free clinic slot tomorrow', r.ok and free, r)
    if not free:
        return None
    s0 = free[0]
    slot = (s0.get('start') or s0.get('slot_start') or s0.get('time')) if isinstance(s0, dict) else s0
    r = pat.post('/slot-locks/reserve', {'provider_id': did, 'booking_kind': 'consultation', 'slot_start': slot})
    body = {'doctor_id': did, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': r.get('id')}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'appointment-create-{did}-{slot}-{uuid.uuid4()}'})
    step('the appointment is created', r.ok and r.get('id'), r)
    return r.get('id')


def webhook(anon, gateway_id, token):
    body = {'id': f'evt_{uuid.uuid4().hex[:12]}', 'type': 'payment_paid', 'data': {'id': str(uuid.uuid4()), 'invoice_id': gateway_id, 'status': 'paid'}}  # a payment object: our id is its invoice_id
    if token is not None:
        body['secret_token'] = token
    return anon.post('/payments/webhook/moyasar', body)


def run():
    import j_accounts, j_concurrency
    from j_nursing import fake_pay
    journey('payment webhook: a consultation paid by card, told by the provider')
    acct = j_accounts.app_signup(label='webhook-pay')
    pat = Client(acct['token'], 'patient')
    anon = Client()
    j_concurrency.ensure_doctor()
    aid = book_unpaid(pat, j_concurrency.DOCTOR_CLIENT)
    if not aid:
        return
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    gid = txn.get('gateway_intent_id')
    step('the hosted checkout is created with the provider\'s payment id', r.ok and txn.get('id') and gid, r)
    if not gid:
        return

    def state():
        a = pat.get(f'/care/appointments/{aid}')
        rows = pat.get(f'/payments/booking/consultation/{aid}').items()
        mine = next((x for x in rows if x.get('id') == txn['id']), {})
        return mine.get('status'), a.get('payment_status')

    fake_pay(gid)  # the provider has the money; only its (authentic) webhook may tell us
    r = webhook(anon, gid, 'wrong-' + SECRET)
    step('a webhook with the wrong secret is refused (400)', r.status == 400 and 'invalid_webhook_signature' in str(r.body), r)
    r = webhook(anon, gid, None)
    step('a webhook with no secret is refused (400)', r.status == 400, r)
    step('refused webhooks changed nothing: still not paid', state()[0] != 'paid' and state()[1] != 'paid', state())
    r = webhook(anon, gid, SECRET)
    step('the provider\'s webhook is accepted', r.ok and r.get('ok') is True, r)
    tx_status, booking_paid = state()
    step('the payment and the booking are paid, with no verify call', tx_status == 'paid' and booking_paid == 'paid', (tx_status, booking_paid))
    r = webhook(anon, gid, SECRET)
    step('a redelivery is accepted and changes nothing', r.ok and state() == ('paid', 'paid'), r)
    r = webhook(anon, 'pay_' + uuid.uuid4().hex, SECRET)
    step('a payment id we never issued is answered without error and creates nothing', r.ok and r.get('ok') is False, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
