"""Journey: lab insurance flow (as-is, no Nphies).
Patient saves insurance -> books lab with insurance -> lab receives request -> lab submits on own system -> lab enters outcome -> patient pays copay -> notifications.
Payloads from patient-app diagnostics/Insurance* screens and provider-app lab/InsuranceDecisionScreen."""
import datetime
import uuid
from lib import Client, journey, step
from j_nursing import fake_pay

LAB_SCREEN_GETS = ['/provider/dashboard/stats', '/provider/profile', '/labs/packages', '/labs/provider/inbox', '/labs/samples',
                   '/provider/capabilities/lab-services', '/provider/crm', '/provider/jobs/queue?status=active', '/provider/ops/wallet/ledger',
                   '/provider/reviews', '/provider/promotions', '/provider/referral-network', '/referrals/my', '/provider-onboarding/my-profile',
                   '/provider/stats/today', '/provider/stats/period?period=month', '/provider/settlements']

def tomorrow_at(hour=10):
    d = datetime.datetime.now() + datetime.timedelta(days=1)
    return d.replace(hour=hour, minute=0, second=0, microsecond=0).astimezone().isoformat()

def home_insurance_proof():
    import base64, struct, zlib
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))
    raw = b''.join(b'\x00\xff\x00' for _ in range(64))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
    return [{'kind': 'doctor_request', 'url_or_b64': base64.b64encode(png).decode(), 'filename': 'doctor-request.png'}]

def admin_publishes_tests(admin, n=4):
    journey('lab catalog: admin publishes tests for insurance')
    r = admin.get('/labs/admin/catalog')
    items = r.body if isinstance(r.body, list) else r.items()
    step('admin catalog lists tests', r.ok and len(items) > 0, f'{r.status} {len(items)}')
    tag = uuid.uuid4().hex[:5]
    body = {'name_ar': f'فيتامين د {tag}', 'name_en': f'Vitamin D {tag}', 'short_code': 'VITD', 'category': 'vitamins', 'sample_type': 'blood',
            'price': 120, 'turnaround_hours': 24, 'popularity': 50, 'fasting_required': False, 'home_visit_supported': True, 'active': True,
            'description_ar': 'قياس فيتامين د', 'medical_review_status': 'pending'}
    r = admin.post('/labs/admin/catalog', body)
    new_id = r.get('id')
    step('admin adds test (unpublished)', r.ok and new_id and r.get('public_eligibility') is False, r)
    r = admin.put(f'/labs/admin/catalog/{new_id}', {**body, 'price': 110, 'medical_review_status': 'approved'})
    step('admin publishes test', r.ok and r.get('price') == 110 and r.get('public_eligibility') is True, r)
    for it in [i for i in items if i.get('medical_review_status') != 'approved' and not i.get('is_package')][:n]:
        r = admin.put(f"/labs/admin/catalog/{it['id']}", {'medical_review_status': 'approved'})
        step(f"admin publishes '{it.get('name_en')}'", r.ok and r.get('medical_review_status') == 'approved', r)
    return new_id

def patient_adds_insurance(pat, admin):
    journey('insurance: patient adds policy (lab flow)')
    r = pat.get('/insurance/companies')
    comps = r.body if isinstance(r.body, list) else r.items()
    step('insurance companies load', r.ok and len(comps) > 0, r)
    c = comps[0]
    net_code = f'net{uuid.uuid4().hex[:5]}'
    if c.get('id'):
        rn = admin.post(f"/insurance/companies/{c.get('id')}/networks",
                        {'code': net_code, 'name_ar': f'شبكة {net_code}', 'name_en': f'Net {net_code}', 'tier_level': 1})
        step('admin creates network', rn.ok, rn)
        net_id = (rn.body or {}).get('id') if isinstance(rn.body, dict) else None
    r = pat.post('/insurance/save-policy', {'provider': c.get('name_ar') or c.get('name_en') or c.get('code'), 'company_id': c.get('code'),
                                            'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}', 'expiry_date': '2027-12-31',
                                            'member_name': 'مريض تأمين مختبر', 'national_id': '1098765432', 'verified': False, 'ocr_extracted': False,
                                            'network': net_code, 'class': 'A'})
    step('save-policy', r.ok, r)
    r = pat.get('/insurance/my-policy')
    pol = r.get('policy') or {}
    step('my policy saved', r.ok and r.get('has_policy'), r)
    return c, net_code

def run(pat, lab, other_lab, admin):
    company, net_code = patient_adds_insurance(pat, admin)
    admin_publishes_tests(admin)

    lab_id = lab.get('/provider/me').get('account', 'id')
    journey('lab insurance: patient books tests at home with insurance')
    r = pat.get('/labs/services')
    services = r.items()
    step('patient sees lab catalog', r.ok and len(services) > 0, f'{r.status} {len(services)}')
    eligible = [s for s in services if s.get('home_visit_supported')]
    picks = eligible[:2]
    ids = ','.join(s['id'] for s in picks)
    r = pat.get(f'/labs/compatible-providers?testIds={ids}')
    labs = r.body if isinstance(r.body, list) else r.items()
    step('cart lists approved lab', r.ok and any(l.get('id') == lab_id for l in labs), f'{r.status} {[l.get("id") for l in labs][:5]} want {lab_id}')

    body = {'items': [{'service_id': s['id']} for s in picks], 'scheduled_at': tomorrow_at(13),
            'location_type': 'home', 'payment_method': 'insurance', 'provider_account_id': lab_id,
            'documents': home_insurance_proof()}
    r = pat.post('/labs/bookings', body)
    bid = r.get('id')
    step(f'checkout creates insurance home booking', r.ok and bid, r)
    if not bid:
        return

    journey('lab insurance: lab receives booking with insurance details')
    r = lab.get('/labs/provider/inbox')
    mine = next((b for b in r.items() if b.get('id') == bid), None)
    step('booking in lab inbox as NEW_REQUEST', r.ok and mine and mine.get('state') == 'NEW_REQUEST', r)
    step('inbox carries insurance_provider', mine and mine.get('insurance_provider') == company.get('code'), mine)
    step('inbox carries insurance_member_id', bool(mine and mine.get('insurance_member_id')), mine)

    if other_lab:
        r = other_lab.patch(f'/labs/bookings/{bid}/insurance', {'status': 'approved', 'totalCopay': 0, 'items': []})
        step('another lab cannot decide insurance', r.status in (403, 404), r)

    journey('lab insurance: lab submits on external system -> records outcome')
    items = [{'service_id': p['id'], 'isCovered': i == 0, 'rejectReason': None if i == 0 else 'غير مشمول', 'cashPrice': p.get('price')} for i, p in enumerate(picks)]
    r = lab.patch(f'/labs/bookings/{bid}/insurance', {'status': 'partial_approval', 'totalCopay': 20, 'items': items})
    step('lab records partial approval', r.ok and r.get('insurance_status') == 'partial_approval', r)
    rid = r.get('insurance_request_id')

    journey('lab insurance: patient sees decision and pays copay')
    r = pat.get(f'/labs/bookings/{bid}')
    step('insurance-approval shows covered/uncovered', r.ok and r.get('insurance_status') == 'partial_approval', r)
    rid = rid or r.get('insurance_request_id')
    step('booking links to insurance request engine', bool(rid), r)

    if len(picks) > 1:
        r = pat.patch(f"/labs/bookings/{bid}/items/{picks[1]['id']}/opt-in-cash", {'optInCash': True})
        step('patient opts to pay cash for uncovered test', r.ok, r)

    if rid:
        r = pat.get(f'/insurance/requests/{rid}')
        step('lab decision -> insurance request (COPAY_PENDING)', r.ok and r.get('state') == 'COPAY_PENDING', r)
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
        req_state, booking_state = None, None
        for _ in range(10):
            r = pat.get(f'/insurance/requests/{rid}')
            req_state = r.get('state')
            b = pat.get(f'/labs/bookings/{bid}')
            booking_state = str(b.get('state')).upper()
            if req_state == 'COPAY_PAID' and booking_state == 'CONFIRMED':
                break
            _time.sleep(1.5)
        step('request shows copay paid', req_state == 'COPAY_PAID', req_state)
        step('lab booking CONFIRMED after copay', booking_state == 'CONFIRMED', booking_state)

    journey('lab insurance: lab performs tests and reports')
    r = lab.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_lab'})
    step('lab confirms after copay', r.ok and r.get('state') == 'CONFIRMED', r)
    barcode = f'SMP-{uuid.uuid4().hex[:8].upper()}'
    r = lab.post('/labs/samples/register', {'lab_order_id': bid, 'barcode': barcode, 'tests': [p['id'] for p in picks]})
    step('sample registered', r.ok, r)
    r = lab.get('/labs/samples')
    sample = next((s for s in r.items() if s.get('lab_order_id') == bid), None)
    step('sample tracking (received)', r.ok and sample and sample.get('stage') == 'received', r)
    if sample:
        for stage in ('analyzing', 'result_ready'):
            r = lab.req('PATCH', f"/labs/samples/{sample['id']}/stage", {'stage': stage})
            step(f'sample stage -> {stage}', r.ok, r)
        rows = [{'analyte': 'Vitamin D', 'value': '28.5', 'unit': 'ng/mL', 'range': '30-100', 'isCritical': False}]
        r = lab.post(f'/labs/bookings/{bid}/upload-report', {'structuredData': rows, 'send_to': 'both'})
        step('result sent (REPORTED)', r.ok and r.get('state') == 'REPORTED', r)

    journey('lab insurance: patient receives result')
    r = pat.get(f'/labs/bookings/{bid}')
    b = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('booking REPORTED with report', r.ok and b.get('state') == 'REPORTED' and len(b.get('reports') or []) == 1, b.get('state'))
    r = pat.get('/labs/bookings/mine')
    step('my results lists it', r.ok and bid in str(r.body), r.status)
    r = pat.post('/patient-ux/review', {'booking_kind': 'lab', 'booking_id': bid, 'rating': 5, 'comment': 'نتائج سريعة مع التأمين', 'aspects': {}, 'anonymous': False})
    step('patient rates lab', r.ok, r)

    journey('lab insurance: admin console')
    if admin:
        r = admin.get('/admin/admin/orders?kind=lab&limit=25')
        row = next((x for x in r.items() if x.get('id') == bid), None)
        step('admin lists lab insurance order', r.ok and row and row.get('status') == 'REPORTED' and row.get('amount', 0) > 0, row or r.status)

    journey('lab screens: every tab loads')
    for path in LAB_SCREEN_GETS:
        r = lab.get(path)
        step(f'GET {path}', r.ok, r)

    return bid

def test_facility_insurance(pat, lab, admin):
    """Test facility (center) insurance flow"""
    journey('lab insurance: facility x insurance')
    company, net_code = patient_adds_insurance(pat, admin)
    admin_publishes_tests(admin)
    lab_id = lab.get('/provider/me').get('account', 'id')

    r = pat.get('/labs/services')
    services = r.items()
    eligible = [s for s in services if s.get('home_visit_supported') == False or True]
    picks = eligible[:1]
    ids = ','.join(s['id'] for s in picks)
    r = pat.get(f'/labs/compatible-providers?testIds={ids}')
    labs = r.body if isinstance(r.body, list) else r.items()
    step('cart lists lab for facility', r.ok and any(l.get('id') == lab_id for l in labs), r)

    body = {'items': [{'service_id': s['id']} for s in picks], 'scheduled_at': tomorrow_at(10),
            'location_type': 'facility', 'payment_method': 'insurance', 'provider_account_id': lab_id}
    r = pat.post('/labs/bookings', body)
    bid = r.get('id')
    step('facility insurance booking created', r.ok and bid, r)
    if not bid:
        return

    r = lab.get('/labs/provider/inbox')
    mine = next((b for b in r.items() if b.get('id') == bid), None)
    step('facility booking in inbox with insurance', r.ok and mine and mine.get('insurance_provider') == company.get('code'), mine)

    items = [{'service_id': p['id'], 'isCovered': True, 'rejectReason': None, 'cashPrice': p.get('price')} for p in picks]
    r = lab.patch(f'/labs/bookings/{bid}/insurance', {'status': 'approved', 'totalCopay': 0, 'items': items})
    step('lab records full approval (0% copay)', r.ok and r.get('insurance_status') == 'approved', r)

    rid = r.get('insurance_request_id')
    if rid:
        r = pat.get(f'/insurance/requests/{rid}')
        step('insurance request shows approved', r.ok and r.get('state') == 'APPROVED', r)

    r = lab.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_lab'})
    step('lab confirms (no copay needed)', r.ok and r.get('state') == 'CONFIRMED', r)

if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    new_test = admin_publishes_tests(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    provs = []
    for _ in range(2):
        p = j_onboarding.register_type('lab', {'test_categories': catalog})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        provs.append(p)
    pat = j_accounts.app_signup(label='lab-ins-patient')
    run(Client(pat['token'], 'patient'), Client(provs[0]['token'], 'lab'), Client(provs[1]['token'], 'lab2'), admin)
    test_facility_insurance(Client(pat['token'], 'patient'), Client(provs[0]['token'], 'lab'), admin)
    summary()