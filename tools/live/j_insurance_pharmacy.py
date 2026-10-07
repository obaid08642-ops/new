"""Journey: pharmacy insurance flow (as-is, no Nphies).
Patient saves insurance -> orders with insurance -> pharmacy receives request -> pharmacy submits on own system -> pharmacy enters outcome -> patient pays copay -> notifications.
Payloads from patient-app pharmacy/insurance-* screens and provider-app pharmacy/InsuranceDecisionScreen."""
import uuid
import urllib.parse
from lib import Client, journey, step
from j_nursing import fake_pay, card_payment

MEDS = [('بنادول اكسترا 500 ملغ', 'Panadol Extra 500mg', 12.5), ('فيتامين سي 1000 ملغ', 'Vitamin C 1000mg', 25.0)]

def admin_adds_medicines(admin):
    journey('catalog: admin adds medicines for insurance test')
    ids = []
    for ar, en, price in MEDS:
        tag = uuid.uuid4().hex[:6]
        body = {'name_ar': f'{ar} {tag}', 'name_en': f'{en} {tag}', 'active_ingredient': 'paracetamol', 'generic_name': 'paracetamol',
                'manufacturer': 'GSK', 'brand': 'Panadol', 'category': 'pain', 'sub_category': '', 'form': 'tablet', 'strength': '500mg',
                'package_size': '24', 'barcode': '', 'price': price, 'requires_prescription': False, 'images': [], 'image': '',
                'description_ar': 'مسكن', 'description_en': 'pain relief', 'usage_instructions_ar': '', 'usage_instructions_en': '',
                'indications_ar': ['صداع'], 'indications_en': ['headache'], 'contraindications_ar': [], 'contraindications_en': [],
                'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
                'reason': 'إنشاء صنف جديد عبر واجهة الإدارة'}
        r = admin.post('/medicines/admin/catalog', body)
        mid = r.get('id')
        step(f'admin creates "{en}"', r.ok and mid, r)
        ids.append({'id': mid, 'name_ar': body['name_ar'], 'name_en': body['name_en'], 'price': price})
    return ids

def pharmacy_prices_items(pharm, admin, meds):
    journey('pharmacy inventory: add catalog items and get them approved')
    for m in meds:
        r = pharm.post('/provider/capabilities/pharmacy', {'sku': m['id'], 'name_ar': m['name_ar'], 'name_en': m['name_en'], 'price': m['price'] + 1, 'stock': 20, 'available': True})
        step(f"pharmacy sends {m['name_en']} for approval", r.ok and r.get('pending_review'), r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    deltas = [d for d in r.items() if d.get('target') == 'capability' and d.get('status') == 'pending']
    step('admin sees the pending inventory items', r.ok and len(deltas) >= len(meds), f'{r.status} {len(deltas)}')
    for d in deltas:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{d['id']}/approve", {'reason': 'سعر معتمد'})
        step('admin approves an inventory item', r.ok, r)
    r = pharm.get('/provider/capabilities/pharmacy')
    live = [x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('sku') in {m['id'] for m in meds}]
    step('items are live in the pharmacy inventory', len(live) == len(meds) and all(x.get('id') and x.get('price') and x.get('stock') for x in live), live)

def patient_adds_insurance(pat, admin):
    journey('insurance: patient adds policy (pharmacy flow)')
    r = pat.get('/insurance/companies')
    comps = r.body if isinstance(r.body, list) else r.items()
    step('insurance companies load', r.ok and len(comps) > 0, r)
    c = comps[0]
    net_code = f'net{uuid.uuid4().hex[:5]}'
    if c.get('id'):
        rn = admin.post(f"/insurance/companies/{c.get('id')}/networks",
                        {'code': net_code, 'name_ar': f'شبكة {net_code}', 'name_en': f'Net {net_code}', 'tier_level': 1})
        step('admin creates a network for the company', rn.ok, rn)
        net_id = (rn.body or {}).get('id') if isinstance(rn.body, dict) else None
        prof_id = pat.get('/provider-onboarding/my-profile').get('id') if False else None
        if net_id and prof_id:
            ra = admin.post(f"/insurance/providers/{prof_id}/insurance-contract",
                            {'company_id': c.get('id'), 'network_id': net_id,
                             'covered_classes': ['A', 'B', 'VIP'], 'copay_percent': 10})
            step('the provider accepts that network', ra.ok, ra)

    r = pat.post('/insurance/save-policy', {'provider': c.get('name_ar') or c.get('name_en') or c.get('code'), 'company_id': c.get('code'),
                                            'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}', 'expiry_date': '2027-12-31',
                                            'member_name': 'مريض تأمين صيدلية', 'national_id': '1098765432', 'verified': False, 'ocr_extracted': False,
                                            'network': net_code, 'class': 'A'})
    step('save-policy with add-policy payload', r.ok, r)
    r = pat.get('/insurance/my-policy')
    pol = r.get('policy') or {}
    step('my policy is saved', r.ok and r.get('has_policy'), r)
    step('policy keeps expiry and national id', pol.get('expiry_date') and pol.get('national_id'), pol)
    return c

def patient_address(pat):
    r = pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع العليا 12', 'city': 'الرياض', 'lat': 24.7140, 'lng': 46.6760, 'is_default': True})
    step('patient adds a located address', r.ok, r)
    prof = pat.get('/users/me/profile')
    addrs = prof.get('addresses') or []
    addr = next((a for a in addrs if a.get('is_default')), addrs[0] if addrs else None)
    step('checkout reads it from profile', addr and addr.get('lat') is not None, prof)
    return addr or {}

def run(pat, pharm, admin):
    company = patient_adds_insurance(pat, admin)
    pharmacy_prices_items(pharm, admin, admin_adds_medicines(admin))

    journey('pharmacy insurance: pharmacy goes online')
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('pharmacy switches to online', r.ok and r.get('instant_available') is True, r)

    journey('pharmacy insurance: patient broadcasts order with insurance')
    addr = patient_address(pat)
    found = []
    meds = admin_adds_medicines(admin)
    for m in meds:
        r = pat.get('/medicines?q=' + urllib.parse.quote(m['name_ar'].split()[0]) + '&limit=50')
        hit = next((x for x in r.items() if x.get('id') == m['id']), None)
        step(f"patient finds {m['name_en']}", r.ok and hit, r)
        found.append(m)

    draft = {
        'items': [{'raw_name': m['name_ar'], 'qty': 2 if i == 0 else 1, 'sku': m['id'], 'intake_source': 'cart'} for i, m in enumerate(found)],
        'delivery_address': {'label': addr.get('label') or 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                             'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
        'prescription_attachments': [],
        'payment_mode': 'insurance',
        'insurance_provider': company.get('code'),
    }
    k = f'mobile-pharmacy-ins-{uuid.uuid4()}'
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k})
    oid = r.get('id')
    step('create insurance order draft', r.ok and oid, r)
    if not oid:
        return

    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    step('submit = broadcast to nearby pharmacies (insurance)', r.ok, r)

    journey('pharmacy insurance: pharmacy receives broadcast with insurance details')
    r = pharm.get('/provider/pharmacy/broadcasts')
    items = r.items()
    mine = next((b for b in items if b.get('order_id') == oid), None)
    step('pharmacy sees the insurance broadcast', r.ok and mine, r)
    if not mine:
        return
    step('broadcast carries insurance_provider', mine.get('insurance_provider') == company.get('code'), mine)
    step('broadcast carries insurance_member_id', bool(mine.get('insurance_member_id')), mine)

    meds_bc = mine.get('items') or mine.get('medicines') or []
    step('broadcast carries items', len(meds_bc) == 2, mine)

    offer_items = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
                    'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in meds_bc]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': offer_items})
    offer_id = r.get('id')
    step('offer draft', r.ok and offer_id, r)
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('offer submitted', r.ok, r)

    journey('pharmacy insurance: patient selects offer (insurance coverage)')
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    offers = r.items()
    step('patient sees the offer', r.ok and offers, r)
    if not offers:
        return
    of = offers[0]
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{of.get('id') or of.get('offer_id')}/select",
                 {'coverage_mode': 'insurance'}, headers={'Idempotency-Key': f'ins-select-{uuid.uuid4()}'})
    step('select offer with insurance coverage', r.ok, r)

    journey('pharmacy insurance: pharmacy submits decision on external system -> records outcome')
    r = pharm.get('/provider/pharmacy/allocations')
    alloc = next((a for a in r.items() if a.get('order_id') == oid), None)
    step('order allocated to the pharmacy', r.ok and alloc, r)
    if not alloc:
        return
    aid = alloc.get('id')

    insurance_items = []
    for m in meds_bc:
        insurance_items.append({
            'order_item_id': str(m.get('id') or m.get('order_item_id') or ''),
            'outcome': 'approved',
            'approved_qty': int(m.get('qty_offered') or m.get('qty_requested') or 1),
            'rejected_qty': 0,
            'reject_reason': None,
            'copay_percent': 20,
            'copay_amount': 0,
        })

    r = pharm.post(f'/provider/pharmacy/orders/{oid}/insurance-decision',
                   {'idempotency_key': f'ins-dec-{uuid.uuid4().hex[:12]}',
                    'approval_reference': f'APR-{uuid.uuid4().hex[:8]}',
                    'items': insurance_items})
    step('pharmacy records insurance decision (approved with 20% copay)', r.ok, r)

    journey('pharmacy insurance: patient sees decision and pays copay')
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('order shows insurance decision', r.ok and (order.get('insurance_decision') or {}).get('outcome') == 'partial', order.get('insurance_decision'))

    rid = order.get('insurance_request_id')
    step('booking links to insurance request engine', bool(rid), order)

    if rid:
        r = pat.get(f'/insurance/requests/{rid}')
        step('insurance request is COPAY_PENDING', r.ok and r.get('state') == 'COPAY_PENDING', r)
        r = pat.get(f'/insurance/requests/{rid}/capabilities')
        step('copay: card is offered', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)

        r = pat.post(f'/payments/intent/insurance/{rid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-ins-{rid}-{uuid.uuid4()}'})
        txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
        step('copay: checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)

        if txn.get('gateway_intent_id'):
            fake_pay(txn['gateway_intent_id'])
            r = pat.post(f"/payments/verify/{txn['id']}", {})
            step('copay: paid', r.ok and r.get('status') == 'paid', r)

        import time as _time
        paid_state = None
        for _ in range(10):
            r = pat.get(f'/insurance/requests/{rid}')
            paid_state = r.get('state')
            if paid_state in ('COPAY_PAID', 'SELF_PAY_PAID'):
                break
            _time.sleep(1.5)
        step('request shows copay paid', paid_state == 'COPAY_PAID', paid_state)

        r = pat.get(f'/patient/pharmacy/orders/{oid}')
        order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
        step('order CONFIRMED after copay', r.ok and str(order.get('governed_state', '')).upper() in ('CONFIRMED', 'COMPLETED'), order.get('governed_state'))

    journey('pharmacy insurance: pharmacy fulfills and delivers')
    for action in ('confirm', 'preparing', 'ready'):
        r = pharm.post(f'/provider/pharmacy/allocations/{aid}/{action}', {})
        step(f'pharmacy: {action}', r.ok, r)
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/out-for-delivery', {'courier_name': 'مندوب', 'courier_phone': '+966500000555'})
    step('pharmacy: out for delivery', r.ok, r)
    det = pharm.get(f'/provider/pharmacy/allocations/{aid}')
    total = ((det.get('order') or {}).get('pricing_snapshot') or {}).get('totals', {}).get('total') or (alloc.get('totals') or {}).get('total')
    step('pharmacy sees amount to collect', total, det)
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/delivered', {'collection': {'method': 'insurance_copay', 'amount_collected': float(total or 0)}})
    step('pharmacy: delivered with copay collected', r.ok, r)

    journey('pharmacy insurance: notifications')
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('patient sees final state', str(order.get('governed_state', '')).upper() in ('DELIVERED', 'COMPLETED'), order.get('governed_state'))
    r = pat.post('/patient-ux/review', {'booking_kind': 'pharmacy', 'booking_id': oid, 'rating': 4, 'comment': 'توصيل سريع مع التأمين', 'aspects': {}, 'anonymous': False})
    step('patient rates the pharmacy', r.ok, r)

    journey('pharmacy insurance: admin console')
    r = admin.get('/admin/admin/orders?kind=pharmacy&limit=25')
    row = next((x for x in r.items() if x.get('id') == oid), None)
    step('admin lists the insurance order', r.ok and row, r)
    d = admin.get(f'/admin/admin/orders/pharmacy/{oid}')
    step('admin detail shows insurance decision and copay', d.ok and d.get('insurance_decision'), d)

    return oid

if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_type('pharmacy', {})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    ph = Client(p['token'], 'pharmacy')
    pat = j_accounts.app_signup(label='pharmacy-ins-patient')
    run(Client(pat['token'], 'patient'), ph, admin)
    summary()