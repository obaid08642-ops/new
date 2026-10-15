"""Journey: a new pharmacy (empty inventory) answers an order from the national catalogue (provider-journeys 1).
  - The offer composer's search (GET /provider/inventory/search?include_catalogue=1) lists catalogue items that are not
    in the pharmacy's inventory; without the flag (barcode check, substitutes) it stays the inventory only.
  - Picking a catalogue item (medicine_id) or answering "available" on a line that already names a catalogue item adds
    the item to the pharmacy's inventory at the catalogue's reference price and the offered quantity, and the offer is
    built from it. An unknown catalogue item is refused.
  - The patient receives the offer with both lines priced.
  - provider-journeys 4: an allocation with an unavailable line is confirmed in two steps (partially confirmed, then
    confirmed with the available lines) and goes on to preparation; it used to stop at partially_confirmed.
"""
import urllib.parse
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    KEY = j_pharmacy.KEY
    admin, _ = j_admin.login()
    meds = j_pharmacy.admin_adds_medicines(admin)[:2]
    if not all(m.get('id') for m in meds):
        return
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pharm = Client(p['token'], 'pharmacy')
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('the new pharmacy goes online', r.ok, r)
    r = pharm.get('/provider/capabilities/pharmacy')
    own = r.body if isinstance(r.body, list) else r.items()
    step('its inventory is empty', r.ok and not [x for x in own if x.get('sku') in {m['id'] for m in meds}], len(own))

    pat = Client(j_accounts.app_signup(label='catalogue-lines')['token'], 'patient')
    addr = j_pharmacy.patient_address(pat)
    draft = {'items': [{'raw_name': m['name_ar'], 'qty': 2 if i == 0 else 1, 'sku': m['id'], 'intake_source': 'cart'} for i, m in enumerate(meds)],
             'delivery_address': {'label': addr.get('label') or 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
             'prescription_attachments': []}
    k = KEY('catalogue-lines')
    oid = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k}).get('id')
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    step('the patient sends a two-item order', oid and r.ok, r)
    b = next((x for x in pharm.get('/provider/pharmacy/broadcasts').items() if x.get('order_id') == oid), None)
    step('the new pharmacy sees it', b, oid)
    if not b:
        return
    lines = {str(i.get('matched_sku')): i for i in (b.get('items') or [])}

    journey('provider-journeys 1: the composer finds the item in the national catalogue')
    term = meds[0]['name_ar']
    r = pharm.get('/provider/inventory/search?q=' + urllib.parse.quote(term))
    rows = r.body if isinstance(r.body, list) else []
    step('the inventory search alone has nothing (empty inventory)', r.ok and not any(x.get('medicine_id') == meds[0]['id'] for x in rows), rows[:2])
    r = pharm.get('/provider/inventory/search?include_catalogue=1&q=' + urllib.parse.quote(term))
    rows = r.body if isinstance(r.body, list) else []
    hit = next((x for x in rows if x.get('medicine_id') == meds[0]['id']), None)
    step('with the catalogue it lists the item, priced at the catalogue price', r.ok and hit and hit.get('source') == 'catalogue' and hit.get('id') is None and float(hit.get('price') or 0) == float(meds[0]['price']), hit or rows[:2])

    journey('provider-journeys 1: the pharmacy prices both lines from the catalogue')
    first, second = lines.get(meds[0]['id'], {}), lines.get(meds[1]['id'], {})
    bad = [{'order_item_id': str(first.get('order_item_id')), 'availability': 'available', 'qty_offered': 2, 'medicine_id': str(uuid.uuid4())}]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': bad})
    step('an unknown catalogue item is refused', r.status == 400 and 'catalogue_item_not_found' in str(r.body), r)
    items = [
        {'order_item_id': str(first.get('order_item_id')), 'availability': 'available', 'qty_offered': 2, 'medicine_id': meds[0]['id']},
        # "available" on a line that already names a catalogue item, nothing picked
        {'order_item_id': str(second.get('order_item_id')), 'availability': 'available', 'qty_offered': 1},
    ]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': items})
    offer = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the offer is drafted from catalogue items', r.ok and offer.get('id'), r)
    if not offer.get('id'):
        return
    r = pharm.post(f"/provider/pharmacy/broadcasts/{oid}/offers/{offer['id']}/submit", {})
    step('and sent', r.ok, r)
    r = pharm.get('/provider/capabilities/pharmacy')
    own = {x.get('sku'): x for x in (r.body if isinstance(r.body, list) else r.items())}
    a, c = own.get(meds[0]['id']) or {}, own.get(meds[1]['id']) or {}
    step('both items are now in the pharmacy inventory, with the catalogue price', float(a.get('price') or 0) == float(meds[0]['price']) and float(c.get('price') or 0) == float(meds[1]['price']), [a, c])

    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    offers = r.body if isinstance(r.body, list) else r.items()
    got = next((o for o in offers if o.get('id') == offer['id']), offers[0] if offers else {})
    priced = [l for l in (got.get('items') or []) if l.get('action') == 'available' and float(l.get('unit_price') or 0) > 0]
    step('the patient receives the offer with both lines priced', len(priced) == 2, got.get('items'))

    journey('provider-journeys 4: one line unavailable, the pharmacy still reaches preparation')
    from j_nursing import card_payment
    k = KEY('partial')
    draft['items'] = [{'raw_name': m['name_ar'], 'qty': 1, 'sku': m['id'], 'intake_source': 'cart'} for m in meds]
    oid = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k}).get('id')
    pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    b = next((x for x in pharm.get('/provider/pharmacy/broadcasts').items() if x.get('order_id') == oid), None)
    lines = {str(i.get('matched_sku')): i for i in ((b or {}).get('items') or [])}
    items = [{'order_item_id': str(lines.get(meds[0]['id'], {}).get('order_item_id')), 'availability': 'available', 'qty_offered': 1},
             {'order_item_id': str(lines.get(meds[1]['id'], {}).get('order_item_id')), 'availability': 'unavailable'}]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': items})
    offer_id = r.get('id')
    pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit', {})
    r = pat.post(f'/patient/pharmacy/orders/{oid}/offers/{offer_id}/select', {'coverage_mode': 'cash'}, headers={'Idempotency-Key': KEY('sel')})
    step('the patient picks the offer with one line unavailable', r.ok, r)
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    if order.get('governed_state') == 'FINAL_QUOTE_READY':
        pat.post(f'/patient/pharmacy/orders/{oid}/final-quote/accept', {'quote_hash': order.get('pending_final_quote_hash'), 'quote_revision': order.get('pending_final_quote_revision')}, headers={'Idempotency-Key': KEY('fq')})
    card_payment(pat, 'pharmacy', oid)
    alloc = next((a for a in pharm.get('/provider/pharmacy/allocations').items() if a.get('order_id') == oid), None)
    step('the order is allocated to the pharmacy', alloc, oid)
    if not alloc:
        return
    aid = alloc['id']
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/confirm', {})
    step('the first confirm marks it partially confirmed', r.ok and r.get('status') == 'partially_confirmed', r)
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/confirm', {})
    step('confirming again goes ahead with the available line', r.ok and r.get('status') == 'confirmed', r)
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/preparing', {})
    step('and the pharmacy prepares it', r.ok and r.get('status') == 'preparing', r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
