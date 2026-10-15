"""Journey: a substitute for a prescription-only line stays inside the prescription (issue 1440, part 2).
  The patient orders a prescription-only medicine with a prescription; the pharmacy answers with a substitute from its
  own inventory (provider-app offer line availability "substitute"). Only a generic switch is accepted: the same active
  ingredient, strength and form. A different strength, form or molecule is refused with substitute_outside_prescription,
  even though the pharmacy listed it as a substitute for the ordered item.
"""
import uuid

from lib import Client, journey, step

KEY = lambda tag: f'mobile-{tag}-{uuid.uuid4()}'


def rx_medicine(admin, name, ingredient, strength, form):
    # admin/src/pages/admin/medicines-catalog.tsx saveForm (create)
    tag = uuid.uuid4().hex[:6]
    body = {'name_ar': f'{name} {tag}', 'name_en': f'{name} {tag}', 'active_ingredient': ingredient, 'generic_name': ingredient,
            'manufacturer': 'Nabd QA', 'brand': name, 'category': 'antibiotics', 'sub_category': '', 'form': form, 'strength': strength,
            'package_size': '20', 'barcode': '', 'price': 30, 'requires_prescription': True, 'images': [], 'image': '',
            'description_ar': 'مضاد حيوي', 'description_en': 'antibiotic', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف بوصفة للاختبار الحي'}
    r = admin.post('/medicines/admin/catalog', body)
    step(f'admin creates prescription-only {name} {strength} {form}', r.ok and r.get('id'), r)
    return {'id': r.get('id'), 'name_ar': body['name_ar'], 'name_en': body['name_en']}


def run(admin, pat, pharm):
    import j_onboarding
    from j_pharmacy import patient_address
    journey('rx substitute: catalogue and the pharmacy inventory')
    ordered = rx_medicine(admin, 'Amoxil', 'amoxicillin', '500mg', 'capsule')
    generic = rx_medicine(admin, 'Amoxicillin Generic', 'amoxicillin', '500mg', 'capsule')
    weaker = rx_medicine(admin, 'Amoxil', 'amoxicillin', '250mg', 'capsule')
    other = rx_medicine(admin, 'Zithromax', 'azithromycin', '500mg', 'tablet')
    if not all(m['id'] for m in (ordered, generic, weaker, other)):
        return
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('pharmacy is online', r.ok, r)
    # provider-app PharmacyDashboard inventory form: substitute_skus lists the item each one may replace
    for m, subs in ((ordered, []), (generic, [ordered['id']]), (weaker, [ordered['id']]), (other, [ordered['id']])):
        r = pharm.post('/provider/capabilities/pharmacy', {'sku': m['id'], 'name_ar': m['name_ar'], 'name_en': m['name_en'], 'price': 31,
                                                          'stock': 20, 'available': True, 'substitute_skus': subs})
        step(f"pharmacy lists {m['name_en']}", r.ok, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    for d in [d for d in r.items() if d.get('target') == 'capability' and d.get('status') == 'pending']:
        admin.post(f"/admin/admin/providers/provider-deltas/{d['id']}/approve", {'reason': 'سعر معتمد'})
    r = pharm.get('/provider/capabilities/pharmacy')
    inv = {x.get('sku'): x.get('id') for x in (r.body if isinstance(r.body, list) else r.items())}
    step('the four items are live in the pharmacy inventory', all(inv.get(m['id']) for m in (ordered, generic, weaker, other)), inv)

    journey('rx substitute: the patient orders the prescription-only medicine with a prescription')
    addr = patient_address(pat)
    rx = j_onboarding.upload(pat, 'rx.png', 'image/png')
    draft = {'items': [{'raw_name': ordered['name_ar'], 'qty': 1, 'sku': ordered['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
             'prescription_attachments': [rx] if rx else []}
    k = KEY('rx-sub')
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k})
    oid = r.get('id')
    step('order draft with the prescription', r.ok and oid, r)
    if not oid:
        return
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    step('submitted to nearby pharmacies', r.ok, r)
    r = pharm.get('/provider/pharmacy/broadcasts')
    mine = next((b for b in r.items() if b.get('order_id') == oid), None)
    step('the pharmacy sees the request', r.ok and mine, r.status)
    if not mine:
        return
    line = (mine.get('items') or mine.get('medicines') or [{}])[0]
    line_id = str(line.get('id') or line.get('order_item_id') or '')

    journey('rx substitute: only a generic switch is accepted for the prescription line')
    def offer_with(m):
        return pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': [
            {'order_item_id': line_id, 'availability': 'substitute', 'substitute_inventory_item_id': inv.get(m['id']), 'qty_offered': 1}]})
    for m, why in ((weaker, 'a different strength'), (other, 'a different molecule and form')):
        r = offer_with(m)
        step(f'substitute with {why} is refused (substitute_outside_prescription)',
             r.status == 400 and 'substitute_outside_prescription' in str(r.body), r)
    r = offer_with(generic)
    offer_id = r.get('id')
    step('the generic (same ingredient, strength and form) is accepted as the substitute', r.ok and offer_id, r)
    if not offer_id:
        return
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('the offer with the generic is sent to the patient', r.ok, r)

    journey('rx substitute: after the card payment the order cannot be changed, so it is never stuck (issue 1440, part 1)')
    from j_nursing import card_payment
    r = pat.post(f'/patient/pharmacy/orders/{oid}/offers/{offer_id}/select', {'coverage_mode': 'cash'}, headers={'Idempotency-Key': KEY('rx-sub-select')})
    step('the patient picks the offer with the generic', r.ok, r)
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    if order.get('governed_state') == 'FINAL_QUOTE_READY' or order.get('selected_offer_hash'):
        fq = order.get('governed_state') == 'FINAL_QUOTE_READY'
        r = pat.post(f'/patient/pharmacy/orders/{oid}/final-quote/accept',
                     {'quote_hash': order.get('pending_final_quote_hash' if fq else 'selected_offer_hash'),
                      'quote_revision': order.get('pending_final_quote_revision' if fq else 'selected_offer_revision')},
                     headers={'Idempotency-Key': KEY('rx-sub-quote')})
        step('the patient accepts the final quote', r.ok, r)
    step('the patient pays by card', bool(card_payment(pat, 'pharmacy', oid)), 'no payment')
    r = pharm.get('/provider/pharmacy/allocations')
    alloc = next((a for a in r.items() if oid in (a.get('order_id'), a.get('id'))), None)
    step('the order is allocated to the pharmacy', r.ok and alloc, r.status)
    if not alloc:
        return
    item_id = ((alloc.get('items') or [{}])[0]).get('id')
    for body, what in (({'action': 'unavailable'}, 'mark the paid item unavailable'),
                       ({'action': 'substitute', 'substitute_sku': weaker['id']}, 'swap the paid item')):
        r = pharm.post(f"/provider/pharmacy/allocations/{alloc['id']}/items/{item_id}", body)
        step(f'the pharmacy cannot {what} (selected_offer_immutable)', r.status == 400 and 'selected_offer_immutable' in str(r.body), r)
    r = pharm.post(f"/provider/pharmacy/allocations/{alloc['id']}/confirm", {})
    step('the paid order goes on: the pharmacy confirms it', r.ok, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pat = j_accounts.app_signup(label='rx-sub-patient')
    run(admin, Client(pat['token'], 'patient'), Client(p['token'], 'pharmacy'))
    summary()
