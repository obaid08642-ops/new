"""Journey: radiology scan, patient-app diagnostics -> radiology center (provider-app RadiologyDashboard) -> report -> patient.
Payloads copied from patient-app app/(tabs)/diagnostics.tsx (scan "book now" -> cart), diagnostics/cart.tsx, diagnostics/checkout.tsx,
provider-app screens/radiology/RadiologyDashboard.tsx (OrderDetailScreen, ReportingScreen) and api/provider.ts uploadFile."""
import base64
from lib import Client, journey, step
from j_lab import tomorrow_at

# provider-app RadiologyDashboard + shared tabs
RAD_SCREEN_GETS = ['/provider/dashboard/stats', '/provider/profile', '/radiology/provider/inbox', '/provider/capabilities/radiology',
                   '/provider/crm', '/provider/jobs/queue?status=active', '/provider/ops/wallet/ledger', '/provider/reviews',
                   '/provider/promotions', '/provider/referral-network', '/referrals/my', '/provider-onboarding/my-profile',
                   '/provider/stats/today', '/provider/stats/period?period=month', '/provider/settlements']

MINI_PDF = (b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
            b'3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\n0000000000 65535 f \n'
            b'0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF\n')


def admin_publishes_scans(admin, n=3):
    journey('radiology catalog: admin publishes scans')
    r = admin.get('/radiology/admin/catalog')
    items = r.body if isinstance(r.body, list) else r.items()
    if r.ok and len(items) == 0:
        # Fresh DB: the catalog starts empty — create the scans, then publish them.
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
    step('admin catalog lists scans including unpublished ones', r.ok and len(items) > 0, f'{r.status} {len(items)}')
    for it in [i for i in items if i.get('medical_review_status') != 'approved'][:n]:
        r = admin.put(f"/radiology/admin/catalog/{it['id']}", {'medical_review_status': 'approved'})
        step(f"admin publishes '{it.get('name_en')}'", r.ok and r.get('public_eligibility') is True, r)


def run(pat, center, other_center=None, admin=None):
    center_id = center.get('/provider/me').get('account', 'id')
    journey('radiology: patient books a scan at the center (cash)')
    r = pat.get('/radiology/services')
    scans = r.items()
    step('patient sees the scan catalog', r.ok and len(scans) > 0, f'{r.status} {len(scans)}')
    scan = scans[0]
    r = pat.get(f"/radiology/services/{scan['id']}")
    step('scan detail opens by its id (test-detail screen)', r.ok and r.get('id') == scan['id'], r)
    r = pat.get(f"/radiology/compatible-providers?serviceIds={scan['id']}")
    centers = r.body if isinstance(r.body, list) else r.items()
    step('cart lists the approved center that performs this scan', r.ok and any(c.get('id') == center_id for c in centers), f'{r.status} {[c.get("id") for c in centers][:5]}')
    r = pat.post('/radiology/bookings', {'service_id': scan['id'], 'scheduled_at': tomorrow_at(11), 'location_type': 'facility', 'payment_method': 'cash', 'provider_account_id': center_id})
    bid = r.get('id')
    step('checkout creates the radiology booking', r.ok and bid and (r.get('total') or 0) > 0, r)
    if not bid:
        return
    r = pat.post('/radiology/bookings', {'service_id': scan['id'], 'scheduled_at': tomorrow_at(11), 'location_type': 'facility', 'payment_method': 'cash', 'provider_account_id': 'someone-else'})
    step('a booking at a center that does not perform the scan is refused', r.status == 400, r)
    r = pat.req('PATCH', f'/radiology/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'x'})
    step('the patient cannot confirm their own booking', r.status == 403, r)

    journey('radiology: the center performs the scan and reports')
    r = center.get('/radiology/provider/inbox')
    mine = next((b for b in r.items() if b.get('id') == bid), None)
    step('booking is in the center inbox (NEW_REQUEST, scan name, total)', r.ok and mine and mine.get('state') == 'NEW_REQUEST' and mine.get('scan_name_ar') and mine.get('total'), mine or r.status)
    if other_center:
        r = other_center.req('PATCH', f'/radiology/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'x'})
        step('another center cannot touch it', r.status in (403, 404), r)
    r = center.post(f'/radiology/bookings/{bid}/upload-report', {'report_storage_object_id': 'x'})
    step('a report cannot be attached before the scan', r.status == 400, r)
    r = center.req('PATCH', f'/radiology/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_center'})
    step('center accepts the cash booking', r.ok and r.get('state') == 'CONFIRMED', r)
    r = center.get(f'/radiology/bookings/{bid}')
    step('detail screen refreshes for the center', r.ok and r.get('state') == 'CONFIRMED', r)
    for action, want in (('checkin', 'ARRIVED_CHECKIN'), ('start-scan', 'IN_SCANNING')):
        r = center.post(f'/radiology/bookings/{bid}/{action}', {})
        step(f'{action}', r.ok and r.get('state') == want, r)
    r = center.post('/storage/upload', {'data_base64': base64.b64encode(MINI_PDF).decode(), 'mime': 'application/pdf', 'original_name': 'radiology-report.pdf'})
    obj = r.get('id')
    step('report PDF uploaded to private storage', r.ok and obj, r)
    r = center.post(f'/radiology/bookings/{bid}/upload-report', {'report_storage_object_id': obj, 'findings': 'لا توجد ملاحظات مرضية'})
    step('report attached (draft)', r.ok and r.get('state') == 'REPORT_DRAFT', r)
    r = center.post(f'/radiology/bookings/{bid}/submit-report-for-review', {})
    step('sent for radiologist review', r.ok and r.get('state') == 'UNDER_REVIEW', r)
    r = center.post(f'/radiology/bookings/{bid}/approve-report', {})
    step('approved and published', r.ok and r.get('state') == 'REPORT_READY', r)

    journey('radiology: the patient receives the report')
    r = pat.get('/radiology/reports/mine')
    step('my results lists the report', r.ok and bid in str(r.body), r.status)
    r = pat.get(f'/radiology/bookings/{bid}')
    step('booking shows REPORT_READY', r.ok and r.get('state') == 'REPORT_READY', r)
    r = pat.post('/patient-ux/review', {'booking_kind': 'radiology', 'booking_id': bid, 'rating': 5, 'comment': 'خدمة ممتازة', 'aspects': {}, 'anonymous': False})
    step('patient rates the center', r.ok, r)

    journey('radiology: payment rules on accepting a booking')
    r = pat.post('/radiology/bookings', {'service_id': scans[-1]['id'], 'scheduled_at': tomorrow_at(12), 'location_type': 'facility', 'payment_method': 'card', 'provider_account_id': center_id})
    bid2 = r.get('id')
    step('card booking created', r.ok and bid2, r)
    if bid2:
        r = center.req('PATCH', f'/radiology/bookings/{bid2}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_center'})
        step('an unpaid card booking cannot be accepted', r.status == 400, r)
        r = center.req('PATCH', f'/radiology/bookings/{bid2}/state', {'state': 'CANCELLED', 'note': 'rejected_by_center: الجهاز تحت الصيانة'})
        step('center rejects it with a reason', r.ok and r.get('state') == 'CANCELLED', r)
    from j_nursing import card_payment
    r = pat.post('/radiology/bookings', {'service_id': scans[-1]['id'], 'scheduled_at': tomorrow_at(13), 'location_type': 'facility', 'payment_method': 'card', 'provider_account_id': center_id})
    bid3 = r.get('id')
    if bid3:
        card_payment(pat, 'radiology', bid3)
        r = pat.get(f'/radiology/bookings/{bid3}')
        step('verified card payment confirms the radiology booking', r.ok and r.get('state') == 'CONFIRMED' and r.get('payment_status') == 'paid', r)

    journey('radiology screens: every tab loads')
    for path in RAD_SCREEN_GETS:
        r = center.get(path)
        step(f'GET {path}', r.ok, r)
    r = center.get('/provider/dashboard/stats')
    st = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('home stats count the center work', r.ok and any(isinstance(v, (int, float)) and v > 0 for v in st.values()), r)
    r = center.get('/provider/crm')
    step('center CRM lists the patient', r.ok and len(r.items()) > 0, r)

    if admin:
        journey('radiology: admin orders console')
        r = admin.get('/admin/admin/orders?kind=radiology&limit=25')
        row = next((x for x in r.items() if x.get('id') == bid), None)
        step('console lists it with status and amount', r.ok and row and row.get('status') == 'REPORT_READY' and row.get('amount', 0) > 0 and row.get('is_completed'), row or r.status)
    return bid


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    admin_publishes_scans(admin)
    # RadiologyRegistration: the center ticks the scans it performs (scan ids -> equipment_list)
    catalog = [x['id'] for x in Client(None, 'anon').get('/radiology/services').items()]
    provs = []
    for _ in range(2):
        p = j_onboarding.register_type('radiology', {'equipment_list': catalog})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        provs.append(p)
    pat = j_accounts.app_signup(label='rad-patient')
    run(Client(pat['token'], 'patient'), Client(provs[0]['token'], 'radiology'), Client(provs[1]['token'], 'radiology2'), admin)
    summary()
