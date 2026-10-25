"""Journey: the pharmacy price above the catalogue (SFDA) price (decision 12, revised 2026-10-10; issue 331).
  A pharmacy offers a line above the catalogue price (provider-app PharmacyBroadcastResponse, "custom price"): the line is
  accepted and flagged on the draft (the app warns per line), and since the owner decision of 2026-10-25 (which supersedes
  decision 12) each such line is a price review of its own (GET /admin/pharmacy/price-reviews, admin page price-reviews)
  that the admin decides once with a reason: update the catalogue (POST .../:id/update-catalogue), dismiss, warn, suspend,
  block or penalise. The older queue (GET /admin/pharmacy/price-review) keeps only the lines that map to no catalogue item.
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

    journey('owner decision 2026-10-25: the admin reviews the price above the catalogue and decides once')
    r = admin.get('/admin/admin/pharmacy/price-reviews?status=open&limit=100')
    row = next((x for x in (r.get('items') or []) if x.get('order_id') == oid), {})
    step('the line is in the admin price review list with the catalogue price, the offered price and the percent above',
         r.ok and bool(row.get('id')) and float(row.get('offered_price') or 0) == above and float(row.get('catalogue_price') or 0) == ceiling and float(row.get('percent_above') or 0) > 0, r)
    if not row.get('id'):
        return
    r = admin.post(f"/admin/admin/pharmacy/price-reviews/{row['id']}/dismiss", {})
    step('a decision needs a reason (400 without a note)', r.status == 400, r)
    r = admin.post(f"/admin/admin/pharmacy/price-reviews/{row['id']}/update-catalogue", {'note': 'السعر الرسمي الجديد'})
    step('admin updates the catalogue price to the offered one (the review is closed as catalogue_updated)', r.ok and r.get('status') == 'catalogue_updated', r)
    r = admin.post(f"/admin/admin/pharmacy/price-reviews/{row['id']}/dismiss", {'note': 'مرة ثانية'})
    step('a decided review cannot be decided again (409)', r.status == 409, r)
    r = admin.post('/admin/admin/pharmacy/price-reviews/no-such-review/dismiss', {'note': 'غير موجود'})
    step('an unknown review is not found (404)', r.status == 404, r)
    r = admin.get(f'/admin/admin/pharmacy/price-reviews?status=catalogue_updated&limit=100')
    step('it is listed among the decided reviews', r.ok and any(x.get('id') == row['id'] for x in (r.get('items') or [])), r)
    r = pharm.get(f'/provider/capabilities/pharmacy')
    step('the pharmacy app still lists the item (nothing else changed)', r.ok, r.status)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
