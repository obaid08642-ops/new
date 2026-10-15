"""Journey: provider proposals and the provider-journeys leftovers (needs-review provider-journeys 13, 24, 25, 28, 32, 33).
  - A lab proposes a new test (LabDashboard "Add custom test") and a bundle (LabRegistration bundle builder) through
    POST /approval-workflow/requests; the admin sees them on admin/service-proposals (GET /approval-workflow/requests/pending,
    with who proposed), approves the test (published, owned by the lab: GET /service-catalog/mine/lab) and the bundle
    (a package in /labs/packages), and rejects a third one with a reason the lab reads in its requests.
  - The admin asks a new provider for changes with a note; the provider's status screen reads it from
    GET /provider-onboarding/progress (review_note).
  - Nursing: the live position goes to POST /nursing/visits/:id/position while on the way; a visit cannot be completed
    without the patient's signature on either end-of-visit route; completing through the visit report (the files path)
    tells the patient the visit is complete.
"""
import time
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding
    from j_nursing import admin_publishes_nursing, card_payment
    from j_lab import tomorrow_at
    admin, _ = j_admin.login()

    journey('provider-journeys 28/32: a lab proposes a test and a bundle, the admin decides')
    tests = Client(None, 'anon').get('/labs/services')
    catalog = [x['id'] for x in (tests.body if isinstance(tests.body, list) else tests.items())][:3]
    p = j_onboarding.register_type('lab', {'test_categories': catalog})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    tag = uuid.uuid4().hex[:6]
    # LabDashboard "Add custom test" body
    r = lab.post('/approval-workflow/requests', {'entity_type': 'service', 'change_data': {'type': 'lab', 'name_ar': f'تحليل مقترح {tag}', 'name_en': f'Proposed test {tag}', 'price': 120, 'fasting_required': True, 'turnaround_hours': 24, 'reference_ranges': {'min': 1, 'max': 9, 'unit': 'mg/dL'}}})
    test_req = r.get('id')
    step('the lab sends a new test for review', r.ok and test_req, r)
    # LabRegistration bundle (proposeService)
    r = lab.post('/approval-workflow/requests', {'entity_type': 'service', 'change_data': {'type': 'lab', 'is_package': True, 'name_ar': f'حزمة مقترحة {tag}', 'name_en': f'Proposed bundle {tag}', 'price': 299, 'included_services': ['CBC', 'TSH']}})
    bundle_req = r.get('id')
    step('the lab sends a bundle for review', r.ok and bundle_req, r)
    r = lab.post('/approval-workflow/requests', {'entity_type': 'service', 'change_data': {'type': 'lab', 'name_ar': f'مرفوض {tag}', 'price': 10}})
    reject_req = r.get('id')
    r = admin.get('/approval-workflow/requests/pending')
    rows = r.body if isinstance(r.body, list) else r.items()
    mine = [x for x in rows if x.get('id') in (test_req, bundle_req, reject_req)]
    step('the admin review list has the three proposals with who proposed them', r.ok and len(mine) == 3 and all(x.get('submitter_name') for x in mine), str(mine)[:400])
    r = admin.post(f'/approval-workflow/requests/{test_req}/decide', {'decision': 'approved'})
    test_id = r.get('entity_id')
    step('the admin approves the test', r.ok and r.get('status') == 'approved' and test_id, r)
    r = admin.post(f'/approval-workflow/requests/{bundle_req}/decide', {'decision': 'approved'})
    bundle_id = r.get('entity_id')
    step('the admin approves the bundle', r.ok and bundle_id, r)
    r = admin.post(f'/approval-workflow/requests/{reject_req}/decide', {'decision': 'rejected', 'notes': 'اسم غير واضح'})
    step('the admin rejects one with a reason', r.ok and r.get('status') == 'rejected', r)
    r = lab.get('/service-catalog/mine/lab')
    owned = r.body if isinstance(r.body, list) else r.items()
    step('the approved test and bundle belong to the lab', r.ok and {test_id, bundle_id} <= {x.get('id') for x in owned}, [x.get('id') for x in owned][:10])
    r = Client(None, 'anon').get('/labs/packages')
    pk = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('id') == bundle_id), None)
    step('the bundle is a published package with its tests', pk and pk.get('included_services') == ['CBC', 'TSH'] and pk.get('price') == 299, pk or r.status)
    r = lab.get('/approval-workflow/my-requests')
    rej = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('id') == reject_req), {})
    step('the lab reads the rejection reason', rej.get('status') == 'rejected' and rej.get('rejected_reason') == 'اسم غير واضح', rej)

    journey('provider-journeys 24: the admin\'s "needs changes" note reaches the provider')
    d = j_onboarding.register_type('doctor')
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    acc = next((i for i in (r.body.get('items', []) if isinstance(r.body, dict) else []) if i.get('email') == d['email']), None)
    step('the new doctor is pending', acc, r)
    if acc:
        r = admin.post(f"/admin/admin/providers/{acc['id']}/request-changes", {'note': 'ارفع رخصة سارية'})
        step('the admin asks for changes with a note', r.ok, r)
        r = Client(d['token'], 'doctor').get('/provider-onboarding/progress')
        body = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
        step('the status screen reads the note and the state', r.ok and body.get('review_note') == 'ارفع رخصة سارية' and body.get('account_status') == 'needs_changes', str(body)[:300])

    journey('provider-journeys 13/25/33: one end-of-visit guarantee and the position route')
    admin_publishes_nursing(admin)
    cat = Client(None, 'anon').get('/nursing/catalog')
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': 0} for x in (cat.body if isinstance(cat.body, list) else cat.items())]
    n = j_onboarding.register_type('home_care', {'nursing_services': services})
    j_onboarding.admin_review(admin, n)
    j_onboarding.provider_after_approval(n)
    nurse = Client(n['token'], 'nurse')
    nurse_id = nurse.get('/provider/me').get('account', 'id')
    pat = Client(j_accounts.app_signup(label='visit-end')['token'], 'patient')
    pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع الملك فهد 3', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001, 'is_default': True})
    svc = (pat.get('/home-care/services').body or [{}])[0]
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    bid = pat.post('/nursing/bookings', {'provider_id': nurse_id, 'service_id': svc.get('id'), 'service_name_ar': svc.get('name_ar'), 'scheduled_at': tomorrow_at(10), 'address': addr, 'payment_method': 'card'}).get('id')
    step('a paid visit is booked', bid, bid)
    if not bid:
        return
    card_payment(pat, 'nursing', bid)
    nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})
    r = nurse.post(f'/nursing/visits/{bid}/position', {'lat': 24.71, 'lng': 46.71})
    step('no position before setting off', r.status == 400, r)
    nurse.post(f'/nursing/visits/{bid}/transit', {})
    r = nurse.post(f'/nursing/visits/{bid}/position', {'lat': 24.705, 'lng': 46.705})
    step('the live position goes to the visit route while on the way', r.ok, r)
    r = pat.get(f'/nursing/visits/{bid}/tracking')
    t = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the patient\'s tracking shows that position', r.ok and '24.705' in str(t), str(t)[:300])
    nurse.post(f'/nursing/visits/{bid}/arrive', {'lat': 24.7002, 'lng': 46.7002})
    r = nurse.post(f'/home-care/bookings/{bid}/visit-report', {'complete': True, 'clinical_notes': 'x', 'signature': 'data:image/png;base64,iVBORw0KGgo='})
    step('the visit report cannot complete before care started', r.status == 400, r)
    nurse.post(f'/nursing/visits/{bid}/start-care', {})
    r = nurse.post(f'/nursing/visits/{bid}/complete', {'clinical_notes': 'x'})
    step('/complete without the patient signature is refused', r.status == 400, r)
    r = nurse.post(f'/home-care/bookings/{bid}/visit-report', {'complete': True, 'clinical_notes': 'x'})
    step('the visit report without the signature is refused', r.status == 400, r)
    r = nurse.post(f'/home-care/bookings/{bid}/visit-report', {'complete': True, 'clinical_notes': 'تمت الزيارة', 'signature': 'data:image/png;base64,iVBORw0KGgo='})
    step('with the signature the visit report completes the visit', r.ok and r.get('state') == 'COMPLETED', r)
    rows, end = [], time.time() + 15
    while time.time() < end:
        res = pat.get('/notifications')
        b = res.body if isinstance(res.body, (list, dict)) else {}
        rows = b if isinstance(b, list) else (b.get('notifications') or b.get('items') or [])
        if any(x.get('title_key') == 'notif.homecare_completed.title' for x in rows):
            break
        time.sleep(1)
    step('the patient is told the visit is complete', any(x.get('title_key') == 'notif.homecare_completed.title' for x in rows), str(rows)[:300])


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
