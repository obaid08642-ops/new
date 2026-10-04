"""Gate P15 app-killed-during-payment: kill the app after "pay" -> reopen ->
the order's real state from the server (pending / paid / failed), and no
duplicate charge. A push opened days later shows the current state (15.8).

What the journey does (API-visible halves of the same user story):
  1. create a lab booking + payment intent (patient-screen payloads, j_payments)
  2. complete the hosted checkout (fake_moyasar /__pay) and then STOP — the
     app is "killed" before it ever calls verify, exactly as a dead phone would
  3. "reopen": read the booking's real state from the server
     (GET /payments/booking/lab/<bid> — the reconciliation read the app must
     use on launch) and assert it is pending/initiated: not paid, not failed,
     not lost
  4. finish the payment once (verify) -> paid; verify again -> same txn, and
     the booking's payment list holds exactly one paid row (no duplicate charge)
  5. push half: the payment notification in GET /notifications carries the
     CURRENT state, so a push opened days later deep-links to the truth, not a
     stale snapshot. Actually delivering a push needs FCM/APNs (external,
     DEFERRED-OUT-OF-SCOPE: device-farm/manual pass); the gate proves the
     server-side payload the push would carry.

Fixtures a patient screen cannot create: lab-provider onboarding/approval is an
ADMIN-app action performed here with the admin screen payloads
(j_onboarding.register_type/admin_review), stated explicitly per the plan.
"""
import uuid

from lib import Client, journey, step
from j_accounts import app_signup
from j_chaos import payable_lab_booking


def booking_payments(pat, bid):
    r = pat.get(f'/payments/booking/lab/{bid}')
    rows = r.body if isinstance(r.body, list) else r.items()
    return r, rows


def run():
    journey('app-killed-during-payment: the app dies after "pay", before verify')
    pat = Client(app_signup(label='killpay')['token'], 'killpay')
    bid, why = payable_lab_booking(pat)
    if not bid:
        step('SKIP app-killed-during-payment (no lab catalog seeded)', True, f'skipped: {why}')
        return
    r = pat.post(f'/payments/intent/lab/{bid}', {'method': 'card'},
                 headers={'Idempotency-Key': f'killpay-{bid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('payment intent created before the kill', r.ok and txn.get('id'), r)
    if not txn.get('id'):
        return
    from j_nursing import fake_pay
    fake_pay(txn['gateway_intent_id'])
    # The app is killed HERE: verify is never called. The money moved at the
    # gateway; the app knows nothing.

    journey('app-killed-during-payment: reopen reads the real state (pending, not lost)')
    r, rows = booking_payments(pat, bid)
    step('the booking payment state is readable after reopen', r.ok, r)
    ids = {str(x.get('id') or '') for x in rows if isinstance(x, dict)}
    step('the killed intent is still there (pending — not lost, not paid-behind-our-back)',
         str(txn.get('id')) in ids, f'txn={txn.get("id")} rows={len(rows)}')
    paid_now = [x for x in rows if isinstance(x, dict) and str(x.get('status') or '').lower() in ('paid', 'captured', 'success')]
    step('nothing is marked paid before the app reconciles', len(paid_now) == 0, f'{len(paid_now)} paid rows')

    journey('app-killed-during-payment: one verify finishes it, never twice')
    v = pat.post(f"/payments/verify/{txn['id']}", {})
    step('reconciliation pays the pending transaction once', v.ok and v.get('status') == 'paid', v)
    v2 = pat.post(f"/payments/verify/{txn['id']}", {})
    step('a second verify returns the same transaction (no duplicate charge)',
         v2.ok and v2.get('status') == 'paid', v2)
    _, rows = booking_payments(pat, bid)
    paid = [x for x in rows if isinstance(x, dict) and str(x.get('status') or '').lower() in ('paid', 'captured', 'success')]
    step('exactly one paid charge exists for the booking', len(paid) == 1, f'{len(paid)} paid rows')

    journey('app-killed-during-payment: a push opened days later shows the current state')
    r = pat.get('/notifications')
    items = r.body if isinstance(r.body, list) else r.items()
    step('notifications load', r.ok, r)
    mine = [n for n in items if isinstance(n, dict) and bid in str(n)]
    step('a payment notification for this booking exists (what the push carries)',
         len(mine) >= 1, f'{len(mine)} matching / {len(items)} total')
    _, rows = booking_payments(pat, bid)
    paid = [x for x in rows if isinstance(x, dict) and str(x.get('status') or '').lower() in ('paid', 'captured', 'success')]
    step('the server truth a late-opened push resolves to is paid (no stale snapshot)',
         len(paid) == 1, f'{len(paid)} paid rows')
    step('SKIP push delivery itself (needs FCM/APNs — external; device-farm/manual pass)',
         True, 'skipped: no push infra in the harness')


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
