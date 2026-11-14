"""Journey: the patient comes back from the hosted checkout (scenario PT-24, the money side of the return).
  The hosted checkout is the provider double (tools/live/fake_moyasar.py). The return address is `GET /moyasar/callback?id=&status=`, the one a browser
  or the app link hands back; its query string is whatever the browser sends, so it must never decide anything.
  Checked: after a DECLINED card a return that claims `status=paid` pays nothing and confirms nothing (the booking stays unpaid, the gateway
  truth read by /payments/verify is `failed`); after the card is ACCEPTED a return that claims `status=failed` does not undo the payment, and the
  booking is paid only through the verified path; repeating the return changes nothing (no second charge, no second payment row)."""
import urllib.error
import urllib.request
import uuid

from lib import BASE, Client, journey, step


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def gateway_return(intent_id, claimed):
    """GET the return address as a browser would, WITHOUT following the redirect to the result page; returns the HTTP status (302 expected)."""
    url = f'{BASE}/moyasar/callback?id={intent_id}&status={claimed}'
    try:
        with urllib.request.build_opener(_NoRedirect).open(urllib.request.Request(url, method='GET'), timeout=30) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def run():
    import j_accounts, j_concurrency
    from j_nursing import fake_pay
    from j_payment_webhook import book_unpaid
    journey('payment return: the gateway decides, never the query string')
    acct = j_accounts.app_signup(label='payment-return')
    pat = Client(acct['token'], 'patient')
    j_concurrency.ensure_doctor()
    aid = book_unpaid(pat, j_concurrency.DOCTOR_CLIENT)
    if not aid:
        return
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    first = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the checkout is created', r.ok and first.get('id') and first.get('gateway_intent_id'), r)
    if not first.get('id'):
        return

    fake_pay(first['gateway_intent_id'], status='failed')  # the bank declines the card
    code = gateway_return(first['gateway_intent_id'], 'paid')  # a forged / stale return that claims success
    step('a return claiming "paid" after a declined card is answered (redirect or page), not a server error', code < 500, code)
    a = pat.get(f'/care/appointments/{aid}')
    step('the booking is NOT paid after the forged "paid" return', a.get('payment_status') != 'paid', a)
    r = pat.post(f"/payments/verify/{first['id']}", {})
    step('the gateway truth is failed, whatever the return said', r.ok and r.get('status') == 'failed', r)
    rows = pat.get(f'/payments/booking/consultation/{aid}').items()
    step('no payment of this booking is marked paid', not any(x.get('status') == 'paid' for x in rows), [x.get('status') for x in rows])

    r = pat.post(f'/payments/retry/consultation/{aid}', {}, headers={'Idempotency-Key': f'payment-retry-{aid}-{uuid.uuid4()}'})
    second = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('retry makes a new checkout', r.ok and second.get('id') and second.get('id') != first['id'], r)
    if not second.get('id'):
        return
    fake_pay(second['gateway_intent_id'])  # the second card is accepted
    code = gateway_return(second['gateway_intent_id'], 'failed')  # a return that claims failure after real success
    step('a return claiming "failed" after an accepted card is answered, not a server error', code < 500, code)
    r = pat.post(f"/payments/verify/{second['id']}", {})
    step('the gateway truth is paid, whatever the return said', r.ok and r.get('status') == 'paid', r)
    a = pat.get(f'/care/appointments/{aid}')
    step('the booking is paid and confirmed', a.get('payment_status') == 'paid' and a.get('status') == 'CONFIRMED', a)

    for _ in range(2):  # the patient reopens the return link: nothing moves
        gateway_return(second['gateway_intent_id'], 'paid')
    rows = pat.get(f'/payments/booking/consultation/{aid}').items()
    paid = [x for x in rows if x.get('status') == 'paid']
    step('repeating the return leaves exactly one paid payment (no second charge)', len(paid) == 1, [x.get('status') for x in rows])
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-again-{aid}-{uuid.uuid4()}'})
    step('a paid booking cannot be charged again', r.status == 400 and 'booking_already_paid' in str(r.body), r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
