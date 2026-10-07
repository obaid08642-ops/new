"""Journey: nursing insurance flow (as-is, no Nphies).
Patient saves insurance -> books nursing visit with insurance -> nurse receives request -> nurse submits on own system -> nurse enters outcome -> patient pays copay -> notifications.
Payloads from patient-app nursing/Insurance* screens and provider-app nursing/InsuranceDecisionScreen."""
import urllib.request
import uuid
from lib import Client, journey, step
from j_lab import tomorrow_at
from j_nursing import fake_pay, card_payment

NURSE_SCREEN_GETS = ['/provider/dashboard/stats', '/provider/profile', '/provider/jobs/queue?kind=nursing&status=incoming',
                     '/provider/jobs/queue?kind=nursing&status=active', '/provider/jobs/queue?kind=nursing&status=completed',
                     '/nursing/jobs/active', '/provider/nursing/checklist', '/provider/nursing/supplies', '/provider/crm',
                     '/provider/ops/wallet/ledger', '/provider/reviews', '/provider/promotions', '/referrals/my',
                     '/provider-onboarding/my-profile', '/provider/stats/today', '/provider/settlements']

def admin_publishes_nursing(admin, n=3):
    journey('nursing catalog: admin publishes services for insurance')
    r = admin.get('/nursing/admin/catalog')
    items = r.body if isinstance(r.body, list) else r.items()
    if r.ok and len(items) == 0:
        seeds = [('زيارة تمريضية منزلية', 'Home nursing visit', 'general', 150, '60 دقيقة'),
                 ('قياس العلامات الحيوية', 'Vitals check', 'general', 80, '30 دقيقة'),
                 ('العناية بالجروح', 'Wound care', 'general', 200, '45 دقيقة'),
                 ('مرافقة تمريضية (شفت)', 'Nursing shift companion', 'general', 600, 'shift')]
        for ar, en, cat, price, duration in seeds:
            rc = admin.post('/nursing/admin/catalog', {'name_ar': ar, 'name_en': en, 'category': cat,
                                                       'price': price, 'duration': duration, 'active': True})
            step(f"admin creates service '{en}'", rc.ok, rc)
        r = admin.get('/nursing/admin/catalog')
        items = r.body if isinstance(r.body, list) else r.items()
    step('admin catalog lists services', r.ok and len(items) > 0, f'{r.status} {len(items)}')
    for it in [i for i in items if i.get('medical_review_status') != 'approved']:
        r = admin.put(f"/nursing/admin/catalog/{it['id']}", {'medical_review_status': 'approved'})
        step(f"admin publishes '{it.get('name_en')}'", r.ok and r.get('public_eligibility') is True, r)

def patient_adds_insurance(pat, admin):
    journey('insurance: patient adds policy (nursing flow)')
    r = pat.get('/insurance/companies')
    comps = r.body if isinstance(r.body, list) else r.items()
    step('insurance companies load', r.ok and len(comps) > 0, r)
    c = comps[0]
    net_code = f'net{uuid.uuid4().hex[:5]}'
    if c.get('id'):
        rn = admin.post(f"/insurance/companies/{c.get('id')}/networks",
                        {'code': net_code, 'name_ar': f'شبكة {net_code}', 'name_en': f'Net {net_code}', 'tier_level': 1})
        step('admin creates network', rn.ok, rn)
    r = pat.post('/insurance/save-policy', {'provider': c.get('name_ar') or c.get('name_en') or c.get('code'), 'company_id': c.get('code'),
                                            'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}', 'expiry_date': '2027-12-31',
                                            'member_name': 'مريض تأمين تمريض', 'national_id': '1098765432', 'verified': False, 'ocr_extracted': False,
                                            'network': net_code, 'class': 'A'})
    step('save-policy', r.ok, r)
    r = pat.get('/insurance/my-policy')
    pol = r.get('policy') or {}
    step('my policy saved', r.ok and r.get('has_policy'), r)
    return c, net_code

def run(pat, nurse, admin):
    company, net_code = patient_adds_insurance(pat, admin)
    admin_publishes_nursing(admin)

    nurse_id = nurse.get('/provider/me').get('account', 'id')
    journey('nursing insurance: patient books home visit with insurance')
    r = pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع الملك فهد 3', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001, 'is_default': True})
    step('patient has located address', r.ok, r)
    r = pat.get('/home-care/services')
    svcs = r.body if isinstance(r.body, list) else r.items()
    step('nursing tab lists published services', r.ok and len(svcs) > 0 and all(s.get('medical_review_status') == 'approved' for s in svcs), f'{r.status} {len(svcs)}')
    svc = svcs[0]
    r = pat.get(f"/home-care/services/{svc['id']}")
    step('service info opens', r.ok and r.get('id') == svc['id'], r)
    r = pat.get(f"/home-care/providers?type={svc['id']}&sort=rating&gender=any&availability=any&nationality=any&search=")
    nurses = r.body if isinstance(r.body, list) else r.items()
    step('service-details lists approved nurse', r.ok and any(n.get('id') == nurse_id for n in nurses), f'{r.status} {[n.get("id") for n in nurses][:5]}')
    r = pat.get(f"/home-care/providers/{nurse_id}?serviceId={svc['id']}")
    step('nurse profile shows price', r.ok and r.get('name_ar') and r.get('price') == svc.get('price'), r)

    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    body = {'provider_id': nurse_id, 'service_id': svc['id'], 'service_name_ar': svc.get('name_ar'), 'scheduled_at': tomorrow_at(9), 'address': addr, 'payment_method': 'insurance'}
    r = pat.post('/nursing/bookings', body)
    bid = r.get('id')
    step('booking created with insurance', r.ok and bid and r.get('state') == 'PROVIDER_ASSIGNED', r)
    if not bid:
        return

    journey('nursing insurance: nurse receives request with insurance details')
    r = nurse.get('/provider/jobs/queue?kind=nursing&status=incoming')
    step('request reaches nurse (incoming)', r.ok and bid in [j.get('id') for j in r.items()], r)
    step('job carries insurance_provider', any(j.get('insurance_provider') == company.get('code') for j in r.items() if j.get('id') == bid), r)

    journey('nursing insurance: nurse submits on external system -> records outcome')
    r = nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})
    step('unpaid insurance visit cannot be accepted', r.status == 400, r)

    r = nurse.post(f'/nursing/visits/{bid}/insurance-decision',
                   {'decision': 'approve_partial', 'copay_percent': 25, 'approval_reference': f'APR-{uuid.uuid4().hex[:8]}'})
    step('nurse records insurance decision (25% copay)', r.ok, r)

    journey('nursing insurance: patient sees decision and pays copay')
    r = pat.get(f'/nursing/bookings/{bid}')
    b = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('booking shows insurance decision', r.ok and b.get('insurance_status') == 'approve_partial', b.get('insurance_status'))
    rid = b.get('insurance_request_id')
    step('booking links to insurance request engine', bool(rid), b)

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

        r = pat.get(f'/nursing/bookings/{bid}')
        step('booking state updated after copay', r.ok, r.get('state'))

    journey('nursing insurance: nurse performs visit (after copay)')
    r = nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})
    step('nurse accepts after copay', r.ok, r)
    r = nurse.get('/provider/jobs/queue?kind=nursing&status=active')
    step('visit in active tab', r.ok and bid in [j.get('id') for j in r.items()], r)
    r = nurse.get(f'/nursing/visits/{bid}')
    step('field ops loads visit', r.ok, r)

    r = nurse.post(f'/nursing/visits/{bid}/transit', {})
    step('on the way', r.ok, r)
    r = nurse.post(f'/nursing/visits/{bid}/arrive', {'lat': 24.7002, 'lng': 46.7002})
    step('arrived at patient', r.ok, r)
    r = nurse.post(f'/nursing/visits/{bid}/start-care', {})
    step('care started', r.ok, r)
    r = nurse.post(f'/nursing/visits/{bid}/complete', {'clinical_notes': 'تم إعطاء الحقنة ومتابعة العلامات الحيوية', 'signature_base64': 'data:image/png;base64,iVBORw0KGgo='})
    step('visit completed with report', r.ok, r)

    journey('nursing insurance: patient sees finished visit')
    r = pat.get('/nursing/bookings/mine')
    b = next((x for x in r.items() if x.get('id') == bid), None) if not isinstance(r.body, list) else next((x for x in r.body if x.get('id') == bid), None)
    step('my visits shows COMPLETED and paid', b and b.get('state') == 'COMPLETED' and b.get('payment_status') == 'paid', b)
    r = pat.post('/patient-ux/review', {'booking_kind': 'nursing', 'booking_id': bid, 'rating': 5, 'comment': 'ممرضة محترفة مع التأمين', 'aspects': {}, 'anonymous': False})
    step('patient rates the nurse', r.ok, r)

    journey('nursing insurance: notifications')
    r = pat.get(f'/nursing/bookings/{bid}')
    b = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('final state with insurance copay', b.get('insurance_copay_paid') is True or b.get('payment_status') == 'paid', b)

    journey('nursing insurance: admin console')
    if admin:
        r = admin.get('/admin/admin/orders?kind=nursing&limit=25')
        row = next((x for x in r.items() if x.get('id') == bid), None)
        step('admin lists nursing insurance order', r.ok and row and row.get('status') == 'COMPLETED' and row.get('amount', 0) > 0, row or r.status)
        d = admin.get(f'/admin/admin/orders/nursing/{bid}')
        fin = d.get('financials') or {}
        step('admin detail shows insurance copay', d.ok and (fin.get('gross_paid') or 0) > 0, d.get('financials'))

    journey('nurse screens: every tab loads')
    for path in NURSE_SCREEN_GETS:
        r = nurse.get(path)
        step(f'GET {path}', r.ok, r)
    r = nurse.get('/provider/dashboard/stats')
    st = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('home stats count the visit', r.ok and any(isinstance(v, (int, float)) and v > 0 for v in st.values()), r)
    r = nurse.get('/provider/crm')
    step('nurse CRM lists the patient', r.ok and len(r.items()) > 0, r)

    return bid

def test_rejection_flow(pat, nurse, admin):
    """Test insurance rejection -> self-pay flow"""
    journey('nursing insurance: rejection -> self-pay')
    company, net_code = patient_adds_insurance(pat, admin)
    admin_publishes_nursing(admin)
    nurse_id = nurse.get('/provider/me').get('account', 'id')

    r = pat.get('/home-care/services')
    svcs = r.body if isinstance(r.body, list) else r.items()
    svc = svcs[0]
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    body = {'provider_id': nurse_id, 'service_id': svc['id'], 'service_name_ar': svc.get('name_ar'), 'scheduled_at': tomorrow_at(11), 'address': addr, 'payment_method': 'insurance'}
    r = pat.post('/nursing/bookings', body)
    bid = r.get('id')
    step('insurance booking for rejection', r.ok and bid, r)
    if not bid:
        return

    r = nurse.post(f'/nursing/visits/{bid}/insurance-decision',
                   {'decision': 'reject', 'reason': 'الخدمة غير مشمولة في فئة الوثيقة'})
    step('nurse records rejection', r.ok, r)

    r = pat.get(f'/nursing/bookings/{bid}')
    b = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    rid = b.get('insurance_request_id')

    if rid:
        r = pat.get(f'/insurance/requests/{rid}')
        step('insurance request shows rejected', r.ok and r.get('state') == 'REJECTED', r)

        r = pat.post(f'/insurance/requests/{rid}/accept-self-pay', {}, headers={'Idempotency-Key': f'ins-selfpay-{rid}-{uuid.uuid4()}'})
        step('patient accepts self-pay (100% copay)', r.ok and r.get('state') == 'COPAY_PENDING' and r.get('copay_percent') == 100, r)

        caps = f'/insurance/requests/{rid}/self-pay-capabilities'
        r = pat.get(caps)
        step('self-pay: card offered', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)

        r = pat.post(f'/payments/intent/insurance/{rid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-selfpay-{rid}-{uuid.uuid4()}'})
        txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
        step('self-pay: checkout https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
        if txn.get('gateway_intent_id'):
            fake_pay(txn['gateway_intent_id'])
            r = pat.post(f"/payments/verify/{txn['id']}", {})
            step('self-pay: paid', r.ok and r.get('status') == 'paid', r)

        import time as _time
        state = None
        for _ in range(10):
            r = pat.get(f'/insurance/requests/{rid}')
            state = r.get('state')
            if state in ('COPAY_PAID', 'SELF_PAY_PAID'):
                break
            _time.sleep(1.5)
        step('request shows self-pay paid', state in ('COPAY_PAID', 'SELF_PAY_PAID'), state)

        r = pat.get(f'/nursing/bookings/{bid}')
        step('booking confirmed after self-pay', r.ok, r.get('state'))

def test_shift_insurance(pat, nurse, admin):
    """Test shift (overnight) insurance flow"""
    journey('nursing insurance: shift booking with insurance')
    company, net_code = patient_adds_insurance(pat, admin)
    admin_publishes_nursing(admin)
    nurse_id = nurse.get('/provider/me').get('account', 'id')

    r = pat.get('/home-care/services')
    svcs = r.body if isinstance(r.body, list) else r.items()
    svc = next((s for s in svcs if s.get('duration') == 'shift'), None)
    if not svc:
        step('shift service not published', False, len(svcs))
        return

    import datetime as _dt
    day = (_dt.date.today() + _dt.timedelta(days=2)).isoformat()
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    body = {'provider_id': nurse_id, 'service_id': svc['id'], 'service_name_ar': svc.get('name_ar'),
            'scheduled_at': f'{day}T10:00:00+03:00', 'address': addr, 'payment_method': 'insurance'}
    r = pat.post('/nursing/bookings', body)
    bid = r.get('id')
    step('shift insurance booking created', r.ok and bid, r)
    if not bid:
        return

    r = nurse.get('/provider/jobs/queue?kind=nursing&status=incoming')
    step('shift insurance reaches nurse', r.ok and bid in [j.get('id') for j in r.items()], r)

    r = nurse.post(f'/nursing/visits/{bid}/insurance-decision',
                   {'decision': 'approved', 'copay_percent': 0, 'approval_reference': f'APR-{uuid.uuid4().hex[:8]}'})
    step('nurse records full approval (0% copay for shift)', r.ok, r)

    rid = (pat.get(f'/nursing/bookings/{bid}').body or {}).get('insurance_request_id')
    if rid:
        r = pat.get(f'/insurance/requests/{rid}')
        step('insurance request shows approved (no copay)', r.ok and r.get('state') == 'APPROVED', r)

    r = nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})
    step('nurse accepts shift (no copay needed)', r.ok, r)

if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    admin_publishes_nursing(admin)
    catalog = Client(None, 'anon').get('/nursing/catalog')
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': 0} for x in (catalog.body if isinstance(catalog.body, list) else catalog.items())]
    p = j_onboarding.register_type('home_care', {'nursing_services': services})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pat = j_accounts.app_signup(label='nursing-ins-patient')
    run(Client(pat['token'], 'patient'), Client(p['token'], 'nurse'), admin)
    test_rejection_flow(Client(pat['token'], 'patient'), Client(p['token'], 'nurse'), admin)
    test_shift_insurance(Client(pat['token'], 'patient'), Client(p['token'], 'nurse'), admin)
    summary()