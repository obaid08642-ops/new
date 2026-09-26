"""Journey: pharmacy order, patient-app -> pharmacy (provider-app) -> patient -> delivery -> admin.
Payloads copied from patient-app app/pharmacy/{checkout,broadcast-status,final-quote}.tsx,
src/utils/pharmacy-draft.ts and provider-app screens/pharmacy/PharmacyDashboard.tsx."""
import uuid, urllib.parse
from lib import Client, journey, step

KEY = lambda tag: f'mobile-{tag}-{uuid.uuid4()}'


def patient_address(pat):
    # shared/location-picker: { label, street, city, lat, lng, is_default }
    r = pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع العليا 12', 'city': 'الرياض', 'lat': 24.7140, 'lng': 46.6760, 'is_default': True})
    step('patient adds a located address', r.ok, r)
    prof = pat.get('/users/me/profile')
    addrs = prof.get('addresses') or []
    addr = next((a for a in addrs if a.get('is_default')), addrs[0] if addrs else None)
    step('checkout reads it from /users/me/profile', addr and addr.get('lat') is not None, prof)
    return addr or {}


MEDS = [('بنادول اكسترا 500 ملغ', 'Panadol Extra 500mg', 12.5), ('فيتامين سي 1000 ملغ', 'Vitamin C 1000mg', 25.0)]


def admin_adds_medicines(admin):
    # admin/src/pages/admin/medicines-catalog.tsx saveForm (create)
    journey('catalog: admin adds medicines')
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
    # provider-app ActiveInventoryScreen: add from catalog (sku = catalog medicine id) -> admin approval
    journey('pharmacy inventory: add catalog items and get them approved')
    for m in meds:
        r = pharm.post('/provider/capabilities/pharmacy', {'sku': m['id'], 'name_ar': m['name_ar'], 'name_en': m['name_en'], 'price': m['price'] + 1, 'stock': 20, 'available': True})
        step(f"pharmacy sends {m['name_en']} for approval", r.ok and r.get('pending_review'), r)
    r = admin.get('/providers/provider-deltas')
    deltas = [d for d in r.items() if d.get('target') == 'capability' and d.get('status') == 'pending']
    step('admin sees the pending inventory items', r.ok and len(deltas) >= len(meds), f'{r.status} {len(deltas)}')
    for d in deltas:
        r = admin.post(f"/providers/provider-deltas/{d['id']}/approve", {'reason': 'سعر معتمد'})
        step('admin approves an inventory item', r.ok, r)
    r = pharm.get('/provider/capabilities/pharmacy')
    live = [x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('sku') in {m['id'] for m in meds}]
    step('items are live in the pharmacy inventory (with id, price, stock)', len(live) == len(meds) and all(x.get('id') and x.get('price') and x.get('stock') for x in live), live)


def run(pat, pharm, admin=None, meds=None):
    journey('pharmacy order: pharmacy goes online')
    # provider-app context toggleOnline(): raw fetch, no idempotency key
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('pharmacy switches to "online - ready for orders"', r.ok and r.get('instant_available') is True, r)
    journey('pharmacy order: patient broadcasts a request')
    addr = patient_address(pat)
    # patient-app: search -> product-detail addItem({ id: med.id, name }) -> pharmacy-draft sku = item.sku || item.id
    found = []
    for m in meds or []:
        r = pat.get('/medicines?q=' + urllib.parse.quote(m['name_ar'].split()[0]) + '&limit=50')
        hit = next((x for x in r.items() if x.get('id') == m['id']), None)
        step(f"patient finds {m['name_en']} in search", r.ok and hit, f'{r.status} {len(r.items())} results')
        found.append(m)
    draft = {
        'items': [{'raw_name': m['name_ar'], 'qty': 2 if i == 0 else 1, 'sku': m['id'], 'intake_source': 'cart'} for i, m in enumerate(found)],
        'delivery_address': {'label': addr.get('label') or 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                             'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
        'prescription_attachments': [],
    }
    k = KEY('pharmacy-broadcast')
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k})
    oid = r.get('id')
    step('create order draft', r.ok and oid, r)
    if not oid:
        return
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    step('submit = broadcast to nearby pharmacies', r.ok, r)

    journey('pharmacy order: pharmacy answers with an offer')
    r = pharm.get('/provider/pharmacy/broadcasts')
    items = r.items()
    mine = next((b for b in items if b.get('order_id') == oid), None)
    step('the nearby pharmacy sees the broadcast', r.ok and mine, f'{r.status} {len(items)} broadcasts')
    if not mine:
        return oid
    meds = mine.get('items') or mine.get('medicines') or []
    step('broadcast carries its items', len(meds) == 2, mine)
    offer_items = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
                    'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in meds]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': offer_items})
    offer_id = r.get('id')
    step('offer draft', r.ok and offer_id, r)
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('offer submitted', r.ok, r)

    journey('pharmacy order: patient picks the offer and confirms')
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    offers = r.items()
    step('patient sees the offer', r.ok and offers, r)
    if not offers:
        return oid
    of = offers[0]
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{of.get('id') or of.get('offer_id')}/select", {'coverage_mode': 'cash'}, headers={'Idempotency-Key': KEY('offer')})
    step('select offer (cash)', r.ok, r)
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    state = order.get('governed_state')
    step('order state after selection', o.ok and state, o)
    if state == 'FINAL_QUOTE_READY' or order.get('selected_offer_hash'):
        h = order.get('pending_final_quote_hash') if state == 'FINAL_QUOTE_READY' else order.get('selected_offer_hash')
        rev = order.get('pending_final_quote_revision') if state == 'FINAL_QUOTE_READY' else order.get('selected_offer_revision')
        r = pat.post(f'/patient/pharmacy/orders/{oid}/final-quote/accept', {'quote_hash': h, 'quote_revision': rev}, headers={'Idempotency-Key': KEY('final-quote')})
        step('accept final quote', r.ok, r)
    r = pat.post(f'/patient/pharmacy/orders/{oid}/cod/register', None, headers={'Idempotency-Key': KEY('cod')})
    step('register cash on delivery', r.ok, r)

    if admin:
        journey('pharmacy order: platform cash-on-delivery policy (admin config-portal)')
        r = admin.get('/pharmacy/fulfillment-policies')
        cod = next((x for x in (r.body if isinstance(r.body, list) else []) if x.get('id') == 'platform-cod'), None)
        step('default platform COD policy exists and is active', r.ok and cod and cod.get('active') is True, r)
    journey('pharmacy order: pharmacy fulfils and delivers')
    r = pharm.get('/provider/pharmacy/allocations')
    alloc = next((a for a in r.items() if oid in (a.get('order_id'), a.get('id'), a.get('pharmacy_order_id'))), None)
    step('order allocated to the pharmacy', r.ok and alloc, f'{r.status} {[a.get("order_id") or a.get("id") for a in r.items()][:5]}')
    if not alloc:
        return oid
    aid = alloc.get('id')
    det = pharm.get(f'/provider/pharmacy/allocations/{aid}')
    step('allocation detail', det.ok, det)
    for action in ('confirm', 'preparing', 'ready'):
        r = pharm.post(f'/provider/pharmacy/allocations/{aid}/{action}', {})
        step(f'pharmacy: {action}', r.ok, r)
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/out-for-delivery', {'courier_name': 'مندوب', 'courier_phone': '+966500000555'})
    step('pharmacy: out for delivery', r.ok, r)
    # PharmacyDashboard: expectedTotal = detail.order.pricing_snapshot.totals.total ?? allocation.totals.total
    total = ((det.get('order') or {}).get('pricing_snapshot') or {}).get('totals', {}).get('total') or (alloc.get('totals') or {}).get('total')
    step('pharmacy sees the amount to collect', total, det)
    r = pharm.post(f'/provider/pharmacy/allocations/{aid}/delivered', {'collection': {'method': 'cash', 'amount_collected': float(total or 0)}})
    step('pharmacy: delivered with cash collected', r.ok, f'{r} (expected_total={total})')

    journey('pharmacy order: everyone sees the final state')
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    step('patient sees it delivered', str(order.get('governed_state', '')).upper() in ('DELIVERED', 'COMPLETED'), order.get('governed_state'))
    pharmacy_screens(pharm, oid, total)
    if admin:
        admin_console(admin, oid)
    return oid


# Every GET the pharmacy's screens make (provider-app PharmacyDashboard, ProviderHome, BlueprintScreens shared tabs).
PHARMACY_SCREEN_GETS = ['/provider/dashboard/stats', '/provider/profile', '/provider/pharmacy/allocations', '/provider/pharmacy/broadcasts',
                        '/provider/capabilities/pharmacy', '/provider/pharmacy/inventory-tracking', '/pharmacy/chat/threads',
                        '/pharmacy/procurement/my-requests', '/pharmacy/returns/provider/list', '/pharmacy/inventory/expiry',
                        '/provider/inventory/search?q=a', '/provider/crm', '/provider/jobs/queue?status=active', '/provider/ops/wallet/ledger',
                        '/provider/promotions', '/provider/referral-network', '/provider/reviews', '/referrals/my', '/provider-onboarding/my-profile',
                        '/provider/stats/today', '/provider/stats/period?period=month', '/provider/settlements']


def pharmacy_screens(pharm, oid, total):
    journey('pharmacy screens: every tab loads after a delivered order')
    for path in PHARMACY_SCREEN_GETS:
        r = pharm.get(path)
        step(f'GET {path}', r.ok, r)
    # views that are about this pharmacy's orders must count the delivered one
    r = pharm.get('/provider/dashboard/stats')
    step('home stats count the delivered order', r.ok and any(isinstance(v, (int, float)) and v > 0 for v in (r.body.get('data', r.body) if isinstance(r.body, dict) else {}).values()), r)
    r = pharm.get('/provider/settlements')
    step('settlement statement includes the order', r.ok and oid in str(r.body), r)
    r = pharm.get('/provider/crm')
    step('pharmacy CRM lists the patient', r.ok and len(r.items()) > 0, r)


def admin_console(admin, oid):
    # admin/src/pages/admin/orders/index.tsx + [kind]/[id].tsx
    journey('admin orders console: list + detail of the delivered order')
    r = admin.get('/orders?kind=pharmacy&limit=25&page=1&sort=newest')
    row = next((x for x in r.items() if x.get('id') == oid), None)
    step('console lists it', r.ok and row, r.status)
    step('row carries status, patient and amount the table shows', row and row.get('status') in ('delivered', 'completed') and (row.get('patient') or {}).get('id') and row.get('amount', 0) > 0, row)
    r = admin.get(f"/orders?kind=pharmacy&status={str((row or {}).get('status') or 'completed').upper()}&limit=25")
    step('status filter (any casing) finds it', r.ok and oid in [x.get('id') for x in r.items()], r.status)
    d = admin.get(f'/orders/pharmacy/{oid}')
    step('detail opens with the order and its timeline', d.ok and (d.get('order') or {}).get('id') == oid and len(d.get('timeline') or []) > 0 and all('at' in e for e in d.get('timeline')), d)
    r = admin.post(f'/orders/pharmacy/{oid}/note', {'note': 'تم التواصل مع العميل وتأكيد الاستلام'})
    step('internal note', r.ok, r)
    r = admin.post(f'/orders/pharmacy/{oid}/cancel', {'reason': 'اختبار إلغاء طلب مُسلَّم'})
    step('cancelling a delivered order is refused', r.status == 400, r)
    r = admin.post(f'/orders/pharmacy/{oid}/reassign', {'provider_id': 'x', 'reason': 'تحويل لصيدلية أخرى'})
    step('reassign is refused for allocation-managed orders (clear error)', r.status == 400, r)


def open_order(pat, pharm, meds, addr):
    """Draft + submit + the pharmacy's offer + patient selection: an order holding an allocation (stock reserved)."""
    draft = {'items': [{'raw_name': meds[0]['name_ar'], 'qty': 1, 'sku': meds[0]['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)}, 'prescription_attachments': []}
    k = KEY('pharmacy-broadcast')
    oid = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k}).get('id')
    pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    bl = pharm.get('/provider/pharmacy/broadcasts')
    b = next((x for x in bl.items() if x.get('order_id') == oid), None)
    step('pharmacy sees the new broadcast', b, bl)
    if not b:
        return oid, None
    its = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
            'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in (b.get('items') or b.get('medicines') or [])]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': its})
    of = r.get('id')
    r2 = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{of}/submit')
    step('offer drafted and submitted', r.ok and r2.ok, f'{r} / {r2}')
    o = (pat.get(f'/patient/pharmacy/orders/{oid}/offers').items() or [{}])[0]
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{o.get('id')}/select", {'coverage_mode': 'cash'}, headers={'Idempotency-Key': KEY('offer')})
    step('patient selects the offer', r.ok, r)
    order = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = order.body.get('data', order.body) if isinstance(order.body, dict) else {}
    if order.get('governed_state') == 'FINAL_QUOTE_READY' or order.get('selected_offer_hash'):
        fq = order.get('governed_state') == 'FINAL_QUOTE_READY'
        pat.post(f'/patient/pharmacy/orders/{oid}/final-quote/accept', {'quote_hash': order.get('pending_final_quote_hash' if fq else 'selected_offer_hash'),
                 'quote_revision': order.get('pending_final_quote_revision' if fq else 'selected_offer_revision')}, headers={'Idempotency-Key': KEY('final-quote')})
    pat.post(f'/patient/pharmacy/orders/{oid}/cod/register', None, headers={'Idempotency-Key': KEY('cod')})
    alloc = next((a for a in pharm.get('/provider/pharmacy/allocations').items() if a.get('order_id') == oid), None)
    return oid, alloc


def stock_of(pharm, sku):
    r = pharm.get('/provider/capabilities/pharmacy')
    it = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('sku') == sku), {})
    return it.get('stock')


def cancellations(pat, pharm, admin, meds):
    addr = (pat.get('/users/me/profile').get('addresses') or [{}])[0]
    journey('cancel: admin cancels an allocated order from the console')
    before = stock_of(pharm, meds[0]['id'])
    oid, alloc = open_order(pat, pharm, meds, addr)
    held = stock_of(pharm, meds[0]['id'])
    step('order allocated to the pharmacy', alloc, oid)
    r = admin.post(f'/orders/pharmacy/{oid}/cancel', {'reason': 'طلب العميل الإلغاء عبر الدعم'})
    step('admin cancel', r.ok and r.get('state') == 'cancelled', r)
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    step('patient sees it cancelled', str(order.get('status')) == 'cancelled', order.get('status'))
    if alloc:
        a = pharm.get(f"/provider/pharmacy/allocations/{alloc['id']}")
        st = (a.get('allocation') or a.body or {}).get('status') if isinstance(a.body, dict) else None
        step("pharmacy's allocation is released", st == 'cancelled', a)
    after = stock_of(pharm, meds[0]['id'])
    step('reserved stock is returned to the pharmacy', after == before, f'before={before} while_allocated={held} after={after}')
    d = admin.get(f'/orders/pharmacy/{oid}')
    step('audit trail: console timeline shows the admin cancel', d.ok and any('admin' in str(e.get('to')) or 'admin' in str(e.get('note')) for e in d.get('timeline') or []), d.get('timeline'))

    journey('inventory tracking ON (provider-app switch): stock reserved on selection, returned on cancel')
    r = pharm.put('/provider/pharmacy/inventory-tracking', {'inventory_tracking': True})
    step('pharmacy turns inventory tracking on', r.ok and r.get('inventory_tracking') is True, r)
    step('the switch reads back on', pharm.get('/provider/pharmacy/inventory-tracking').get('inventory_tracking') is True, '')
    before = stock_of(pharm, meds[0]['id'])
    oid, alloc = open_order(pat, pharm, meds, addr)
    held = stock_of(pharm, meds[0]['id'])
    step('selection reserves stock (-1)', alloc and held == before - 1, f'before={before} held={held}')
    r = admin.post(f'/orders/pharmacy/{oid}/cancel', {'reason': 'طلب العميل الإلغاء عبر الدعم'})
    step('admin cancel', r.ok, r)
    after = stock_of(pharm, meds[0]['id'])
    step('cancel returns exactly the reserved stock', after == before, f'before={before} held={held} after={after}')
    pharm.put('/provider/pharmacy/inventory-tracking', {'inventory_tracking': False})

    journey('cancel: patient cancels from broadcast-status')
    oid, alloc = open_order(pat, pharm, meds, addr)
    r = pat.post(f'/patient/pharmacy/orders/{oid}/cancel', {'reason': 'patient_requested'}, headers={'Idempotency-Key': KEY('pharmacy-cancel')})
    step('patient cancel', r.ok, r)
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    step('order is cancelled', str(order.get('status')) == 'cancelled', order.get('status'))
    r = pat.post(f'/patient/pharmacy/orders/{oid}/cancel', {'reason': 'patient_requested'}, headers={'Idempotency-Key': KEY('pharmacy-cancel')})
    step('second cancel is refused, not a 500', r.status == 400, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pat = j_accounts.app_signup(label='buyer')
    meds = admin_adds_medicines(admin)
    ph = Client(p['token'], 'pharmacy')
    pharmacy_prices_items(ph, admin, meds)
    pc = Client(pat['token'], 'patient')
    run(pc, ph, admin, meds)
    cancellations(pc, ph, admin, meds)
    summary()
