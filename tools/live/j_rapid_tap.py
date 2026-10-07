"""Gate P15 rapid-tap: tapping "pay", "book", "order" or "send" 10 times quickly
creates exactly one record and exactly one charge.

Mechanism under test: one screen tap = one write; the 10 sends share the
single idempotency key the screen generated for that tap (cf. j_concurrency C,
which proves 6 same-key submits collapse to one appointment). Requests are
fired at the same instant from threads with a barrier start, so the server —
not the client — has to serialise them.

Fixtures a patient screen cannot create (stated explicitly, per the plan):
lab-provider onboarding/approval and the medicines catalog seed are ADMIN-app
actions; the journey performs them through the admin API with the exact
payloads the admin screens send (j_onboarding.register_type/admin_review,
j_pharmacy.admin_adds_medicines). Everything the patient side sends is copied
from the patient screens (j_payments intent/verify, j_concurrency slot book,
j_pharmacy draft, j_chat thread message with the app-generated
client_message_id).

  Stack: backend :8002, smtp_sink :2525, fake_moyasar :9100.
"""
import threading
import uuid

from lib import Client, journey, step
from j_accounts import app_signup
from j_chaos import payable_lab_booking


def at_once(calls):
    """Run the callables together (barrier start); return results in order."""
    out = [None] * len(calls)
    gate = threading.Barrier(len(calls))

    def run(i, fn):
        gate.wait()
        out[i] = fn()
    ts = [threading.Thread(target=run, args=(i, fn)) for i, fn in enumerate(calls)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    return out


def run():
    pat = Client(app_signup(label='rapid-tap')['token'], 'rapid-tap')

    journey('rapid-tap pay: 10 taps on "pay" create exactly one charge')
    bid, why = payable_lab_booking(pat)
    if not bid:
        step('SKIP rapid-tap pay (no lab catalog seeded)', True, f'skipped: {why}')
    else:
        key = f'rapid-pay-{bid}-{uuid.uuid4()}'
        rs = at_once([lambda: pat.post(f'/payments/intent/lab/{bid}', {'method': 'card'},
                                       headers={'Idempotency-Key': key}) for _ in range(10)])
        txns = [r.body.get('data', r.body) if isinstance(r.body, dict) else {} for r in rs]
        ids = {t.get('id') for t in txns if isinstance(t, dict) and t.get('id')}
        step('all 10 taps answer with the same transaction id', len(ids) == 1, [f'{r.status}:{str((t or {}).get("id"))[:12]}' for r, t in zip(rs, txns)])
        step('no 5xx under the burst', all(r.status < 500 for r in rs), [r.status for r in rs])
        tid = next(iter(ids)) if ids else None
        if tid:
            txn = next(t for t in txns if isinstance(t, dict) and t.get('id') == tid)
            from j_nursing import fake_pay
            fake_pay(txn.get('gateway_intent_id'))
            v = pat.post(f"/payments/verify/{tid}", {})
            step('the single transaction pays once (status paid)', v.ok and v.get('status') == 'paid', v)
            mine = pat.get('/moyasar/payments/me')
            rows = mine.body if isinstance(mine.body, list) else mine.items()
            paid = [x for x in rows if isinstance(x, dict)
                    and str(x.get('booking_id') or x.get('bookingId') or '') == str(bid)
                    and str(x.get('status') or '').lower() in ('paid', 'captured', 'success')]
            step('exactly one paid charge exists for the booking', len(paid) == 1, f'{len(paid)} paid rows')

    journey('rapid-tap book: 10 taps on "book" create exactly one appointment')
    import os
    from j_concurrency import DOCTOR, free_slots, book
    free, _ = free_slots(pat, 1)
    if not free:
        step('SKIP rapid-tap book (no free clinic slots)', True, 'skipped: no live slots')
    else:
        slot = free[0]
        key = f'appointment-create-{DOCTOR}-{slot}-{uuid.uuid4()}'
        rs = at_once([lambda: book(pat, slot, key=key) for _ in range(10)])
        ids = {r.get('id') for r in rs if r.ok and r.get('id')}
        step('all 10 taps answer with the same appointment id', len(ids) == 1,
             [f'{r.status}:{str(r.get("id") or r.body)[:24]}' for r in rs])
        mine = pat.get('/care/appointments')
        rows = mine.body if isinstance(mine.body, list) else (mine.get('data') or mine.get('items') or [])
        n = sum(1 for a in rows if isinstance(a, dict) and a.get('slot_start', '').startswith(slot[:16])
                and a.get('status') not in ('CANCELLED', 'cancelled'))
        step('the patient holds exactly one appointment at that time', n == 1, f'{n} rows')
        step('no 5xx under the burst', all(r.status < 500 for r in rs), [r.status for r in rs])

    journey('rapid-tap order: 10 taps on "order" create exactly one draft')
    import j_admin
    from j_pharmacy import admin_adds_medicines, patient_address
    admin, _ = j_admin.login()
    meds = admin_adds_medicines(admin)
    if not meds or not meds[0].get('id'):
        step('SKIP rapid-tap order (catalog seed failed)', True, 'skipped: no medicine id')
    else:
        addr = patient_address(pat)
        draft = {'items': [{'raw_name': meds[0]['name_ar'], 'qty': 1, 'sku': meds[0]['id'], 'intake_source': 'cart'}],
                 'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                      'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
                 'prescription_attachments': []}
        key = f'mobile-rapid-order-{uuid.uuid4()}'
        rs = at_once([lambda: pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': key})
                      for _ in range(10)])
        ids = {r.get('id') for r in rs if r.ok and r.get('id')}
        step('all 10 taps answer with the same order id', len(ids) == 1,
             [f'{r.status}:{str(r.get("id") or r.body)[:24]}' for r in rs])
        step('no 5xx under the burst', all(r.status < 500 for r in rs), [r.status for r in rs])

    journey('rapid-tap send: 10 taps on "send" deliver exactly one message')
    mine = pat.get('/care/appointments')
    rows = mine.body if isinstance(mine.body, list) else (mine.get('data') or mine.get('items') or [])
    aid = next((a.get('id') for a in rows if isinstance(a, dict) and a.get('id')), None)
    if not aid:
        step('SKIP rapid-tap send (no appointment to attach the thread to)', True, 'skipped: book drill produced none')
    else:
        r = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': aid})
        tid = (r.body.get('data') or r.body).get('id') if isinstance(r.body, dict) else None
        if not tid:
            step('booking thread for the appointment', False, r)
        else:
            cmid = str(uuid.uuid4())
            rs = at_once([lambda: pat.post(f'/chat/threads/{tid}/messages',
                                           {'body': 'تم — تأكيد سريع', 'type': 'text', 'client_message_id': cmid},
                                           headers={'Idempotency-Key': str(uuid.uuid4())}) for _ in range(10)])
            # The backend's atomic dedup is verified present (p15-backend
            # chat.service.ts: a 11000 loser re-reads the winner and returns it,
            # never a 500), so every racer must answer 2xx with the SAME id.
            ids = {s.get('id') for s in rs if s.ok and s.get('id')}
            step('every racer answers 2xx with the same message id (the 11000 loser returns the winner)',
                 len(rs) == 10 and len(ids) == 1,
                 [f'{s.status}:{str(s.get("id"))[:12]}' for s in rs])
            msgs = pat.get(f'/chat/threads/{tid}/messages')
            items = msgs.body if isinstance(msgs.body, list) else msgs.items()
            n = str(items).count(cmid)
            step('the burst delivers the message exactly once', n == 1, f'{n} copies in thread')
            step('no 5xx under the burst', all(s.status < 500 for s in rs), [s.status for s in rs])


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
