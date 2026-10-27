"""Journey (QA I-01, patient-web in a real browser): add an insurance card (company, then copay).
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

    acct = j_accounts.app_signup(label='web-insurance')
    pat = Client(acct['token'], 'patient')
    user_id = pat.get('/auth/me').get('id')
    policy_number = f'QA-{int(time.time())}'

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('insurance I-01 (web): the patient adds a card with company and copay')
        r = web_login(ctx, WEB, acct['email'], acct['password'], path='/api/auth/login')
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/insurance/add-policy', wait_until='load', timeout=60000)
        search = page.locator('input[type=search]').first
        search.wait_for(timeout=60000)
        search.fill(name[:12])
        page.get_by_role('button', name=name, exact=True).first.click()
        chosen = page.get_by_role('button', name=name, exact=True).first.get_attribute('aria-pressed')
        step('the patient picks the insurer (aria-pressed)', chosen == 'true', name)
        page.locator('form input[minlength="3"]').first.fill(policy_number)
        page.locator('form input[type=number]').nth(0).fill('20')
        page.locator('form input[type=number]').nth(1).fill('500')
        with page.expect_response(lambda resp: '/api/insurance/policy' in resp.url and resp.request.method == 'POST', timeout=60000) as info:
            page.locator('form button[type=submit]').first.click()
        resp = info.value
        step('the website saves the card (2xx)', 200 <= resp.status < 300, resp.status)

        row = mongo_json(f'db.patient_profiles.findOne({{user_id: "{user_id}"}}, {{_id: 0, insurance: 1}})')
        ins = (row or {}).get('insurance') or {}
        step('MongoDB: the card is stored with the copay (20 percent, cap 500 SAR)', ins.get('copay_percent') == 20 and ins.get('copay_cap_sar') == 500 and ins.get('policy_number') == policy_number, ins)

        r = pat.get('/insurance/my-policy')
        body = json.dumps(r.body, ensure_ascii=False) if r.ok else ''
        step('API read-back (GET /insurance/my-policy) carries the policy number', r.ok and policy_number in body, r.status)

        page.reload(wait_until='load')
        step('after reload the page is still reachable (no error page)', page.locator('form, main').count() > 0, page.url)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
