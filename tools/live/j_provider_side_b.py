"""Journey: provider-side fixes (needs-review provider-admin-ish#2, provider-shared#2, provider-doctor#2,
provider-facility#6, provider-journeys#33), proved through the real API:
- provider-only routes refuse a patient session (403) and serve a provider (200);
- applying a prescription template in EPrescriptionScreen is a stored action (POST .../templates/:id/use);
- FacilitySettingsScreen tariffs: saved (admin review), read back after approval, only the entered prices kept;
- a visit finished through POST /home-care/bookings/:id/visit-report (result files) notifies the patient.
Payloads copied from provider-app EPrescriptionScreen.tsx, FacilitySettingsScreen.tsx, NursingFieldOps.tsx
(+ visitFiles.ts buildVisitReportBody)."""
from lib import Client, journey, step
import j_onboarding
from j_lab import tomorrow_at
from j_nursing import card_payment, admin_publishes_nursing

PROVIDER_ONLY_GETS = ['/provider/ops/wallet/ledger', '/provider/wallet/transactions', '/provider/wallet', '/provider/stats/today',
                      '/provider/stats/period?period=month', '/provider/schedule/settings', '/provider/ops/doctor/leave',
                      '/provider/ops/doctor/diagnoses', '/provider/ops/doctor/templates']


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def role_guards(pat, doc):
    journey('provider-only routes: patient 403, provider 200')
    for path in PROVIDER_ONLY_GETS:
        r = pat.get(path)
        step(f'patient GET {path} -> 403', r.status == 403, r)
        r = doc.get(path)
        step(f'doctor GET {path} -> 200', r.ok, r)


def prescription_template(pat, doc):
    journey('e-prescription: applying a saved template is a stored action')
    # EPrescriptionScreen "Save as Template" sheet
    r = doc.post('/provider/ops/doctor/templates', {'name': 'نموذج الربو', 'items': [
        {'name': 'Salbutamol inhaler', 'dose': 'بخّتان', 'freq': 'عند الحاجة', 'duration': '7 أيام', 'notes': ''},
        {'name': 'Budesonide inhaler', 'dose': 'بخّة', 'freq': 'مرتين/اليوم', 'duration': 'شهر', 'notes': 'اغسل الفم بعدها'}]})
    tid = r.get('template', 'id')
    step('doctor saves a template', r.ok and tid, r)
    if not tid:
        return
    r = doc.get('/provider/ops/doctor/templates')
    before = next((t for t in rows(r) if t.get('id') == tid), {})
    step('template listed with usage_count 0', r.ok and before.get('usage_count') == 0, before or r)
    # EPrescriptionScreen applyTemplate(t.id)
    r = doc.post(f'/provider/ops/doctor/templates/{tid}/use', {})
    step('apply the template -> server returns its medicines', r.ok and r.get('id') == tid and len(r.get('items') or []) == 2, r)
    r = doc.get('/provider/ops/doctor/templates')
    after = next((t for t in rows(r) if t.get('id') == tid), {})
    step('the use is stored (usage_count 1, last_used_at set)', r.ok and after.get('usage_count') == 1 and after.get('last_used_at'), after or r)
    r = pat.post(f'/provider/ops/doctor/templates/{tid}/use', {})
    step('a patient cannot apply a doctor template (403)', r.status == 403, r)
    r = doc.post('/provider/ops/doctor/templates/tpl_does_not_exist/use', {})
    step('an unknown template is 404 (no fake success)', r.status == 404, r)
    r = doc.delete(f'/provider/ops/doctor/templates/{tid}')
    step('clean up the template', r.ok, r)


def facility_tariffs(pat, doc, hosp, admin):
    journey('facility tariffs: saved, approved, read back')
    r = pat.get('/provider/settings/tariffs')
    step('patient GET tariffs -> 403', r.status == 403, r)
    r = doc.put('/provider/settings/tariffs', {'icu_daily': 1})
    step('a doctor cannot set facility tariffs (403)', r.status == 403, r)
    r = hosp.get('/provider/settings/tariffs')
    step('a new hospital starts with no tariffs (no invented numbers)', r.ok and r.body.get('tariffs') is None, r)
    r = hosp.put('/provider/settings/tariffs', {})
    step('an empty tariffs form is refused', r.status == 400, r)
    r = hosp.put('/provider/settings/tariffs', {'icu_daily': -5})
    step('a negative price is refused', r.status == 400, r)
    # FacilitySettingsScreen handleSavePrices: only the entered fields (ICU daily, ward daily, emergency fee)
    entered = {'icu_daily': 2500, 'ward_daily': 900, 'emergency_fee': 300}
    r = hosp.put('/provider/settings/tariffs', entered)
    did = r.get('id')
    step('tariffs submitted for admin review', r.ok and r.get('pending_review') and did, r)
    r = hosp.get('/provider/settings/tariffs')
    pend = r.body.get('pending') if isinstance(r.body, dict) else None
    step('the pending change is shown, approved tariffs still empty', r.ok and r.body.get('tariffs') is None and pend and pend.get('value') == entered, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    step('admin sees the tariff change', r.ok and any(x.get('id') == did for x in rows(r)), r)
    r = admin.post(f'/admin/admin/providers/provider-deltas/{did}/approve', {})
    step('admin approves it', r.ok, r)
    r = hosp.get('/provider/settings/tariffs')
    step('the hospital reads back exactly what it entered', r.ok and r.body.get('tariffs') == entered and r.body.get('pending') is None, r)


def visit_report_notifies(pat, nurse):
    journey('nursing: a visit finished with result files notifies the patient')
    nurse_id = nurse.get('/provider/me').get('account', 'id')
    r = pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع الملك فهد 3', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001, 'is_default': True})
    step('patient has a located address', r.ok, r)
    r = pat.get('/home-care/services')
    svcs = rows(r)
    step('nursing services listed', r.ok and len(svcs) > 0, r)
    if not svcs:
        return
    svc = svcs[0]
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    r = pat.post('/nursing/bookings', {'provider_id': nurse_id, 'service_id': svc['id'], 'service_name_ar': svc.get('name_ar'),
                                       'scheduled_at': tomorrow_at(11), 'address': addr, 'payment_method': 'card'})
    bid = r.get('id')
    step('patient books the nurse', r.ok and bid, r)
    if not bid:
        return
    card_payment(pat, 'nursing', bid)
    for name, call in [('nurse accepts', lambda: nurse.post(f'/provider/jobs/nursing/{bid}/accept', {})),
                       ('on the way', lambda: nurse.post(f'/nursing/visits/{bid}/transit', {})),
                       ('arrived', lambda: nurse.post(f'/nursing/visits/{bid}/arrive', {'lat': 24.7002, 'lng': 46.7002})),
                       ('care started', lambda: nurse.post(f'/nursing/visits/{bid}/start-care', {}))]:
        r = call()
        step(name, r.ok, r)
    # NursingFieldOps doComplete with files: uploadVisitFiles -> visit-report (buildVisitReportBody)
    r = nurse.post('/storage/upload', {'data_base64': j_onboarding.PNG, 'mime': 'image/png', 'original_name': 'cbc-result.png'})
    sid = r.get('id')
    step('nurse uploads a result file', r.ok and sid, r)
    if not sid:
        return
    r = nurse.post(f'/home-care/bookings/{bid}/visit-report', {'complete': True, 'attachments': [{'storage_id': sid, 'name': 'cbc-result.png'}],
                                                               'vitals': {'bp': '120/80', 'pulse': 72}, 'clinical_notes': 'تم سحب العينة وقياس العلامات',
                                                               'signature': 'data:image/png;base64,' + j_onboarding.PNG})
    step('visit completed through the visit report', r.ok and r.get('state') == 'COMPLETED', r)
    r = pat.get('/nursing/bookings/mine')
    b = next((x for x in rows(r) if x.get('id') == bid), None)
    step('patient sees the visit COMPLETED', b and b.get('state') == 'COMPLETED', b or r)
    r = pat.get('/notifications')

    def route_of(n):
        act = n.get('action')
        return str(act.get('route') or '') if isinstance(act, dict) else ''
    mine = [n for n in rows(r) if isinstance(n, dict) and route_of(n) == f'/nursing/tracking/{bid}']
    done = [n for n in mine if 'homecare_completed' in str(n.get('title_key') or '') or n.get('title') in ('اكتملت الزيارة', 'Visit Completed')]
    step('the patient is notified that the visit is completed', r.ok and done, f'{len(mine)} for this visit: {[n.get("title_key") or n.get("title") for n in mine]}')


def run(pat, doc, hosp, nurse, admin):
    role_guards(pat, doc)
    prescription_template(pat, doc)
    facility_tariffs(pat, doc, hosp, admin)
    visit_report_notifies(pat, nurse)


if __name__ == '__main__':
    import j_admin, j_accounts
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in rows(specs)), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic', 'video', 'home']})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    h = j_onboarding.register_type('hospital')
    j_onboarding.admin_review(admin, h)
    j_onboarding.provider_after_approval(h)
    admin_publishes_nursing(admin)
    catalog = Client(None, 'anon').get('/nursing/catalog')
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': x.get('price') or 50} for x in rows(catalog)]
    n = j_onboarding.register_type('home_care', {'nursing_services': services})
    j_onboarding.admin_review(admin, n)
    j_onboarding.provider_after_approval(n)
    pat = j_accounts.app_signup(label='side-b-patient')
    run(Client(pat['token'], 'patient'), Client(d['token'], 'doctor'), Client(h['token'], 'hospital'), Client(n['token'], 'nurse'), admin)
    summary()
