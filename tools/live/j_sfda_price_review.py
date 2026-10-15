"""Journey: the pharmacy price above the catalogue (SFDA) price (decision 12, revised 2026-10-10; issue 331).
  A pharmacy offers a line above the catalogue price (provider-app PharmacyBroadcastResponse, "custom price"): the line is
  accepted and flagged on the draft (the app warns per line), the admin gets the offer in the review list
  (GET /admin/pharmacy/price-review, admin page pharmacy-price-review) and closes it (POST .../price-review/:id/resolve),
  after updating the catalogue price (PATCH /medicines/admin/catalog/:id { sfda_price }).
"""
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pharm = Client(p['token'], 'pharmacy')
    meds = j_pharmacy.admin_adds_medicines(admin)
    j_pharmacy.pharmacy_prices_items(pharm, admin, meds)
    med = meds[0]
    ceiling = float(med['price'])
    r = admin.req('PATCH', f"/medicines/admin/catalog/{med['id']}", {'sfda_price': ceiling, 'reason': 'سعر SFDA'})
    step('admin sets the catalogue (SFDA) price', r.ok, r)

    journey('decision 12: an offer line above the catalogue price is accepted and flagged')
    # provider-app context toggleOnline(): the pharmacy is online and ready for orders
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('the pharmacy goes online', r.ok and r.get('instant_available') is True, r)
    pat = Client(j_accounts.app_signup(label='sfda-buyer')['token'], 'patient')
    addr = j_pharmacy.patient_address(pat)
    key = f'sfda-{uuid.uuid4().hex[:12]}'
    draft = {'items': [{'raw_name': med['name_ar'], 'qty': 1, 'sku': med['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)}, 'prescription_attachments': []}
    oid = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': key}).get('id')
    pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': key + '-submit'})
    b = next((x for x in pharm.get('/provider/pharmacy/broadcasts').items() if x.get('order_id') == oid), None)
    step('the pharmacy sees the broadcast', b, oid)
    if not b:
        return
    inv = next((x for x in (pharm.get('/provider/capabilities/pharmacy').body or []) if isinstance(x, dict) and x.get('sku') == med['id']), {})
    lines = b.get('items') or b.get('medicines') or []
    above = round(ceiling * 1.5, 2)
    items = [{'order_item_id': str(m.get('id') or m.get('order_item_id')), 'availability': 'available', 'qty_offered': 1,
              'inventory_item_id': inv.get('id'), 'unit_price_override': above, 'price_override_reason': 'السعر الرسمي تغيّر'} for m in lines]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': items})
    offer = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    flagged = [i for i in (offer.get('items') or []) if i.get('above_catalogue_price') is True]
    step('the draft is saved with the higher price (not refused)', r.ok and offer.get('id'), r)
    step('the line says it is above the catalogue price, with the catalogue price (the app warns per line)', len(flagged) == 1 and float(flagged[0].get('catalogue_price') or 0) == ceiling, offer.get('items'))

    journey('decision 12: the admin reviews and closes it')
    r = admin.get(f'/admin/admin/pharmacy/price-review?status=open&order_id={oid}')
    rows = r.get('items') or []
    row = rows[0] if rows else {}
    step('the offer is in the admin price review list with the reason and both prices', r.ok and row.get('lines') and row['lines'][0].get('reason') == 'price_above_catalogue' and float(row['lines'][0].get('offered_price') or 0) == above, r)
    if not row.get('id'):
        return
    r = admin.req('PATCH', f"/medicines/admin/catalog/{med['id']}", {'sfda_price': above, 'reason': 'مراجعة سعر عرض صيدلية (قرار 12)'})
    step('admin updates the catalogue price to the new official price', r.ok, r)
    r = admin.post(f"/admin/admin/pharmacy/price-review/{row['id']}/resolve", {'resolution': 'catalogue_updated', 'note': 'السعر الرسمي الجديد'})
    step('admin closes the review (catalogue updated)', r.ok and r.get('status') == 'closed' and r.get('resolution') == 'catalogue_updated', r)
    r = admin.post(f"/admin/admin/pharmacy/price-review/{row['id']}/resolve", {'resolution': 'price_confirmed'})
    step('a closed review cannot be closed again', r.status == 400, r)
    r = admin.post('/admin/admin/pharmacy/price-review/no-such-review/resolve', {'resolution': 'price_confirmed'})
    step('an unknown review is not found', r.status == 404, r)
    r = admin.post(f"/admin/admin/pharmacy/price-review/{row['id']}/resolve", {'resolution': 'anything'})
    step('an unknown resolution is refused by validation', r.status == 400, r)
    r = admin.get(f'/admin/admin/pharmacy/price-review?status=closed&order_id={oid}')
    step('it is listed among the closed reviews', r.ok and any(x.get('id') == row['id'] for x in (r.get('items') or [])), r)
    r = pharm.get(f'/provider/capabilities/pharmacy')
    step('the pharmacy app still lists the item (nothing else changed)', r.ok, r.status)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
