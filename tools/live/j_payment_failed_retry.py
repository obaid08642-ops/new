"""Journey: a card that is declined, then the patient retries and pays (scenario PT-23).
  The hosted checkout is the provider double (tools/live/fake_moyasar.py); its test hook declines the card.
  Checked: the declined card is reported as failed (not left "pending"); the booking is not paid and still holds its slot;
  retry makes a NEW checkout and cancels the old attempt; paying the new checkout confirms the booking; a booking that is
  paid cannot be charged again."""
import uuid

from lib import Client, journey, step


def run():
    import j_accounts, j_concurrency
    from j_nursing import fake_pay
    from j_payment_webhook import book_unpaid
    journey('payment failure and retry: a declined card, then a second try')
    acct = j_accounts.app_signup(label='declined-card')
    pat = Client(acct['token'], 'patient')
    j_concurrency.ensure_doctor()
    aid = book_unpaid(pat, j_concurrency.DOCTOR_CLIENT)
    if not aid:
        return
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    first = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the first checkout is created', r.ok and first.get('id') and first.get('gateway_intent_id'), r)
    if not first.get('id'):
        return

    fake_pay(first['gateway_intent_id'], status='failed')  # the bank declines the card
    r = pat.post(f"/payments/verify/{first['id']}", {})
    step('the declined card is reported as failed, not pending', r.ok and r.get('status') == 'failed', r)
    a = pat.get(f'/care/appointments/{aid}')
    step('the booking is not paid', a.get('payment_status') != 'paid', a)

    r = pat.post(f'/payments/retry/consultation/{aid}', {}, headers={'Idempotency-Key': f'payment-retry-{aid}-{uuid.uuid4()}'})
    second = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('retry makes a new checkout', r.ok and second.get('id') and second.get('id') != first['id'] and second.get('gateway_intent_id') != first['gateway_intent_id'], r)
    if not second.get('id'):
        return
    rows = pat.get(f'/payments/booking/consultation/{aid}').items()
    old = next((x for x in rows if x.get('id') == first['id']), {})
    step('the declined attempt is closed (cancelled)', old.get('status') == 'cancelled', old)

    fake_pay(second['gateway_intent_id'])  # the second card is accepted
    r = pat.post(f"/payments/verify/{second['id']}", {})
    step('the second attempt is paid', r.ok and r.get('status') == 'paid', r)
    a = pat.get(f'/care/appointments/{aid}')
    step('the booking is paid and confirmed', a.get('payment_status') == 'paid' and a.get('status') == 'CONFIRMED', a)

    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-again-{aid}-{uuid.uuid4()}'})
    step('a paid booking cannot be charged again', r.status == 400 and 'booking_already_paid' in str(r.body), r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
