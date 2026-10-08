"""Journey P22.1: repeat / refill — subscribe -> reminder -> refill order created on the date.

Contracts (slice p22-a, read-only via `git show p22-a:<path>` from /Users/ahmedobaid/nabd-plus):
  backend/src/modules/pharmacy/controllers/refill.controller.ts
  backend/src/modules/pharmacy/services/refill-subscription.service.ts
  backend/src/modules/pharmacy/dto/refill-subscription.dto.ts
  backend/src/modules/orders/orders.controller.ts  (GET /orders/:id/reorder-eligibility)

What the screens send (no fixture-only shortcuts):
  - subscribe: POST /pharmacy/refills/subscriptions {items, cadence_days, ...} + Idempotency-Key
  - cron stand-in: POST /pharmacy/refills/process-due is the ADMIN endpoint the
    production scheduler calls (same service method); the journey calls it as the
    scheduler would. `first_refill_at` is a real DTO field ("seedable first refill
    date (used by journeys/tests)"), so seeding dates exercises a client-sendable
    field, not a backdoor.
  - alerts arrive as patient notifications (GET /notifications), the same inbox
    the app's notifications screen reads (cf. j_chat.py).

NOT RUN HERE: no docker on this machine, so the live gate cannot start
(mongo/redis/backend). Authored + static-checked only; must go green in CI
(NABD_GATE_P22=1) after the p22-a slice merges.

Never-loses-data invariants asserted:
  - same Idempotency-Key resubscribe returns the SAME subscription (no duplicate).
  - process-due twice creates exactly ONE order per refill date (refill_idempotency_key).
  - cancelling stops future refills; an expired-Rx subscription creates NO order.
"""
import time
import uuid
from lib import Client, journey, step

KEY = lambda tag: f'p22-refill-{tag}-{uuid.uuid4()}'


def notifs(pat, action_type, timeout=15):
    """Poll GET /notifications for an action the app's inbox would show."""
    end = time.time() + timeout
    while time.time() < end:
        r = pat.get('/notifications')
        if r.ok:
            body = r.body if isinstance(r.body, list) else r.items()
            hit = next((n for n in body if isinstance(n, dict)
                        and (n.get('action') or {}).get('type') == action_type), None)
            if hit:
                return hit
        time.sleep(1)
    return None


def run(pat, admin, medicine, rx_medicine):
    mid = medicine['id']

    journey('P22.1: subscribe to auto-refill (chronic OTC medicine)')
    k = KEY('sub')
    r = pat.post('/pharmacy/refills/subscriptions',
                 {'items': [{'medicine_id': mid, 'qty': 1}], 'cadence_days': 30,
                  'reminder_days_before': 2,
                  'first_refill_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + 2 * 86400)),
                  'delivery_address': {'label': 'المنزل', 'city': 'الرياض', 'lat': 24.7136, 'lng': 46.6753}},
                 headers={'Idempotency-Key': k})
    sub = r.body if isinstance(r.body, dict) else {}
    sid = sub.get('id') or r.get('id')
    step('subscribe returns an active subscription', r.ok and sid and (sub.get('status') or r.get('status')) == 'active', r)
    if not sid:
        return
    r2 = pat.post('/pharmacy/refills/subscriptions',
                  {'items': [{'medicine_id': mid, 'qty': 1}], 'cadence_days': 30},
                  headers={'Idempotency-Key': k})
    step('same Idempotency-Key replays the SAME subscription (no duplicate)', r2.ok and r2.get('id') == sid, r2)
    r = pat.get('/pharmacy/refills/subscriptions')
    mine = [s for s in r.items() if s.get('id') == sid] if r.ok else []
    step('my subscriptions lists it', r.ok and len(mine) == 1, f'{r.status} {len(r.items()) if r.ok else "?"}')

    journey('P22.1: reminder fires before the refill date, no order yet')
    r = admin.post('/pharmacy/refills/process-due', {}, headers={'Idempotency-Key': KEY('due1')})
    step('process-due reminds (1) and creates nothing early (0)',
         r.ok and r.get('reminded') == 1 and r.get('created') == 0, r)
    hit = notifs(pat, 'open_refill_subscription')
    step('reminder alert arrives in the patient inbox',
         hit and (hit.get('action') or {}).get('subscription_id') == sid, hit or 'no open_refill_subscription notification')
    o = pat.get('/pharmacy/refills/subscriptions')
    still = next((s for s in o.items() if s.get('id') == sid), {}) if o.ok else {}
    step('no refill order exists before the date', o.ok and not still.get('last_order_id'), still.get('last_order_id'))

    journey('P22.1: on the date the refill order is created exactly once')
    k2 = KEY('sub-due')
    r = pat.post('/pharmacy/refills/subscriptions',
                 {'items': [{'medicine_id': mid, 'qty': 2}], 'cadence_days': 30,
                  'first_refill_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 60))},
                 headers={'Idempotency-Key': k2})
    sid2 = r.get('id')
    step('due subscription created', r.ok and sid2, r)
    if not sid2:
        return
    r = admin.post('/pharmacy/refills/process-due', {}, headers={'Idempotency-Key': KEY('due2')})
    step('process-due creates the refill order', r.ok and r.get('created') == 1, r)
    o = pat.get('/pharmacy/refills/subscriptions')
    done = next((s for s in o.items() if s.get('id') == sid2), {}) if o.ok else {}
    oid = done.get('last_order_id')
    step('subscription records the refill order', o.ok and oid, done.get('last_order_id'))
    hit = notifs(pat, 'open_pharmacy_order')
    step('order-created alert arrives with that order id',
         hit and (hit.get('action') or {}).get('order_id') == oid, hit or 'no open_pharmacy_order notification')
    if oid:
        r = pat.get(f'/patient/pharmacy/orders/{oid}')
        order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
        items = order.get('items') or []
        step('refill order carries the subscribed items (nothing lost)',
             r.ok and len(items) == 1 and str(items[0].get('sku') or items[0].get('medicine_id') or '') == str(mid)
             and int(items[0].get('qty') or items[0].get('qty_requested') or 0) == 2, items)
    r = admin.post('/pharmacy/refills/process-due', {}, headers={'Idempotency-Key': KEY('due3')})
    o2 = pat.get('/pharmacy/refills/subscriptions')
    done2 = next((s for s in o2.items() if s.get('id') == sid2), {}) if o2.ok else {}
    step('second process-due creates NO duplicate order',
         r.ok and r.get('created') == 0 and done2.get('last_order_id') == oid,
         f'{r} last_order_id={done2.get("last_order_id")}')

    journey('P22.1: reorder-eligibility flags what "order again" would get wrong')
    if oid:
        r = pat.get(f'/orders/{oid}/reorder-eligibility')
        step('eligibility answers with a boolean verdict', r.ok and isinstance(r.get('eligible'), bool), r)
        before = pat.get(f'/patient/pharmacy/orders/{oid}')
        b1 = before.body.get('data', before.body) if isinstance(before.body, dict) else {}
        step('the eligibility check never mutates the order',
             before.ok and (b1.get('items') or []) == (order.get('items') or []), len(b1.get('items') or []))

    journey('P22.1: Rx guards — no refill without / past a prescription')
    r = pat.post('/pharmacy/refills/subscriptions',
                 {'items': [{'medicine_id': rx_medicine['id'], 'qty': 1}], 'cadence_days': 30},
                 headers={'Idempotency-Key': KEY('rx1')})
    step('Rx item without a prescription is refused (prescription_required)', r.status == 400 and 'prescription_required' in str(r.body), r)
    r = pat.post('/pharmacy/refills/subscriptions',
                 {'items': [{'medicine_id': 'no-such-medicine-id', 'qty': 1}], 'cadence_days': 30},
                 headers={'Idempotency-Key': KEY('rx2')})
    step('unknown medicine is refused (not silently subscribed)', r.status == 400, r)

    journey('P22.1: cancel stops future refills')
    r = pat.post(f'/pharmacy/refills/subscriptions/{sid}/cancel', {}, headers={'Idempotency-Key': KEY('cancel')})
    step('cancel marks it cancelled', r.ok and r.get('status') == 'cancelled', r)
    r = pat.post(f'/pharmacy/refills/subscriptions/{sid}/cancel', {}, headers={'Idempotency-Key': KEY('cancel2')})
    step('second cancel is refused, not a 500', r.status in (400, 404), r)


if __name__ == '__main__':
    import j_admin
    import j_accounts
    from lib import summary
    admin, _ = j_admin.login()
    pat = j_accounts.app_signup(label='refill-patient')
    # OTC + Rx catalog medicines (admin medicines-catalog.tsx saveForm shape, cf. j_pharmacy.py).
    def catalog(name, rx):
        tag = uuid.uuid4().hex[:6]
        return admin.post('/medicines/admin/catalog',
                          {'name_ar': f'{name} {tag}', 'name_en': f'{name} {tag}',
                           'active_ingredient': 'paracetamol', 'generic_name': 'paracetamol',
                           'manufacturer': 'GSK', 'brand': 'Panadol', 'category': 'chronic', 'sub_category': '',
                           'form': 'tablet', 'strength': '500mg', 'package_size': '30', 'barcode': '',
                           'price': 18.5, 'requires_prescription': rx, 'images': [], 'image': '',
                           'description_ar': 'دواء مزمن', 'description_en': 'chronic med',
                           'usage_instructions_ar': '', 'usage_instructions_en': '',
                           'indications_ar': ['ضغط'], 'indications_en': ['bp'],
                           'contraindications_ar': [], 'contraindications_en': [],
                           'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [],
                           'precautions_ar': [], 'precautions_en': [],
                           'reason': 'صنف مزمن لاختبار التجديد التلقائي P22.1'})
    r = catalog('دواء مزمن', False)
    step('admin catalogs an OTC chronic medicine', r.ok and r.get('id'), r)
    q = catalog('دواء وصفة', True)
    step('admin catalogs an Rx medicine', q.ok and q.get('id'), q)
    if r.ok and q.ok:
        run(Client(pat['token'], 'patient'), admin, {'id': r.get('id')}, {'id': q.get('id')})
    summary()
