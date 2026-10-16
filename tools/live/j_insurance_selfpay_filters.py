"""Journey (owner decisions 2026-10-14, questions 5 and 28, with decision 30 "insurance chosen first"):
needs-review 2-web 12, 3-app 0, 3-web 3.

  - /consultations/doctors: the old "Cash only" (accepts_insurance=false, i.e. only doctors who refuse insurance) is gone.
    "Self-pay" lists every doctor; "Insurance" lists, for a signed-in patient with a saved policy, the doctors contracted
    for that company and class (GET /care/doctors?insurance=<company id>&insurance_class=<class>, the D-30 contract); an
    old shared link with payment=cash reads as self-pay.
  - /diagnostics: "Self-pay" (the default) lists the tests the patient may pay for (cash_availability not false),
    "Insurance" only the tests that take insurance (insurance_availability true).
  Stack: backend :8002, patient-web :3100 (signed in through the website's own /api/auth/login).
"""
import os
import re
import subprocess
import uuid

from lib import Client, WebClient, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
HTML = {'accept': 'text/html'}


def doctor(admin, contracts):
    """A public doctor with clinic hours; `contracts` = the companies it records in the provider app (availability)."""
    import j_onboarding, j_consultation
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doc = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, ('clinic',))
    if contracts:
        r = doc.patch('/provider/profile/availability', {'accepted_insurance': contracts})
        step('the doctor records the insurance companies it is contracted with', r.ok, r)
    return doc.get('/provider-onboarding/my-profile').get('id')


def set_service_payment(service_id, cash, insurance):
    """TEST database only: the admin catalogue has no field for these flags yet (every service defaults to both)."""
    db = os.environ.get('DB_NAME') or 'nabd_live'
    js = (f'db.getSiblingDB("{db}").lab_services.updateOne({{id: "{service_id}"}}, '
          f'{{$set: {{cash_availability: {str(cash).lower()}, insurance_availability: {str(insurance).lower()}}}}}).modifiedCount')
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', '--eval', js], capture_output=True, text=True, timeout=60)
    return out.stdout.strip()


def ids_on(page, locale='ar'):
    return set(re.findall(rf'/{locale}/consultations/doctors/([A-Za-z0-9_-]+)"', page if isinstance(page, str) else ''))


def main():
    import j_admin, j_accounts, j_insurance
    admin, _ = j_admin.login()
    code = j_insurance.admin_adds_company(admin)
    company = next((c for c in j_insurance.rows(admin.get('/insurance/companies/all')) if c.get('code') == code), {})
    step('the company has an id', company.get('id'), company)

    journey('decision 30 doctors: one contracted doctor, one with no contract')
    contracted = doctor(admin, [{'company_id': company.get('id'), 'classes': ['A'], 'active': True}])
    other = doctor(admin, [])
    step('both doctors are public', contracted and other, (contracted, other))

    journey('decision 30 doctors: the patient saves the policy (add-policy) and signs in on the website')
    acct = j_accounts.app_signup(label='insurance-first')
    pat = Client(acct['token'], 'patient')
    r = pat.post('/insurance/save-policy', {'provider': company.get('name_ar'), 'company_id': code, 'class': 'A', 'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}',
                                            'expiry_date': '2027-12-31', 'member_name': 'مريض تأمين', 'verified': False, 'ocr_extracted': False})
    step('the policy is saved with its company and class', r.ok, r)
    web = WebClient(WEB, 'web-patient')
    r = web.post('/api/auth/login', {'identifier': acct['email'], 'password': acct['password']})
    step('the patient signs in on the website', r.ok, r)

    # The doctors page is a cached public page and reads no session: the browser asks for the saved policy and opens the
    # list for that company and class (components-next/consult/insurer-from-policy.tsx). The journey does the same calls.
    r = web.get('/api/insurance/policy')
    step('the website returns the saved company and class to the signed-in patient', r.ok and r.get('company') == code and r.get('class') == 'A', r)
    guest = WebClient(WEB, 'web-guest')
    step('a guest gets no policy', guest.get('/api/insurance/policy').status == 401)
    r = web.get(f'/ar/consultations/doctors?payment=insurance&insurance={code}&insurance_class=A', headers=HTML)
    shown = ids_on(r.body)
    step('Insurance: the doctor contracted for the patient\'s company is listed', r.ok and contracted in shown, sorted(shown)[:10])
    step('Insurance: a doctor with no contract for it is not', r.ok and other not in shown, sorted(shown)[:10])

    r = web.get('/ar/consultations/doctors?payment=self_pay', headers=HTML)
    shown = ids_on(r.body)
    step('Self-pay: every doctor is listed', r.ok and {contracted, other} <= shown, sorted(shown)[:10])
    step('Self-pay is drawn as the chosen payment', r.ok and 'دفع ذاتي' in str(r.body), r.status)
    step('the old "Cash only" choice is gone', r.ok and 'كاش فقط' not in str(r.body), r.status)

    r = web.get('/ar/consultations/doctors?payment=cash', headers=HTML)
    shown = ids_on(r.body)
    step('an old payment=cash link reads as self-pay (every doctor, not "doctors without insurance")', r.ok and {contracted, other} <= shown, sorted(shown)[:10])

    journey('decision 30 diagnostics: self-pay first, then insurance')
    made = {}
    for kind, cash, insurance in (('self', True, False), ('ins', False, True)):
        tag = uuid.uuid4().hex[:5]
        body = {'name_ar': f'فحص {kind} {tag}', 'name_en': f'Test {kind} {tag}', 'category': 'vitamins', 'sample_type': 'blood', 'price': 75,
                'turnaround_hours': 24, 'popularity': 100, 'home_visit_supported': True, 'facility_visit_supported': True, 'active': True,
                'medical_review_status': 'pending'}
        r = admin.post('/labs/admin/catalog', body)
        tid = r.get('id')
        step(f'admin adds a test ({kind})', r.ok and tid, r)
        r = admin.put(f'/labs/admin/catalog/{tid}', {**body, 'medical_review_status': 'approved'})
        step(f'admin publishes it ({kind})', r.ok and r.get('public_eligibility') is True, r)
        step(f'its payment flags are set (test database): cash={cash} insurance={insurance}', set_service_payment(tid, cash, insurance) == '1')
        made[kind] = body['name_ar']
    r = Client().get('/labs/services')
    rows = r.body if isinstance(r.body, list) else r.items()
    step('the public catalogue sends cash_availability and insurance_availability',
         r.ok and any(x.get('name_ar') == made['self'] and x.get('insurance_availability') is False and x.get('cash_availability') is True for x in rows), r.status)
    r = web.get('/ar/diagnostics', headers=HTML)
    page = str(r.body)
    step('Self-pay (the default) lists the self-pay test', r.ok and made['self'] in page, r.status)
    step('Self-pay does not list the insurance-only test', r.ok and made['ins'] not in page, r.status)
    step('Self-pay is drawn as the chosen payment', r.ok and 'دفع ذاتي' in page, r.status)
    r = web.get('/ar/diagnostics?pay=insurance', headers=HTML)
    page = str(r.body)
    step('Insurance lists the insurance test', r.ok and made['ins'] in page, r.status)
    step('Insurance does not list the self-pay-only test', r.ok and made['self'] not in page, r.status)

if __name__ == '__main__':
    from lib import summary
    main()
    summary()
