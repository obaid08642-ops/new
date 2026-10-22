"""Journey: a lab test's preparation in the six app languages (owner decision 2026-10-15; 14b-app #4).
  The preparation comes per test from the catalogue, in ar/en/ur/hi/bn/tl, written by the admin
  (admin/src/pages/admin/catalog-manager.tsx, PUT /labs/admin/catalog/:id) and by the lab
  (provider-app LabDashboard test menu, POST /approval-workflow/requests, the admin approves).
  patient-app diagnostics/sample-tracking reads GET /labs/bookings/:id/tracking and shows the text in its language;
  a test without preparation comes back with none, so the app only says the lab will confirm any preparation.
"""
import uuid

from lib import Client, journey, step

PREP = {
    'preparation_ar': ['الصيام 8 ساعات', 'شرب الماء فقط'],
    'preparation_en': ['Fast for 8 hours', 'Water only'],
    'preparation_ur': ['8 گھنٹے روزہ رکھیں', 'صرف پانی پیئیں'],
    'preparation_hi': ['8 घंटे उपवास करें', 'केवल पानी पिएं'],
}


def admin_test(admin, tag, name, extra):
    body = {'name_ar': f'{name} {tag}', 'name_en': f'{name} {tag}', 'category': 'blood', 'sample_type': 'blood', 'price': 90,
            'turnaround_hours': 24, 'home_visit_supported': True, 'active': True, 'medical_review_status': 'approved', **extra}
    r = admin.post('/labs/admin/catalog', body)
    return r, r.get('id')


def admin_row(admin, test_id):
    r = admin.get('/labs/admin/catalog')
    rows = r.body if isinstance(r.body, list) else r.items()
    return next((x for x in rows if isinstance(x, dict) and x.get('id') == test_id), {})


def book(pat, lab_id, test_id, hour):
    import j_lab
    r = pat.post('/labs/bookings', {'items': [{'service_id': test_id}], 'scheduled_at': j_lab.tomorrow_at(hour),
                                    'location_type': 'facility', 'payment_method': 'cash', 'provider_account_id': lab_id})
    step(f'the patient books the test (hour {hour})', r.ok and r.get('id'), r)
    return r.get('id')


def run():
    import j_admin, j_accounts, j_onboarding
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]

    journey('lab preparation: the admin writes it per test in the app languages')
    r, prep_id = admin_test(admin, tag, 'Fasting glucose', {'preparation_ar': PREP['preparation_ar'], 'preparation_en': PREP['preparation_en']})
    step('admin adds a test with Arabic and English preparation', r.ok and prep_id, r)
    r = admin.put(f'/labs/admin/catalog/{prep_id}', {'preparation_ur': PREP['preparation_ur'], 'preparation_hi': PREP['preparation_hi']})
    step('admin saves the Urdu and Hindi preparation from the catalogue editor', r.ok, r)
    row = admin_row(admin, prep_id)
    step('the catalogue keeps the Urdu and Hindi lists', row.get('preparation_ur') == PREP['preparation_ur'] and row.get('preparation_hi') == PREP['preparation_hi'],
         {k: row.get(k) for k in PREP})
    r, bare_id = admin_test(admin, tag, 'Iron', {})
    step('admin adds a test with no preparation', r.ok and bare_id, r)

    journey('lab preparation: the patient sees the booked test\'s own text in Urdu')
    p = j_onboarding.register_type('lab', {'test_categories': [prep_id, bare_id]})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    lab_id = lab.get('/provider/me').get('account', 'id')
    pat = Client(j_accounts.app_signup(label='prep-patient')['token'], 'patient')
    if not prep_id or not bare_id:
        step('both tests exist', False, f'{prep_id} {bare_id}')
        return
    bid = book(pat, lab_id, prep_id, 9)
    r = pat.get(f'/labs/bookings/{bid}/tracking')  # patient-app app/diagnostics/sample-tracking.tsx
    entry = next((x for x in (r.get('preparation') or []) if isinstance(x, dict) and x.get('service_id') == prep_id), {})
    texts = entry.get('texts') or {}
    step('the tracking lists the test\'s preparation', r.ok and bool(entry), r)
    step('the Urdu text comes back as the admin wrote it', texts.get('ur') == PREP['preparation_ur'], texts)
    step('and the Hindi, Arabic and English texts', texts.get('hi') == PREP['preparation_hi'] and texts.get('ar') == PREP['preparation_ar'] and texts.get('en') == PREP['preparation_en'], texts)
    bid2 = book(pat, lab_id, bare_id, 15)
    r = pat.get(f'/labs/bookings/{bid2}/tracking')
    step('a test with no preparation returns none (the app shows only "the lab will confirm any preparation")', r.ok and r.get('preparation') == [], r)

    journey('lab preparation: the lab writes it too, through the admin review')
    r = lab.post('/approval-workflow/requests', {'entity_type': 'service', 'change_data': {
        'type': 'lab', 'name_ar': f'تحليل الكورتيزول {tag}', 'name_en': f'Cortisol {tag}', 'price': 140, 'preparation_bn': ['সকাল ৮টায় নমুনা দিন']}})
    req = r.get('id')
    step('the lab proposes a test with its Bengali preparation', r.ok and req, r)
    r = admin.post(f'/approval-workflow/requests/{req}/decide', {'decision': 'approved', 'edit_data': {'category': 'hormones'}})
    own_id = r.get('entity_id')
    step('the admin approves it', r.ok and own_id, r)
    r = lab.post('/approval-workflow/requests', {'entity_type': 'service', 'entity_id': own_id, 'change_data': {
        'price': 150, 'preparation_tl': ['Kunin ang sample nang alas-8 ng umaga']}})  # LabDashboard test menu edit sheet
    req2 = r.get('id')
    step('the lab edits its test\'s Filipino preparation from the test menu', r.ok and req2, r)
    r = admin.post(f'/approval-workflow/requests/{req2}/decide', {'decision': 'approved'})
    step('the admin approves the edit', r.ok, r)
    row = admin_row(admin, own_id)
    step('the catalogue has the lab\'s Bengali and Filipino preparation',
         row.get('preparation_bn') == ['সকাল ৮টায় নমুনা দিন'] and row.get('preparation_tl') == ['Kunin ang sample nang alas-8 ng umaga'] and row.get('price') == 150,
         {k: row.get(k) for k in ('preparation_bn', 'preparation_tl', 'price')})
    r = lab.get('/provider/capabilities/lab-services')
    mine = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if isinstance(x, dict) and x.get('id') == own_id), {})
    step('the lab\'s test menu reads the preparation back to edit it', mine.get('preparation_tl') == ['Kunin ang sample nang alas-8 ng umaga'], mine)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
