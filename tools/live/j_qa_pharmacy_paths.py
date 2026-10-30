"""Journey (QA P-08, P-09, P-10): pharmacy order paths that end without a sale.
  P-10 the pharmacy declines the broadcast (provider-app: POST /provider/pharmacy/broadcasts/:orderId/reject); the patient
       gets no offer from it, and a second decline is refused.
  P-08 no pharmacy answers: the round timer is past (set in the local test DB), the admin expiry command runs
       (POST /admin/pharmacy/broadcasts/expire-due) and the order goes to manual review with no offers.
  P-09 an offer expires: its quote timer is past (set in the local test DB), the expiry command runs, the offer is
       expired in MongoDB and the patient cannot select it.
Timers are moved to the past in the local test database only, so the expiry command is reached without waiting.
Every write is checked in MongoDB (pharmacy_broadcasts, pharmacy_offers, pharmacy_orders)."""
import json
import subprocess

from lib import Client, journey, step
from j_pharmacy import admin_adds_medicines, pharmacy_prices_items, patient_address, _send_order


def mongo(js):
    return subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', js],
                          capture_output=True, text=True).stdout.strip()


def mongo_json(js):
    out = mongo(f'JSON.stringify({js})')
    return json.loads(out) if out and out != 'null' else None


def broadcast_row(oid):
    return mongo_json(f'db.pharmacy_broadcasts.findOne({{order_id: "{oid}"}}, {{_id: 0, id: 1, order_id: 1, lock_state: 1, '
                      f'responses: 1, round_expires_at: 1}})')


def offer_rows(oid):
    return mongo_json(f'db.pharmacy_offers.find({{order_id: "{oid}"}}, {{_id: 0, id: 1, status: 1, quote_expires_at: 1}}).toArray()') or []


def order_row(oid):
    return mongo_json(f'db.pharmacy_orders.findOne({{id: "{oid}"}}, {{_id: 0, id: 1, status: 1, selected_offer_id: 1}})')


def expire_timers(oid):
    """Local test DB only: move the round and quote timers of this order into the past."""
    mongo(f'db.pharmacy_broadcasts.updateMany({{order_id: "{oid}"}}, {{$set: {{round_expires_at: new Date(Date.now() - 60000)}}}}); '
          f'db.pharmacy_offers.updateMany({{order_id: "{oid}"}}, {{$set: {{quote_expires_at: new Date(Date.now() - 60000)}}}})')


def run_expiry(admin):
    return admin.post('/admin/admin/pharmacy/broadcasts/expire-due', {})


def decline_path(pat, pharm, admin, meds, addr):
    journey('pharmacy order P-10: the pharmacy declines the broadcast')
    oid, bc = _send_order(pat, pharm, meds, addr)
    step('the pharmacy sees the broadcast', bc is not None, bc)
    if not bc:
        return
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/reject', {'reason': 'out of stock (QA)'})
    step('pharmacy declines the broadcast', r.ok, r)
    row = broadcast_row(oid)
    declined = [x for x in (row or {}).get('responses', []) if x.get('response') == 'declined']
    step('MongoDB: the pharmacy response is declined, broadcast still open', bool(declined) and row.get('lock_state') == 'open', row)
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    step('patient sees no offer from the declined pharmacy', r.ok and not r.items(), r)
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/reject', {'reason': 'again'})
    row = broadcast_row(oid)
    step('a second decline replaces the first: one response per pharmacy in MongoDB', r.ok and len((row or {}).get('responses', [])) == 1, row)


def no_offer_path(pat, pharm, admin, meds, addr):
    journey('pharmacy order P-08: no pharmacy answers, the round expires')
    oid, bc = _send_order(pat, pharm, meds, addr)
    step('order is sent and visible to the pharmacy', bc is not None, bc)
    if not bc:
        return
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    step('patient has no offers yet', r.ok and not r.items(), r)
    # Each expiry widens the search to the next round; the broadcast closes only after the last stage has expired.
    rounds = 0
    for _ in range(8):
        row = broadcast_row(oid)
        if not row or row.get('lock_state') != 'open':
            break
        expire_timers(oid)
        r = run_expiry(admin)
        rounds += 1
        if not r.ok:
            break
    step('expiry command runs', r.ok, r)
    row = broadcast_row(oid)
    step(f'MongoDB: the broadcast is closed after {rounds} expiry runs (no answer)', bool(row) and row.get('lock_state') == 'closed', row)
    order = order_row(oid)
    step('MongoDB: the order goes to manual_review with no selected offer',
         bool(order) and order.get('status') == 'manual_review' and not order.get('selected_offer_id'), order)
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    step('patient sees the order in manual review after reload', r.ok and r.get('status') == 'manual_review', r)
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    step('patient still has no offers', r.ok and not r.items(), r)


def expired_offer_path(pat, pharm, admin, meds, addr):
    journey('pharmacy order P-09: the offer expires before the patient picks it')
    oid, bc = _send_order(pat, pharm, meds, addr)
    step('order is sent', bc is not None, bc)
    if not bc:
        return
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': _quote_items(bc)})
    offer_id = r.get('id')
    r2 = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('pharmacy submits the offer', r.ok and r2.ok, f'{r} / {r2}')
    o = next((x for x in pat.get(f'/patient/pharmacy/orders/{oid}/offers').items() if x.get('id') == offer_id), None)
    step('patient sees the offer before it expires', o is not None, o)
    expire_timers(oid)
    r = run_expiry(admin)
    step('expiry command runs', r.ok, r)
    rows = offer_rows(oid)
    mine = next((x for x in rows if x.get('id') == offer_id), None)
    step('MongoDB: the offer is expired', bool(mine) and mine.get('status') == 'expired', rows)
    r = pat.post(f'/patient/pharmacy/orders/{oid}/offers/{offer_id}/select', {'coverage_mode': 'cash'}, headers={'Idempotency-Key': f'expired-offer-{offer_id}'})
    step('patient cannot select the expired offer', not r.ok, r)
    order = order_row(oid)
    step('MongoDB: the order has no selected offer', bool(order) and not order.get('selected_offer_id'), order)


def _quote_items(bc):
    rows = bc.get('items') or bc.get('medicines') or []
    return [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
             'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in rows]


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    meds = admin_adds_medicines(admin)
    ph = Client(p['token'], 'pharmacy')
    r = ph.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('pharmacy goes online', r.ok, r)
    pharmacy_prices_items(ph, admin, meds)
    pat = Client(j_accounts.app_signup(label='pharm-paths')['token'], 'patient')
    addr = patient_address(pat)
    decline_path(pat, ph, admin, meds, addr)
    no_offer_path(pat, ph, admin, meds, addr)
    expired_offer_path(pat, ph, admin, meds, addr)
    summary()
