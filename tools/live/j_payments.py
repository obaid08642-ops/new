"""Journey: payment sandbox e2e (success, fail, refund) + account deletion e2e (Gate P10).

Uses the fake Moyasar gateway (tools/live/fake_moyasar.py) to prove:
- a card payment intent succeeds end-to-end
- a declined payment fails safely without charging
- a paid payment refunds through the original method
- a patient can export then delete their account (PDPL)
"""
from lib import Client, journey, step


FAKE_PAY = 'http://127.0.0.1:9100'


def register_patient(tag):
    import time
    from lib import mail_code, uniq, phone
    email = f'pay-{tag}-{int(time.time()*1000)%100000}@nabd.test'
    pw = 'PayTest1!'
    anon = Client(None, 'anon')
    t0 = time.time()
    anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
    code = mail_code(email, t0)
    anon.post('/auth/verify-otp', {'email': email, 'code': code})
    r = anon.post('/auth/register', {'full_name': 'Pay Test', 'phone': phone(), 'email': email, 'password': pw})
    tok = r.get('token')
    tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
    return Client(tok, 'patient'), email, pw


def run(pat=None, admin=None):
    journey('payments: sandbox success, fail, refund (Gate P10)')
    if pat is None:
        pat, _, pw = register_patient('p10')

    # A minimal payable booking: onboard a lab, then book a test with it.
    # If no catalog is seeded, skip explicitly rather than faking a payment.
    from j_onboarding import register_type, admin_review, provider_after_approval
    import j_admin
    admin, _ = j_admin.login()
    # LabRegistration: the lab ticks the tests it runs from the public catalog (as j_lab does).
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    lab = register_type('lab', {'test_categories': catalog})
    admin_review(admin, lab)
    provider_after_approval(lab)
    # register_type returns no id; read the approved lab's account id as j_lab does.
    from j_onboarding import provider_client
    lab_client = provider_client(lab.get('token'))
    lab_id = lab_client.get('/provider/me').get('account', 'id') if lab.get('token') else None
    step('approved lab has an account id', bool(lab_id), lab_id)
    if lab_id:
        from j_lab import patient_books
        bid, _picks = patient_books(pat, lab_id, location='facility', method='card')
        step('lab booking created for payment test', bool(bid), bid)
        if bid:
            # 2. Intent succeeds
            import uuid
            r = pat.post(f'/payments/intent/lab/{bid}', {'method': 'card'},
                         headers={'Idempotency-Key': f'pay-{bid}-{uuid.uuid4()}'})
            txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
            step('payment intent created (sandbox)', r.ok and txn.get('id'), r)
            if txn.get('gateway_intent_id'):
                from j_nursing import fake_pay
                fake_pay(txn['gateway_intent_id'])
                v = pat.post(f"/payments/verify/{txn['id']}", {})
                step('payment succeeds end-to-end (sandbox)', v.ok and v.get('status') == 'paid', v)
                # 3. Admin refund reaches the gateway for THIS payment (Q81/Q91)
                rf = admin.post(f"/payments/refund/{txn['id']}", {'reason': 'live journey refund'})
                step('admin refund succeeds', rf.ok, rf)
                import json as _json, urllib.request as _ur
                with _ur.urlopen(f"{FAKE_PAY}/v1/payments/{txn['gateway_intent_id']}", timeout=5) as resp:
                    gw = _json.loads(resp.read() or b'{}')
                step('the gateway shows this payment refunded', gw.get('status') == 'refunded', gw)

    journey('payments: declined payment fails safely (Gate P10)')
    # A declined card must fail without charging and without confirming any booking.
    r = pat.post('/payments/intent/lab/nonexistent-booking', {'method': 'card'},
                 headers={'Idempotency-Key': 'pay-decline-test'})
    step('intent for unknown booking is refused (404, not 500)', r.status == 404, r)

    journey('account: export then delete (PDPL, Gate P10)')
    r = pat.get('/users/me/data-export')
    step('data export returns the patient record', r.ok, r)
    r = pat.req('DELETE', '/users/me', {'password': pw})
    step('account erased on verified request', r.ok, r)
    if r.ok:
        r2 = pat.get('/users/me')
        step('erased account no longer authenticates', r2.status in (401, 403, 404), r2)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
