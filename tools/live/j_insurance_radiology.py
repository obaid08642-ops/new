"""Journey: radiology insurance flow (as-is, no Nphies).
Patient saves insurance -> books scan with insurance -> radiology center receives request -> center submits on own system -> center enters outcome -> patient pays copay -> notifications.
Payloads from patient-app diagnostics/radiology/Insurance* screens and provider-app radiology/InsuranceDecisionScreen."""
import base64
import uuid
from lib import Client, journey, step
from j_lab import tomorrow_at
from j_nursing import fake_pay

RAD_SCREEN_GETS = ['/provider/dashboard/stats', '/provider/profile', '/radiology/provider/inbox', '/provider/capabilities/radiology',
                   '/provider/crm', '/provider/jobs/queue?status=active', '/provider/ops/wallet/ledger', '/provider/reviews',
                   '/provider/promotions', '/provider/referral-network', '/referrals/my', '/provider-onboarding/my-profile',
                   '/provider/stats/today', '/provider/stats/period?period=month', '/provider/settlements']

MINI_PDF = (b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
            b'3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\n0000000000 65535 f \n'
            b'0000000009 0000000052 000000 n \n0000000101 000000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF\n')

def admin_publishes_scans(admin, n=3):
    journey('radiology catalog: admin publishes scans for insurance')
    r = admin.get('/radiology/admin/catalog')
    items = r.body if isinstance(r.body, list) else r.items()
    if r.ok and len(items) == 0:
        seeds = [('أشعة سينية صدر', 'Chest X-Ray', 'XR-CHEST', 120, 'xray'),
                 ('رنين مغناطيسي ركبة', 'Knee MRI', 'MRI-KNEE', 850, 'mri'),
                 ('موجات فوق صوتية بطن', 'Abdominal Ultrasound', 'US-ABD', 220, 'ultrasound')]
        for ar, en, code, price, modality in seeds:
            rc = admin.post('/radiology/admin/catalog', {'name_ar': ar, 'name_en': en, 'short_code': code,
                                                         'price': price, 'modality': modality, 'category': 'imaging',
                                                         'active': True})
            step(f"admin creates scan '{en}'", rc.ok, rc)
        r = admin.get('/radiology/admin/catalog')
        items = r.body if isinstance(r.body, list) else r.items()
    step('admin catalog lists scans', r.ok and len(items) > 0, f'{r.status} {len(items)}')
    for it in [i for i in items if i.get('medical_review_status') != 'approved'][:n]:
        r = admin.put(f"/radiology/admin/catalog/{it['id']}", {'medical_review_status': 'approved'})
        step(f"admin publishes '{it.get('name_en')}'", r.ok and r.get('public_eligibility') is True, r)

def patient_adds_insurance(pat, admin):
    journey('insurance: patient adds policy (radiology flow)')
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
                                            'member_name': 'مريض تأمين أشعة', 'national_id': '1098765432', 'verified': False, 'ocr_extracted': False,
                                            'network': net_code, 'class': 'A'})
    step('save-policy', r.ok, r)
    r = pat.get('/insurance/my-policy')
    pol = r.get('policy') or {}
    step('my policy saved', r.ok and r.get('has_policy'), r)
    return c, net_code

def run(pat, center, other_center, admin):
    company, net_code = patient_adds_insurance(pat, admin)
    admin_publishes_scans(admin)

    center_id = center.get('/provider/me').get('account', 'id')
    journey('radiology insurance: patient books scan at facility with insurance')
    r = pat.get('/radiology/services')
    scans = r.items()
    step('patient sees scan catalog', r.ok and len(scans) > 0, f'{r.status} {len(scans)}')
    scan = scans[0]
    r = pat.get(f"/radiology/services/{scan['id']}")
    step('scan detail opens', r.ok and r.get('id') == scan['id'], r)
    r = pat.get(f"/radiology/compatible-providers?serviceIds={scan['id']}")
    centers = r.body if isinstance(r.body, list) else r.items()
    step('cart lists approved center', r.ok and any(c.get('id') == center_id for c in centers), f'{r.status} {[c.get("id") for c in centers][:5]}')

    body = {'service_id': scan['id'], 'scheduled_at': tomorrow_at(11), 'location_type': 'facility', 'payment_method': 'insurance', 'provider_account_id': center_id}
    r = pat.post('/radiology/bookings', body)
    bid = r.get('id')
    step('checkout creates insurance radiology booking', r.ok and bid and (r.get('total') or 0) > 0, r)
    if not bid:
        return

    journey('radiology insurance: center receives booking with insurance details')
    r = center.get('/radiology/provider/inbox')
    mine = next((b for b in r.items() if b.get('id') == bid), None)
    step('booking in center inbox (NEW_REQUEST)', r.ok and mine and mine.get('state') == 'NEW_REQUEST', r)
    step('inbox carries insurance_provider', mine and mine.get('insurance_provider') == company.get('code'), mine)
    step('inbox carries insurance_member_id', bool(mine and mine.get('insurance_member_id')), mine)

    if other_center:
        r = other_center.req('PATCH', f'/radiology/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'x'})
        step('another center cannot touch it', r.status in (403, 404), r)

    journey('radiology insurance: center submits on external system -> records outcome')
    r = center.req('PATCH', f'/radiology/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_center'})
    step('center accepts insurance booking', r.ok and r.get('state') == 'CONFIRMED', r)

    r = center.post(f'/radiology/bookings/{bid}/upload-report', {'report_storage_object_id': 'x'})
    step('report cannot attach before scan', r.status == 400, r)

    for action, want in (('checkin', 'ARRIVED_CHECKIN'), ('start-scan', 'IN_SCANNING')):
        r = center.post(f'/radiology/bookings/{bid}/{action}', {})
        step(f'{action}', r.ok and r.get('state') == want, r)

    r = center.post('/storage/upload', {'data_base64': base64.b64encode(MINI_PDF).decode(), 'mime': 'application/pdf', 'original_name': 'radiology-report.pdf'})
    obj = r.get('id')
    step('report PDF uploaded', r.ok and obj, r)

    r = center.post(f'/radiology/bookings/{bid}/upload-report', {'report_storage_object_id': obj, 'findings': 'لا توجد ملاحظات مرضية'})
    step('report attached (draft)', r.ok and r.get('state') == 'REPORT_DRAFT', r)

    r = center.post(f'/radiology/bookings/{bid}/submit-report-for-review', {})
    step('sent for radiologist review', r.ok and r.get('state') == 'UNDER_REVIEW', r)

    r = center.post(f'/radiology/bookings/{bid}/approve-report', {})
    step('approved and published', r.ok and r.get('state') == 'REPORT_READY', r)

    journey('radiology insurance: insurance decision recorded')
    r = center.patch(f'/radiology/bookings/{bid}/insurance', {'status': 'approve_partial', 'totalCopay': 15, 'items': [{'service_id': scan['id'], 'isCovered': True, 'rejectReason': None, 'cashPrice': scan.get('price')}]})
    step('center records insurance decision (15% copay)', r.ok and r.get('insurance_status') == 'approve_partial', r)
    rid = r.get('insurance_request_id')

    journey('radiology insurance: patient sees decision and pays copay')
    r = pat.get(f'/radiology/bookings/{bid}')
    b = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('booking shows insurance decision', r.ok and b.get('insurance_status') == 'approve_partial', b.get('insurance_status'))
    rid = rid or b.get('insurance_request_id')
    step('booking links to insurance request', bool(rid), b)

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
        state = None
        for _ in range(10):
            r = pat.get(f'/insurance/requests/{rid}')
            state = r.get('state')
            if state == 'COPAY_PAID':
                break
            _time.sleep(1.5)
        step('request shows copay paid', state == 'COPAY_PAID', state)

        r = pat.get(f'/radiology/bookings/{bid}')
        step('radiology booking CONFIRMED after copay', r.ok and str(r.get('state')).upper() == 'CONFIRMED', r.get('state'))

    journey('radiology insurance: patient receives report')
    r = pat.get('/radiology/reports/mine')
    step('my results lists report', r.ok and bid in str(r.body), r.status)
    r = pat.get(f'/radiology/bookings/{bid}')
    step('booking shows REPORT_READY', r.ok and r.get('state') == 'REPORT_READY', r)
    r = pat.post('/patient-ux/review', {'booking_kind': 'radiology', 'booking_id': bid, 'rating': 5, 'comment': 'خدمة ممتازة مع التأمين', 'aspects': {}, 'anonymous': False})
    step('patient rates center', r.ok, r)

    journey('radiology insurance: admin console')
    if admin:
        r = admin.get('/admin/admin/orders?kind=radiology&limit=25')
        row = next((x for x in r.items() if x.get('id') == bid), None)
        step('admin lists radiology insurance order', r.ok and row and row.get('status') == 'REPORT_READY' and row.get('amount', 0) > 0 and row.get('is_completed'), row or r.status)

    journey('radiology screens: every tab loads')
    for path in RAD_SCREEN_GETS:
        r = center.get(path)
        step(f'GET {path}', r.ok, r)

    return bid

def test_rejection_flow(pat, center, admin):
    """Test insurance rejection -> self-pay flow"""
    journey('radiology insurance: rejection -> self-pay')
    company, net_code = patient_adds_insurance(pat, admin)
    admin_publishes_scans(admin)
    center_id = center.get('/provider/me').get('account', 'id')

    r = pat.get('/radiology/services')
    scans = r.items()
    scan = scans[-1]
    body = {'service_id': scan['id'], 'scheduled_at': tomorrow_at(14), 'location_type': 'facility', 'payment_method': 'insurance', 'provider_account_id': center_id}
    r = pat.post('/radiology/bookings', body)
    bid = r.get('id')
    step('insurance booking for rejection test', r.ok and bid, r)
    if not bid:
        return

    r = center.req('PATCH', f'/radiology/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_center'})
    step('center accepts', r.ok and r.get('state') == 'CONFIRMED', r)

    r = center.patch(f'/radiology/bookings/{bid}/insurance', {'status': 'rejected', 'totalCopay': 0, 'items': [{'service_id': scan['id'], 'isCovered': False, 'rejectReason': 'الخدمة غير مشمولة', 'cashPrice': scan.get('price')}]})
    step('center records rejection', r.ok and r.get('insurance_status') == 'rejected', r)
    rid = r.get('insurance_request_id')

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

if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    admin_publishes_scans(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/radiology/services').items()]
    provs = []
    for _ in range(2):
        p = j_onboarding.register_type('radiology', {'equipment_list': catalog})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        provs.append(p)
    pat = j_accounts.app_signup(label='rad-ins-patient')
    run(Client(pat['token'], 'patient'), Client(provs[0]['token'], 'radiology'), Client(provs[1]['token'], 'radiology2'), admin)
    test_rejection_flow(Client(pat['token'], 'patient'), Client(provs[0]['token'], 'radiology'), admin)
    summary()