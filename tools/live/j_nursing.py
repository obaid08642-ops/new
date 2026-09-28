"""Journey: home nursing visit, patient-app nursing -> nurse (provider-app NursingDashboard/NursingFieldOps) -> patient.
Payloads copied from patient-app app/(tabs)/nursing.tsx, nursing/service-details.tsx, nursing/nurse-profile.tsx
(booking + card payment intent), app/payments/result.tsx (verify), provider-app screens/nursing/*."""
import urllib.request, uuid
from lib import Client, journey, step
from j_lab import tomorrow_at

NURSE_SCREEN_GETS = ['/provider/dashboard/stats', '/provider/profile', '/provider/jobs/queue?kind=nursing&status=incoming',
                     '/provider/jobs/queue?kind=nursing&status=active', '/provider/jobs/queue?kind=nursing&status=completed',
                     '/nursing/jobs/active', '/provider/nursing/checklist', '/provider/nursing/supplies', '/provider/crm',
                     '/provider/ops/wallet/ledger', '/provider/reviews', '/provider/promotions', '/referrals/my',
                     '/provider-onboarding/my-profile', '/provider/stats/today', '/provider/settlements']


def fake_pay(moyasar_id, status='paid'):
    """The patient completes the hosted checkout (tools/live/fake_moyasar.py)."""
    urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:9100/__pay/{moyasar_id}?status={status}', method='POST')).read()


def card_payment(pat, kind, bid):
    """patient-app: POST /payments/intent/<kind>/<id> -> hosted checkout -> payments/result verifies."""
    r = pat.post(f'/payments/intent/{kind}/{bid}', {}, headers={'Idempotency-Key': f'payment-{kind}-{bid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step(f'{kind}: payment intent created (amount from the server)', r.ok and txn.get('id') and txn.get('amount'), r)
    if not txn.get('id'):
        return None
    fake_pay(txn.get('gateway_intent_id'))
    r = pat.post(f"/payments/verify/{txn['id']}", {})
    step(f'{kind}: payment verified as paid', r.ok and (r.get('status') == 'paid'), r)
    return txn


def admin_publishes_nursing(admin, n=3):
    journey('nursing catalog: admin publishes services')
    r = admin.get('/nursing/admin/catalog')
    items = r.body if isinstance(r.body, list) else r.items()
    if r.ok and len(items) == 0:
        # Fresh DB: the catalog starts empty — create the services, then publish them.
        seeds = [('زيارة تمريضية منزلية', 'Home nursing visit', 'general', 150, '60 دقيقة'),
                 ('قياس العلامات الحيوية', 'Vitals check', 'general', 80, '30 دقيقة'),
                 ('العناية بالجروح', 'Wound care', 'general', 200, '45 دقيقة')]
        for ar, en, cat, price, duration in seeds:
            rc = admin.post('/nursing/admin/catalog', {'name_ar': ar, 'name_en': en, 'category': cat,
                                                       'price': price, 'duration': duration, 'active': True})
            step(f"admin creates service '{en}'", rc.ok, rc)
        r = admin.get('/nursing/admin/catalog')
        items = r.body if isinstance(r.body, list) else r.items()
    step('admin catalog lists services including unpublished ones', r.ok and len(items) > 0, f'{r.status} {len(items)}')
    for it in [i for i in items if i.get('medical_review_status') != 'approved'][:n]:
        r = admin.put(f"/nursing/admin/catalog/{it['id']}", {'medical_review_status': 'approved'})
        step(f"admin publishes '{it.get('name_en')}'", r.ok and r.get('public_eligibility') is True, r)


def run(pat, nurse, admin=None):
    nurse_id = nurse.get('/provider/me').get('account', 'id')
    journey('nursing: patient finds a nurse for a service')
    r = pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع الملك فهد 3', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001, 'is_default': True})
    step('patient has a located address', r.ok, r)
    r = pat.get('/home-care/services')
    svcs = r.body if isinstance(r.body, list) else r.items()
    step('nursing tab lists published services', r.ok and len(svcs) > 0 and all(s.get('medical_review_status') == 'approved' for s in svcs), f'{r.status} {len(svcs)}')
    svc = svcs[0]
    r = pat.get(f"/home-care/services/{svc['id']}")
    step('service info opens', r.ok and r.get('id') == svc['id'], r)
    r = pat.get(f"/home-care/providers?type={svc['id']}&sort=rating&gender=any&availability=any&nationality=any&search=")
    nurses = r.body if isinstance(r.body, list) else r.items()
    step('service-details lists the approved nurse offering it', r.ok and any(n.get('id') == nurse_id for n in nurses), f'{r.status} {[n.get("id") for n in nurses][:5]}')
    r = pat.get(f"/home-care/providers/{nurse_id}?serviceId={svc['id']}")
    step('nurse profile shows name and the service price', r.ok and r.get('name_ar') and r.get('price') == svc.get('price'), r)

    journey('nursing: patient books and pays by card')
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    body = {'provider_id': nurse_id, 'service_id': svc['id'], 'service_name_ar': svc.get('name_ar'), 'scheduled_at': tomorrow_at(9), 'address': addr, 'payment_method': 'card'}
    r = pat.post('/nursing/bookings', {**body, 'payment_method': 'cash'})
    step('cash is refused for a home visit', r.status == 400, r)
    r = pat.post('/nursing/bookings', body)
    bid = r.get('id')
    step('booking created, assigned to the chosen nurse', r.ok and bid and r.get('provider_id') == nurse_id and r.get('state') == 'PROVIDER_ASSIGNED', r)
    if not bid:
        return
    r = nurse.get('/provider/jobs/queue?kind=nursing&status=incoming')
    step('the request reaches the nurse (incoming)', r.ok and bid in [j.get('id') for j in r.items()], r)
    r = nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})
    step('an unpaid card visit cannot be accepted', r.status == 400, r)
    card_payment(pat, 'nursing', bid)

    journey('nursing: the nurse accepts and performs the visit')
    r = nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})
    step('nurse accepts', r.ok, r)
    r = nurse.get('/provider/jobs/queue?kind=nursing&status=active')
    step('visit is in the active tab', r.ok and bid in [j.get('id') for j in r.items()], r)
    r = nurse.get(f'/nursing/visits/{bid}')
    step('field ops loads the visit', r.ok, r)
    r = nurse.post(f'/nursing/visits/{bid}/arrive', {'lat': 24.7001, 'lng': 46.7001})
    step('cannot arrive before setting off', r.status == 400, r)
    r = nurse.post(f'/nursing/visits/{bid}/transit', {})
    step('on the way', r.ok, r)
    r = nurse.post(f'/nursing/visits/{bid}/arrive', {'lat': 24.80, 'lng': 46.80})
    step('arrival far from the patient is refused (geofence)', r.status == 400, r)
    r = nurse.post(f'/nursing/visits/{bid}/arrive', {'lat': 24.7002, 'lng': 46.7002})
    step('arrived at the patient', r.ok, r)
    r = nurse.post(f'/nursing/visits/{bid}/start-care', {})
    step('care started', r.ok, r)
    # NursingFieldOps doComplete: notes + the patient's signature (required by the screen)
    r = nurse.post(f'/nursing/visits/{bid}/complete', {'clinical_notes': 'تم إعطاء الحقنة ومتابعة العلامات الحيوية', 'signature_base64': 'data:image/png;base64,iVBORw0KGgo='})
    step('visit completed with the report', r.ok, r)

    journey('nursing: the patient sees the finished visit')
    r = pat.get('/nursing/bookings/mine')
    b = next((x for x in r.items() if x.get('id') == bid), None) if not isinstance(r.body, list) else next((x for x in r.body if x.get('id') == bid), None)
    step('my visits shows it COMPLETED and paid', b and b.get('state') == 'COMPLETED' and b.get('payment_status') == 'paid', b)
    r = pat.post('/patient-ux/review', {'booking_kind': 'nursing', 'booking_id': bid, 'rating': 5, 'comment': 'ممرضة محترفة', 'aspects': {}, 'anonymous': False})
    step('patient rates the nurse', r.ok, r)

    journey('nurse screens: every tab loads')
    for path in NURSE_SCREEN_GETS:
        r = nurse.get(path)
        step(f'GET {path}', r.ok, r)
    r = nurse.get('/provider/dashboard/stats')
    st = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('home stats count the visit', r.ok and any(isinstance(v, (int, float)) and v > 0 for v in st.values()), r)
    r = nurse.get('/provider/crm')
    step('nurse CRM lists the patient', r.ok and len(r.items()) > 0, r)

    if admin:
        journey('nursing: admin orders console')
        r = admin.get('/admin/admin/orders?kind=nursing&limit=25')
        row = next((x for x in r.items() if x.get('id') == bid), None)
        step('console lists it with status and amount', r.ok and row and row.get('status') == 'COMPLETED' and row.get('amount', 0) > 0, row or r.status)
        d = admin.get(f'/admin/admin/orders/nursing/{bid}')
        fin = d.get('financials') or {}
        step('console detail shows the card payment', d.ok and (fin.get('gross_paid') or 0) > 0, d.get('financials'))
        paid = fin.get('gross_paid') or 0
        r = admin.post(f'/admin/admin/orders/nursing/{bid}/refund', {'mode': 'partial', 'amount': round(paid / 2, 2), 'reason': 'تأخر الممرضة عن الموعد المحدد نصف ساعة'})
        step('admin partial refund to the patient wallet', r.ok and r.get('credited_amount') == round(paid / 2, 2), r)
        d = admin.get(f'/admin/admin/orders/nursing/{bid}')
        step('detail shows the refund and what is left refundable', d.ok and (d.get('financials') or {}).get('refundable_max') == round(paid - round(paid / 2, 2), 2), d.get('financials'))
        r = admin.post(f'/admin/admin/orders/nursing/{bid}/refund', {'mode': 'partial', 'amount': paid, 'reason': 'محاولة استرداد يتجاوز المتبقي من المبلغ'})
        step('refund above the remaining amount is refused', r.status == 400, r)
    return bid


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    admin_publishes_nursing(admin)
    # NursingRegistration: nursing_services = ticked catalog services
    catalog = Client(None, 'anon').get('/nursing/catalog')
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': 0} for x in (catalog.body if isinstance(catalog.body, list) else catalog.items())]
    p = j_onboarding.register_type('home_care', {'nursing_services': services})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pat = j_accounts.app_signup(label='nursing-patient')
    run(Client(pat['token'], 'patient'), Client(p['token'], 'nurse'), admin)
    summary()
