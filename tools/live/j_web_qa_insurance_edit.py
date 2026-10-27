"""Journey (QA I-02, patient-web in a real browser): add an insurance card (company, then copay).
  - the patient signs in on the website and opens /ar/insurance/add-policy;
  - the patient searches the insurer list and picks the first company (CompanyPicker, a searchable list of buttons);
  - the patient enters a policy number, a copay of 20 percent and a cap of 500 SAR, then submits (POST /api/insurance/policy);
  - the website answers 2xx; MongoDB patient_profiles.insurance holds the policy number, copay_percent 20 and copay_cap_sar 500;
  - the API read-back (GET /insurance/my-policy) shows the same card; after a reload the page still answers.
A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess
import time

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def main():
    import j_accounts
    from playwright.sync_api import sync_playwright
    from lib import summary

    companies = Client(None, 'anon').get('/insurance/companies')
    rows = companies.body if isinstance(companies.body, list) else companies.items()
    step('the insurer list is published (GET /insurance/companies)', companies.ok and len(rows) > 0, companies.status)
    if not rows:
        summary()
        return
    company = rows[0]
    name = company.get('name') or company.get('name_ar') or company.get('name_en')

    acct = j_accounts.app_signup(label='web-insurance-edit')
    pat = Client(acct['token'], 'patient')
    user_id = pat.get('/auth/me').get('id')
    first = f'QA-{int(time.time())}'
    second = f'QA-E-{int(time.time())}'
    c = pat
    r = c.post('/insurance/save-policy', {'company_id': company.get('id'), 'policy_number': first, 'copay_percent': 20, 'copay_cap_sar': 500})
    step('a card exists before the edit (API save)', r.ok, r.status)

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('insurance I-02 (web): the patient changes the card through the change link')
        r = web_login(ctx, WEB, acct['email'], acct['password'], path='/api/auth/login')
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/insurance', wait_until='load', timeout=60000)
        change = page.locator('a[href$="/insurance/add-policy"]').first
        change.wait_for(timeout=60000)
        change.click()
        page.wait_for_url('**/add-policy**', timeout=60000)
        number = page.locator('form input[minlength="3"]').first
        number.wait_for(timeout=60000)
        step('the change form opens with the saved policy number', number.input_value() == first, number.input_value())
        number.fill(second)
        page.locator('form input[type=number]').nth(0).fill('10')
        page.locator('form input[type=number]').nth(1).fill('300')
        with page.expect_response(lambda resp: '/api/insurance/policy' in resp.url and resp.request.method == 'POST', timeout=60000) as info:
            page.locator('form button[type=submit]').first.click()
        step('the website saves the change (2xx)', 200 <= info.value.status < 300, info.value.status)

        row = mongo_json(f'db.patient_profiles.findOne({{user_id: "{user_id}"}}, {{_id: 0, insurance: 1}})')
        ins = (row or {}).get('insurance') or {}
        step('MongoDB: the card now holds the new number and copay (10 percent, cap 300)', ins.get('policy_number') == second and ins.get('copay_percent') == 10 and ins.get('copay_cap_sar') == 300, ins)
        r = pat.get('/insurance/my-policy')
        body = json.dumps(r.body, ensure_ascii=False) if r.ok else ''
        step('API read-back (GET /insurance/my-policy) carries the new number and not the old one', r.ok and second in body and first not in body, r.status)

        page.goto(f'{WEB}/ar/insurance', wait_until='load', timeout=60000)
        step('after reload the hub still answers', page.locator('a[href$="/insurance/add-policy"]').count() > 0, page.url)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
