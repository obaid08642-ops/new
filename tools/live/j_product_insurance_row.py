"""Journey (issue 456, needs-review batch-1a-app 8): the app product page's insurance row is wired to real data.

patient-app/app/pharmacy/product-detail.tsx draws "covered by your {company} insurance" only for a signed-in patient
whose insurer is in the product's covered_by_insurance[] (company ids, SPEC_PRODUCT_DOCTOR_DETAIL §A). It reads:
  GET /medicines/:id/details      covered_by_insurance[]
  GET /users/me/insurance         company_id / company_code (add-policy, POST /insurance/save-policy) or provider
  GET /insurance/companies        id, code, name_ar, name_en (the id -> name lookup)
and decides with src/utils/productInsurance.ts coveringInsurerName (mirrored by `covering_name` below).

No API writes covered_by_insurance yet (the admin catalogue DTO has no such field; reported in the PR), so the journey
sets it on its own medicine in the local TEST database only, like j_web_offers_waiting does for a round end.
Stack: backend :8002 (DB_NAME from the queue), smtp_sink for the signup OTP.
"""
import os
import subprocess
import uuid

from lib import Client, journey, step


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def set_coverage(medicine_id, company_ids):
    """TEST database only: the product lists the companies that cover it."""
    db = os.environ.get('DB_NAME') or 'nabd_live'
    ids = ','.join(f'"{c}"' for c in company_ids)
    js = f'db.getSiblingDB("{db}").medicines.updateOne({{id: "{medicine_id}"}}, {{$set: {{covered_by_insurance: [{ids}]}}}}).modifiedCount'
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', '--eval', js], capture_output=True, text=True, timeout=60)
    return out.stdout.strip()


def covering_name(covered, policy, companies, lang):
    """The screen's rule (productInsurance.ts coveringInsurerName)."""
    ids = {str(c).strip() for c in (covered or []) if str(c).strip()}
    p = policy or {}
    own = [str(p.get(k) or '').strip() for k in ('company_id', 'company_code', 'provider')]
    own = [k for k in own if k]
    if not ids or not own:
        return None
    company = next((c for c in companies if str(c.get('id') or '') in own or str(c.get('code') or '') in own), None) or {}
    keys = own + [k for k in (str(company.get('id') or ''), str(company.get('code') or '')) if k]
    if not any(k in ids for k in keys):
        return None
    ar, en = company.get('name_ar') or '', company.get('name_en') or ''
    return ((ar or en) if lang == 'ar' else (en or ar)) or p.get('company_name') or p.get('provider_name') or None


def main():
    import j_admin, j_accounts, j_insurance, j_pharmacy
    admin, _ = j_admin.login()
    code = j_insurance.admin_adds_company(admin)
    other = j_insurance.admin_adds_company(admin)
    comps = rows(admin.get('/insurance/companies/all'))
    company = next((c for c in comps if c.get('code') == code), {})
    other_company = next((c for c in comps if c.get('code') == other), {})
    step('both companies have an id', company.get('id') and other_company.get('id'), comps[:2])
    meds = j_pharmacy.admin_adds_medicines(admin)
    covered_med, plain_med = meds[0]['id'], meds[1]['id']
    for mid in (covered_med, plain_med):  # admin medicines-catalog.tsx approve: the item joins the public catalogue
        r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
        step('admin approves the product for the public catalogue', r.ok, r)

    journey('product insurance row: the product lists the companies that cover it (test database)')
    step('the covered product lists the company id', set_coverage(covered_med, [company.get('id')]) == '1')
    step('the other product lists only another company', set_coverage(plain_med, [other_company.get('id')]) == '1')

    journey('product insurance row: the patient saves the policy on the add-policy screen')
    acct = j_accounts.app_signup(label='product-insurer')
    pat = Client(acct['token'], 'patient')
    # app/insurance/add-policy.tsx sends company_id: the company's code
    r = pat.post('/insurance/save-policy', {'provider': company.get('name_ar'), 'company_id': code, 'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}',
                                            'expiry_date': '2027-12-31', 'member_name': 'مريض تأمين', 'verified': False, 'ocr_extracted': False})
    step('POST /insurance/save-policy saves the policy', r.ok, r)
    policy = pat.get('/users/me/insurance')
    step('GET /users/me/insurance answers the company of the policy', policy.ok and policy.get('company_id') == company.get('id'), policy)
    listed = pat.get('/insurance/companies')
    step('GET /insurance/companies lists the company with id, code and names', listed.ok and any(c.get('id') == company.get('id') and c.get('code') == code and c.get('name_ar') for c in rows(listed)), listed)

    journey('product insurance row: what the product page reads and draws')
    for lang in ('ar', 'en'):
        d = pat.get(f'/medicines/{covered_med}/details?lang={lang}')
        step(f'details ({lang}) carries covered_by_insurance', d.ok and company.get('id') in (d.get('covered_by_insurance') or []), d.get('covered_by_insurance') if d.ok else d)
        want = company.get('name_ar') if lang == 'ar' else company.get('name_en')
        got = covering_name(d.get('covered_by_insurance'), policy.body, rows(listed), lang)
        step(f'the row names the insurer ({lang}: {want})', got == want, got)
    d = pat.get(f'/medicines/{plain_med}/details?lang=ar')
    step('a product the insurer does not cover draws no row', d.ok and covering_name(d.get('covered_by_insurance'), policy.body, rows(listed), 'ar') is None, d.get('covered_by_insurance') if d.ok else d)
    anon = Client(None, 'anon')
    r = anon.get('/users/me/insurance')
    step('without a session there is no policy to read (the screen does not ask)', r.status in (401, 403), r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
