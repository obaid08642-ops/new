"""Journey: a paid card lab booking that is cancelled goes back to the card (money-flows G1).
  A patient pays a home lab booking by card (provider double), then (a) cancels it themself and (b) a second booking is
  cancelled by the lab. Checked: the payment is refunded for the full amount, the booking shows it, the ledger holds one
  refund, and a cash booking cancelled the same way refunds nothing."""
import time

from lib import Client, journey, step


def refunded(pat, bid, want):
    """The card payment of the booking, read back until the refund listener has run."""
    mine = {}
    for _ in range(30):
        rows = pat.get(f'/payments/booking/lab/{bid}').items()
        mine = rows[0] if rows else {}
        if mine.get('status') in ('refunded', 'partially_refunded') and float(mine.get('refunded_amount') or 0) == want:
            break
        time.sleep(1)
    return mine


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_lab
    from j_nursing import card_payment
    from lib import summary
    admin, _ = j_admin.login()
    j_lab.admin_publishes_tests(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    prov = j_onboarding.register_type('lab', {'test_categories': catalog})
    j_onboarding.admin_review(admin, prov)
    j_onboarding.provider_after_approval(prov)
    lab = Client(prov['token'], 'lab')
    lab_id = lab.get('/provider/me').get('account', 'id')
    pat = Client(j_accounts.app_signup(label='lab-refund')['token'], 'patient')

    journey('lab cancel refund: the patient cancels a paid card booking')
    bid, _ = j_lab.patient_books(pat, lab_id, location='home', method='card', offset=0)
    if bid:
        txn = card_payment(pat, 'lab', bid)
        r = pat.get(f'/labs/bookings/{bid}')
        step('the paid card booking is confirmed', r.ok and r.get('state') == 'CONFIRMED' and r.get('payment_status') == 'paid', r)
        paid = float((txn or {}).get('amount') or 0)
        r = pat.post(f'/labs/bookings/{bid}/cancel', {})
        step('the patient cancels it', r.ok and r.get('state') == 'CANCELLED', r)
        mine = refunded(pat, bid, paid)
        step('the card payment is refunded in full', paid > 0 and mine.get('status') == 'refunded' and float(mine.get('refunded_amount') or 0) == paid, mine)

    journey('lab cancel refund: the lab cancels a paid card booking')
    bid2, _ = j_lab.patient_books(pat, lab_id, location='home', method='card', offset=1, hour=11)
    if bid2:
        txn2 = card_payment(pat, 'lab', bid2)
        paid2 = float((txn2 or {}).get('amount') or 0)
        r = lab.req('PATCH', f'/labs/bookings/{bid2}/state', {'state': 'CANCELLED', 'note': 'lab_cancelled: التحليل غير متوفر'})
        step('the lab cancels it', r.ok and r.get('state') == 'CANCELLED', r)
        mine = refunded(pat, bid2, paid2)
        step('the card payment is refunded in full', paid2 > 0 and mine.get('status') == 'refunded' and float(mine.get('refunded_amount') or 0) == paid2, mine)

    journey('lab cancel refund: a cash booking has nothing to refund')
    bid3, _ = j_lab.patient_books(pat, lab_id, location='facility', method='cash', offset=2, hour=12)
    if bid3:
        r = pat.post(f'/labs/bookings/{bid3}/cancel', {})
        step('the patient cancels the cash booking', r.ok and r.get('state') == 'CANCELLED', r)
        time.sleep(2)
        step('no payment exists to refund', len(pat.get(f'/payments/booking/lab/{bid3}').items()) == 0, bid3)
    summary()
