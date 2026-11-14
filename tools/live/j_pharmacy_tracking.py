"""Journey (scenario PT-25, delivery tracking): a patient's pharmacy order can be tracked by its owner, and nobody else can.
  - a registered, approved pharmacy with priced medicines (j_pharmacy's setup), then the patient places and submits an order
    (the draft and submit calls j_pharmacy.open_order makes, without waiting for an offer: the tracking is read at 'broadcasting')
  - GET /orders/:id/tracking (orders.controller.ts:78-80, orders.service.ts getTracking) answers for the owner with the order's status
  - a stranger (another patient) is refused with 403 (orders.service.ts: only owner, pharmacy or admin)
  - an unknown order id answers 404
  Stack: backend :8002. TEST database only.
"""
from lib import Client, journey, step, summary


def run():
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pat = Client(j_accounts.app_signup(label='pharm-tracking')['token'], 'patient')
    meds = j_pharmacy.admin_adds_medicines(admin)
    ph = Client(p['token'], 'pharmacy')
    j_pharmacy.pharmacy_prices_items(ph, admin, meds)
    addr = j_pharmacy.patient_address(pat)
    import uuid
    draft = {'items': [{'raw_name': meds[0]['name_ar'], 'qty': 1, 'sku': meds[0]['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)}, 'prescription_attachments': []}
    k = str(uuid.uuid4())
    oid = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k}).get('id')
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    step('a real pharmacy order is placed and submitted by the patient', bool(oid) and r.ok, r)
    if not oid:
        return summary()

    journey('delivery tracking: the owner reads the order tracking (PT-25)')
    r = pat.get(f'/orders/{oid}/tracking')
    step('the owner reads the tracking (GET /orders/:id/tracking)', r.ok, r)
    body = r.body if isinstance(r.body, dict) else {}
    step('the tracking names the order it belongs to', str(body.get('order_id') or (body.get('order') or {}).get('id') or body.get('id') or '') == str(oid) or oid in str(body), str(body)[:200])
    step('the tracking carries the order state', bool(body.get('state') or body.get('status')), str(body)[:200])

    journey('delivery tracking: a stranger cannot read it (PT-25)')
    stranger = Client(j_accounts.app_signup(label='pharm-tracking-stranger')['token'], 'patient')
    r = stranger.get(f'/orders/{oid}/tracking')
    step('another patient is refused (403)', r.status == 403, r)

    journey('delivery tracking: an unknown order is not found (PT-25)')
    r = pat.get('/orders/00000000-0000-4000-8000-00000000dead/tracking')
    step('an unknown order id answers 404', r.status == 404, r)
    summary()


if __name__ == '__main__':
    run()
