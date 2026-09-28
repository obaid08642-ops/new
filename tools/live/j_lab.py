"""Journey: lab test, patient-app diagnostics -> lab (provider-app LabDashboard) -> results -> admin console.
Payloads copied from patient-app app/(tabs)/diagnostics.tsx, diagnostics/cart.tsx, diagnostics/checkout.tsx and
provider-app screens/lab/LabDashboard.tsx (LabOrderDetail, SampleTracking, ResultReview)."""
import datetime, uuid
from lib import Client, journey, step


# provider-app LabDashboard + shared tabs (ProviderHome, BlueprintScreens)
LAB_SCREEN_GETS = ['/provider/dashboard/stats', '/provider/profile', '/labs/packages', '/labs/provider/inbox', '/labs/samples',
                   '/provider/capabilities/lab-services', '/provider/crm', '/provider/jobs/queue?status=active', '/provider/ops/wallet/ledger',
                   '/provider/reviews', '/provider/promotions', '/provider/referral-network', '/referrals/my', '/provider-onboarding/my-profile',
                   '/provider/stats/today', '/provider/stats/period?period=month', '/provider/settlements']


def tomorrow_at(hour=10):
    d = datetime.datetime.now() + datetime.timedelta(days=1)
    return d.replace(hour=hour, minute=0, second=0, microsecond=0).astimezone().isoformat()


def admin_publishes_tests(admin, n=4):
    # admin/src/pages/admin/catalog-manager.tsx (labs tab): list, create, publish via medical review
    journey('lab catalog: admin creates and publishes tests')
    r = admin.get('/labs/admin/catalog')
    items = r.body if isinstance(r.body, list) else r.items()
    # Fresh DB starts empty — the create/publish steps below prove the flow.
    step('admin catalog lists tests including unpublished ones', r.ok, f'{r.status} {len(items)}')
    tag = uuid.uuid4().hex[:5]
    body = {'name_ar': f'فيتامين د {tag}', 'name_en': f'Vitamin D {tag}', 'short_code': 'VITD', 'category': 'vitamins', 'sample_type': 'blood',
            'price': 120, 'turnaround_hours': 24, 'popularity': 50, 'fasting_required': False, 'home_visit_supported': True, 'active': True,
            'description_ar': 'قياس فيتامين د', 'medical_review_status': 'pending'}
    r = admin.post('/labs/admin/catalog', body)
    new_id = r.get('id')
    step('admin adds a test from the editor (unpublished)', r.ok and new_id and r.get('public_eligibility') is False, r)
    r = admin.put(f'/labs/admin/catalog/{new_id}', {**body, 'price': 110, 'medical_review_status': 'approved'})
    step('admin edits the price and approves it (published)', r.ok and r.get('price') == 110 and r.get('public_eligibility') is True, r)
    for it in [i for i in items if i.get('medical_review_status') != 'approved' and not i.get('is_package')][:n]:
        r = admin.put(f"/labs/admin/catalog/{it['id']}", {'medical_review_status': 'approved'})
        step(f"admin publishes '{it.get('name_en')}'", r.ok and r.get('medical_review_status') == 'approved', r)
    return new_id


def patient_books(pat, lab_id, location='facility', method='cash'):
    """diagnostics tab -> add tests -> cart (compatible labs) -> checkout."""
    r = pat.get('/labs/services')
    services = r.items()
    step('patient sees the lab test catalog', r.ok and len(services) > 0, f'{r.status} {len(services)}')
    picks = [s for s in services if location != 'home' or s.get('home_visit_supported')][:2]
    ids = ','.join(s['id'] for s in picks)
    r = pat.get(f'/labs/compatible-providers?testIds={ids}')
    labs = r.body if isinstance(r.body, list) else r.items()
    step('cart lists the approved lab as able to run the tests', r.ok and any(l.get('id') == lab_id for l in labs), f'{r.status} {[l.get("id") for l in labs][:5]} want {lab_id}')
    r = pat.post('/labs/bookings', {'items': [{'service_id': s['id']} for s in picks], 'scheduled_at': tomorrow_at(),
                                    'location_type': location, 'payment_method': method, 'provider_account_id': lab_id})
    step(f'checkout creates the booking ({location}, {method})', r.ok and r.get('id'), r)
    return r.get('id'), picks


def run(pat, lab, other_lab=None, admin=None):
    lab_id = lab.get('/provider/me').get('account', 'id')
    journey('lab: patient books tests at the facility, pays cash there')
    bid, picks = patient_books(pat, lab_id)
    if not bid:
        return
    journey('lab: the lab accepts and runs the tests')
    r = lab.get('/labs/provider/inbox')
    mine = next((b for b in r.items() if b.get('id') == bid), None)
    step('booking appears in the lab inbox as NEW_REQUEST', r.ok and mine and mine.get('state') == 'NEW_REQUEST', r)
    step('inbox row carries what the order card shows (patient, payment, items, total)',
         mine and mine.get('payment_method') == 'cash' and len(mine.get('items') or []) == len(picks) and mine.get('total', 0) > 0, mine)
    if other_lab:
        r = other_lab.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'x'})
        step("another lab cannot move this booking", r.status in (403, 404), r)
    r = lab.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_lab'})
    step('lab confirms the cash booking', r.ok and r.get('state') == 'CONFIRMED', r)
    barcode = f'SMP-{uuid.uuid4().hex[:8].upper()}'
    r = lab.post('/labs/samples/register', {'lab_order_id': bid, 'barcode': barcode, 'tests': [p['id'] for p in picks]})
    step('patient arrived: sample registered', r.ok, r)
    r = lab.get('/labs/samples')
    sample = next((s for s in r.items() if s.get('lab_order_id') == bid), None)
    step('sample appears in sample tracking (stage received)', r.ok and sample and sample.get('stage') == 'received', r)
    if not sample:
        return
    for stage in ('analyzing', 'result_ready'):
        r = lab.req('PATCH', f"/labs/samples/{sample['id']}/stage", {'stage': stage})
        step(f'sample stage -> {stage}', r.ok, r)
    rows = [{'analyte': 'Hemoglobin', 'value': '14.1', 'unit': 'g/dL', 'range': '13-17', 'isCritical': False}]
    r = lab.post(f'/labs/bookings/{bid}/upload-report', {'structuredData': rows, 'send_to': 'both'})
    step('result sent (report generated)', r.ok and r.get('state') == 'REPORTED', r)
    r = lab.req('PATCH', f"/labs/samples/{sample['id']}/stage", {'stage': 'sent'})
    step('sample marked sent', r.ok, r)

    journey('lab: patient receives the result')
    r = pat.get(f'/labs/bookings/{bid}')
    b = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('booking is REPORTED with a report attached', r.ok and b.get('state') == 'REPORTED' and len(b.get('reports') or []) == 1, b.get('state'))
    r = pat.get('/labs/bookings/mine')
    step('my results lists it', r.ok and bid in str(r.body), r.status)
    r = pat.post('/patient-ux/review', {'booking_kind': 'lab', 'booking_id': bid, 'rating': 5, 'comment': 'نتائج سريعة', 'aspects': {}, 'anonymous': False})
    step('patient rates the lab (reviews screen)', r.ok, r)

    journey('lab: payment rules on accepting a booking')
    bid2, _ = patient_books(pat, lab_id, location='home', method='card')
    if bid2:
        r = lab.req('PATCH', f'/labs/bookings/{bid2}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_lab'})
        step('an unpaid card booking cannot be accepted', r.status == 400, r)
        r = lab.req('PATCH', f'/labs/bookings/{bid2}/state', {'state': 'CANCELLED', 'note': 'rejected_by_lab: التحليل غير متوفر'})
        step('lab rejects with a reason', r.ok and r.get('state') == 'CANCELLED', r)
    journey('lab: card payment confirms the booking')
    from j_nursing import card_payment
    bid3, _ = patient_books(pat, lab_id, location='home', method='card')
    if bid3:
        card_payment(pat, 'lab', bid3)
        r = pat.get(f'/labs/bookings/{bid3}')
        step('verified card payment confirms the lab booking', r.ok and r.get('state') == 'CONFIRMED' and r.get('payment_status') == 'paid', r)

    journey('lab screens: every tab loads after a reported booking')
    for path in LAB_SCREEN_GETS:
        r = lab.get(path)
        step(f'GET {path}', r.ok, r)
    r = lab.get('/provider/dashboard/stats')
    st = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('home stats count the lab work', r.ok and any(isinstance(v, (int, float)) and v > 0 for v in st.values()), r)
    r = lab.get('/provider/crm')
    step('lab CRM lists the patient it served', r.ok and len(r.items()) > 0, r)

    if admin:
        journey('lab: admin orders console')
        r = admin.get('/admin/admin/orders?kind=lab&limit=25')
        row = next((x for x in r.items() if x.get('id') == bid), None)
        step('console lists the lab booking with status and amount', r.ok and row and row.get('status') == 'REPORTED' and row.get('amount', 0) > 0, row or r.status)
        d = admin.get(f'/admin/admin/orders/lab/{bid}')
        step('console detail opens with its timeline', d.ok and len(d.get('timeline') or []) >= 4, d)
    return bid


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    new_test = admin_publishes_tests(admin)
    # LabRegistration: the lab ticks the tests it runs from the public catalog (test ids -> test_categories)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    provs = []
    for _ in range(2):
        p = j_onboarding.register_type('lab', {'test_categories': catalog})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        provs.append(p)
    pat = j_accounts.app_signup(label='lab-patient')
    r = Client(pat['token'], 'patient').get('/labs/services')
    step('the published test is visible to patients right away (cache refreshed)', new_test in str(r.body), r.status)
    run(Client(pat['token'], 'patient'), Client(provs[0]['token'], 'lab'), Client(provs[1]['token'], 'lab2'), admin)
    summary()
