"""Journey: an insurance order card on the pharmacy Orders tab carries its own decision button
(provider-journeys needs-review line 22, scenario "Pharmacy: request to hand over", step "prepare").

The patient selects a pharmacy offer with insurance coverage, so the order waits for the pharmacy to record
the insurer's decision (relay only, owner decision 35). The pharmacy's allocation list
(GET /provider/pharmacy/allocations, provider-app DispatchWorkflowScreen) must mark that row with
awaits_insurance_decision, the decision recorded from that row (the inline button opens
PharmacyInsuranceDecisionForAllocation: allocation detail, then the existing
POST /provider/pharmacy/orders/:id/insurance-decision) must work, and the mark must clear afterwards.
Order payloads copied from j_pharmacy.matrix_pharmacy (delivery x insurance).
"""
import uuid

from lib import Client, journey, step

KEY = lambda tag: f'mobile-{tag}-{uuid.uuid4()}'


def alloc_row(pharm, oid):
    r = pharm.get('/provider/pharmacy/allocations')
    return r, next((a for a in r.items() if a.get('order_id') == oid), None)


def run(admin, pat, pharm):
    import j_onboarding
    from j_pharmacy import admin_adds_medicines, pharmacy_prices_items, patient_address
    meds = admin_adds_medicines(admin)
    pharmacy_prices_items(pharm, admin, meds)

    journey('pharmacy insurance inline: the patient selects an offer with insurance coverage')
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('pharmacy is online', r.ok, r)
    addr = patient_address(pat)
    rx = j_onboarding.upload(pat, 'rx-ins-inline.png', 'image/png')
    draft = {
        'items': [{'raw_name': m['name_ar'], 'qty': 1, 'sku': m['id'], 'intake_source': 'cart'} for m in meds[:2]],
        'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                             'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
        'fulfillment': 'delivery',
        'payment_mode': 'insurance',
        'prescription_attachments': [rx] if rx else [],
    }
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': KEY('ins-inline')})
    oid = r.get('id')
    step('insurance draft with a prescription created', r.ok and oid, r)
    if not oid:
        return
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': KEY('ins-inline-submit')})
    step('insurance order submitted', r.ok, r)
    r = pharm.get('/provider/pharmacy/broadcasts')
    mine = next((b for b in r.items() if b.get('order_id') == oid), None)
    step('the pharmacy sees the insurance request', r.ok and mine, f'{r.status} {len(r.items())} broadcasts')
    if not mine:
        return
    lines = mine.get('items') or mine.get('medicines') or []
    offer_items = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
                    'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in lines]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': offer_items})
    offer_id = r.get('id')
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('pharmacy submits an offer', r.ok, r)
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    offers = r.items()
    step('the patient sees the offer', r.ok and offers, r.status)
    if not offers:
        return
    of = offers[0]
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{of.get('id') or of.get('offer_id')}/select",
                 {'coverage_mode': 'insurance'}, headers={'Idempotency-Key': KEY('ins-inline-select')})
    step('offer selected with insurance coverage', r.ok, r)
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    step('the order waits for the insurance decision', o.ok and str(order.get('status')) == 'insurance_decision_pending', order.get('status'))

    journey('pharmacy insurance inline: the Orders list marks the card and the decision is made from it')
    r, row = alloc_row(pharm, oid)
    step('the allocation list has the selected order', r.ok and row, f'{r.status} {len(r.items())} rows')
    if not row:
        return
    step('its row says it awaits the insurance decision', row.get('awaits_insurance_decision') is True, row.get('awaits_insurance_decision'))
    others = [a for a in r.items() if a.get('order_id') != oid and a.get('awaits_insurance_decision') is True]
    step('no other row of this pharmacy is marked', not others, [a.get('order_id') for a in others])
    # The inline button: PharmacyInsuranceDecisionForAllocation loads the allocation detail, the existing
    # form posts per-item outcomes for detail.items to /provider/pharmacy/orders/<detail.order.id>/insurance-decision.
    d = pharm.get(f"/provider/pharmacy/allocations/{row['id']}")
    detail = d.body.get('data', d.body) if isinstance(d.body, dict) and isinstance(d.body.get('data'), dict) else (d.body if isinstance(d.body, dict) else {})
    items = detail.get('items') or []
    step('the card opens the order detail with its items', d.ok and (detail.get('order') or {}).get('id') == oid and items, d)
    decisions = [{'order_item_id': str(i.get('order_item_id') or ''), 'outcome': 'approved', 'approved_qty': int(i.get('qty_offered') or 0)} for i in items]
    k = KEY('ins-inline-decide')
    r = pharm.post(f'/provider/pharmacy/orders/{oid}/insurance-decision',
                   {'idempotency_key': k, 'approval_reference': f'APR-{uuid.uuid4().hex[:8]}', 'items': decisions})
    step('the pharmacy records the insurer decision from that card', r.ok and r.get('decision', 'outcome') == 'full', r)

    journey('pharmacy insurance inline: the mark clears once the decision is recorded')
    r, row = alloc_row(pharm, oid)
    step('the row no longer awaits a decision', r.ok and row and row.get('awaits_insurance_decision') is False, row and row.get('awaits_insurance_decision'))
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    step('the patient sees the order covered by insurance', o.ok and (order.get('insurance_decision') or {}).get('outcome') == 'full'
         and str(order.get('status')) != 'insurance_decision_pending', f"{order.get('status')} {order.get('insurance_decision')}")


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pat = j_accounts.app_signup(label='ins-inline-patient')
    run(admin, Client(pat['token'], 'patient'), Client(p['token'], 'pharmacy'))
    summary()
