"""Journey: a dispute about a charge (scenario PT-15).
  The patient pays a consultation by card, files a PAYMENT ticket naming that booking, the admin finds the booking on the
  dispute and refunds part of it to the card, once.
  Checked: a ticket can name only the patient's own booking; the dispute shows the booking; the admin needs no typing of the
  booking; the refund lands in the ledger and on the payment; resolving again is refused (no second refund)."""
import uuid

from lib import Client, journey, step


def run():
    import j_accounts, j_admin, j_concurrency
    from j_nursing import fake_pay
    from j_payment_webhook import book_unpaid
    journey('dispute on a charge: ticket -> admin refund')
    admin, _ = j_admin.login()
    acct = j_accounts.app_signup(label='dispute-pat')
    pat = Client(acct['token'], 'patient')
    j_concurrency.ensure_doctor()
    aid = book_unpaid(pat, j_concurrency.DOCTOR_CLIENT)
    if not aid:
        return
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the consultation is charged by card', r.ok and txn.get('id') and txn.get('amount'), r)
    if not txn.get('id'):
        return
    fake_pay(txn['gateway_intent_id'])
    r = pat.post(f"/payments/verify/{txn['id']}", {})
    step('the payment is paid', r.ok and r.get('status') == 'paid', r)

    other = Client(j_accounts.app_signup(label='dispute-other')['token'], 'patient')
    r = other.post('/support/requests', {'subject': 'خصم مكرر', 'message': 'تم خصم المبلغ مرتين من بطاقتي', 'category': 'payment', 'booking_kind': 'consultation', 'booking_id': aid})
    step("another patient cannot file a dispute about someone else's booking", r.status in (403, 404), r)

    r = pat.post('/support/requests', {'subject': 'خصم مكرر', 'message': 'تم خصم المبلغ مرتين من بطاقتي', 'category': 'payment', 'booking_kind': 'consultation', 'booking_id': aid})
    did = r.get('id')
    step('the patient files a payment dispute naming the booking', r.ok and did and r.get('booking_id') == aid, r)
    if not did:
        return
    r = admin.get(f'/admin/admin/disputes/{did}')
    step('the admin sees the dispute with its booking', r.ok and r.get('booking_id') == aid and r.get('booking_kind') == 'consultation', r)

    amount = max(1, int(float(txn['amount']) // 4))
    body = {'decision': 'refund_partial', 'amount': amount, 'reason': 'تم التحقق من الخصم المكرر مع بوابة الدفع'}
    r = admin.post(f'/admin/admin/disputes/{did}/resolve', body)
    step('the admin refunds part of the charge without naming the booking', r.ok and r.get('credited_amount') == amount, r)
    r = admin.get(f'/admin/admin/disputes/{did}')
    step('the dispute is resolved and shows the refund from the ledger', r.ok and r.get('status') == 'RESOLVED' and any(float(x.get('amount', 0)) == amount for x in (r.get('refunds') or [])), r)
    rows = pat.get(f'/payments/booking/consultation/{aid}').items()
    mine = next((x for x in rows if x.get('id') == txn['id']), {})
    step('the payment shows the refunded amount', float(mine.get('refunded_amount') or 0) == amount, mine)
    r = admin.post(f'/admin/admin/disputes/{did}/resolve', body)
    step('resolving again is refused: no second refund', r.status == 409, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
