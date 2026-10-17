"""Journey (decision 30 "insurance chosen first"; needs-review journeys 9 and 24, issues 1018 and 1033).

Insurance or self-pay is chosen when the pharmacy request is sent, not per order offer:
  - the request carries the choice (the app checkout's and the web checkout's body: payment_mode and payment_method),
    and the order keeps it (GET /patient/pharmacy/orders/:id, what both offers screens read);
  - the website's offers page draws the choice made at the start and no insurance / cash radio per offer, even for a
    pharmacy that takes insurance;
  - the offer is selected with the order's own choice (coverage_mode = payment_mode), so the insurance order goes to
    the pharmacy's insurance decision; a self-pay order is never asked about insurance.
Stack: backend :8002, patient-web :3100 (signed in through the website's /api/auth/login).
"""
import os
import uuid

from lib import Client, WebClient, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
HTML = {'accept': 'text/html'}
KEY = lambda tag: f'mobile-{tag}-{uuid.uuid4()}'


def order_of(pat, oid):
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    return o, (o.body.get('data', o.body) if isinstance(o.body, dict) else {})


def send(pat, addr, meds, mode, rx=None):
    """The body the app checkout builds (buildPatientPharmacyDraft) and the web checkout sends (buildBroadcastBody)."""
    draft = {
        'items': [{'raw_name': m['name_ar'], 'qty': 1, 'sku': m['id'], 'intake_source': 'cart'} for m in meds],
        'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                             'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
        'prescription_attachments': [rx] if rx else [],
        'fulfillment': 'delivery',
        'payment_mode': mode,
        'payment_method': mode,
    }
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': KEY(f'first-{mode}')})
    oid = r.get('id')
    step(f'the {mode} request is created with the choice made before sending', r.ok and oid, r)
    if oid:
        r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': KEY(f'first-{mode}-submit')})
        step(f'the {mode} request goes out to the pharmacies', r.ok, r)
    return oid


def offer(pharm, oid):
    r = pharm.get('/provider/pharmacy/broadcasts')
    mine = next((b for b in r.items() if b.get('order_id') == oid), None)
    step('the pharmacy sees the request', r.ok and mine, f'{r.status} {len(r.items())} broadcasts')
    if not mine:
        return None
    lines = mine.get('items') or mine.get('medicines') or []
    items = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
              'qty_offered': int(m.get('qty_requested') or m.get('qty') or m.get('quantity') or 1)} for m in lines]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': items})
    offer_id = r.get('id')
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('the pharmacy sends an offer', r.ok, r)
    return offer_id


def main():
    import j_admin, j_accounts, j_insurance, j_onboarding
    from j_pharmacy import admin_adds_medicines, pharmacy_prices_items, patient_address
    admin, _ = j_admin.login()
    code = j_insurance.admin_adds_company(admin)
    company = next((c for c in j_insurance.rows(admin.get('/insurance/companies/all')) if c.get('code') == code), {})
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pharm = Client(p['token'], 'pharmacy')
    meds = admin_adds_medicines(admin)
    pharmacy_prices_items(pharm, admin, meds)

    journey('insurance first: the pharmacy takes insurance and is online')
    r = pharm.patch('/provider/profile/availability', {'accepted_insurance': [{'company_id': company.get('id'), 'classes': ['A'], 'active': True}]})
    step('the pharmacy records the insurance company it takes', r.ok, r)
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('the pharmacy is online', r.ok, r)

    journey('insurance first: the patient saves the policy and sends an insurance request with a prescription')
    acct = j_accounts.app_signup(label='ins-first')
    pat = Client(acct['token'], 'patient')
    r = pat.post('/insurance/save-policy', {'provider': company.get('name_ar'), 'company_id': code, 'class': 'A', 'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}',
                                            'expiry_date': '2027-12-31', 'member_name': 'مريض تأمين', 'verified': False, 'ocr_extracted': False})
    step('the policy is saved', r.ok, r)
    addr = patient_address(pat)
    rx = j_onboarding.upload(pat, 'rx-ins-first.png', 'image/png')
    oid = send(pat, addr, meds[:1], 'insurance', rx)
    if not oid:
        return
    _, order = order_of(pat, oid)
    step('the order keeps the choice (payment_mode and payment_method insurance)', order.get('payment_mode') == 'insurance' and order.get('payment_method') == 'insurance',
         {k: order.get(k) for k in ('payment_mode', 'payment_method', 'coverage_mode')})
    offer_id = offer(pharm, oid)
    if not offer_id:
        return
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    row = next((o for o in r.items() if (o.get('id') or o.get('offer_id')) == offer_id), {})
    step('the offer is from a pharmacy that takes insurance', r.ok and row.get('insurance_ready') is True, row.get('insurance_ready'))

    journey('insurance first: the website offers page asks nothing per offer')
    web = WebClient(WEB, 'web-patient')
    r = web.post('/api/auth/login', {'identifier': acct['email'], 'password': acct['password']})
    step('the patient signs in on the website', r.ok, r)
    r = web.get(f'/ar/pharmacy/broadcast-status?orderId={oid}', headers=HTML)
    page = str(r.body)
    step('the offers page lists the offer with its select button', r.ok and 'اختر هذا العرض' in page, r.status)
    step('it draws the choice made at the start (insurance)', r.ok and 'تدفع بالتأمين' in page, r.status)
    step('it has no insurance / cash radio per offer', r.ok and 'id="coverage-' not in page, r.status)

    journey('insurance first: the offer is selected with the order\'s own choice')
    mode = 'insurance' if (order.get('payment_mode') == 'insurance' or order.get('payment_method') == 'insurance') else 'cash'
    r = pat.post(f'/patient/pharmacy/orders/{oid}/offers/{offer_id}/select', {'coverage_mode': mode}, headers={'Idempotency-Key': KEY('first-select')})
    step('selected with insurance, the choice of the start', r.ok and mode == 'insurance', r)
    _, order = order_of(pat, oid)
    step('the order waits for the pharmacy\'s insurance decision', str(order.get('status')) == 'insurance_decision_pending', order.get('status'))

    journey('insurance first: a self-pay request is never asked about insurance')
    cash_id = send(pat, addr, meds[1:2], 'cash')
    if cash_id:
        _, cash_order = order_of(pat, cash_id)
        step('the self-pay order keeps its choice', cash_order.get('payment_mode') == 'cash', {k: cash_order.get(k) for k in ('payment_mode', 'payment_method')})
        r = web.get(f'/ar/pharmacy/broadcast-status?orderId={cash_id}', headers=HTML)
        step('its offers page has no insurance radio', r.ok and 'id="coverage-' not in str(r.body), r.status)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
