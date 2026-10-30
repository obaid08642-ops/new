"""Journey (QA A-10, patient-web in a real browser): add an address on the addresses page and remove it.
  - the patient signs in on the website and opens /ar/profile/addresses;
  - the "use my location" button sets the map point (browser geolocation, granted and set by Playwright);
  - the new-address form (#new-address, components-next/account/address-book.tsx) posts to /api/patient/users/me/addresses (2xx);
  - GET /users/me/addresses lists the new address with the point; MongoDB has the row for the account;
  - the address is removed from the page (DELETE 2xx); the list no longer has it.
Stack: backend :8002, patient-web (NABD_WEB_JOURNEYS_URL, default :3100). A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
TAG = 'QA-ADDR'


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def main():
    import j_accounts
    from playwright.sync_api import sync_playwright
    from lib import summary

    acct = j_accounts.app_signup(label='web-addr')
    api = Client(acct['token'], 'patient')
    user_id = api.get('/auth/me').get('id')

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844},
                              geolocation={'latitude': 24.7136, 'longitude': 46.6753}, permissions=['geolocation'])
    page = ctx.new_page()
    try:
        journey('account A-10 (web): add an address with the location, then remove it')
        r = web_login(ctx, WEB, acct['email'], acct['password'], path='/api/auth/login')
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/profile/addresses', wait_until='load', timeout=60000)
        form = page.locator('#new-address')
        form.wait_for(timeout=30000)
        form.locator('input').nth(0).fill(TAG)
        form.locator('input').nth(1).fill('شارع الاختبار 1')
        with page.expect_response(lambda x: x.url.endswith('/api/patient/users/me/addresses') and x.request.method == 'POST', timeout=60000) as info:
            form.locator('button[type=submit]').first.click()
        step('the address is saved (POST 2xx)', info.value.ok, info.value.status)
        listed = api.get('/users/me/addresses')
        rows = listed.body if isinstance(listed.body, list) else (listed.body or {}).get('addresses') or (listed.body or {}).get('data') or []
        mine = next((x for x in rows if x.get('label') == TAG), None)
        step('GET /users/me/addresses lists the new address', bool(mine), f'{len(rows)} addresses')
        profile = mongo_json(f'db.patient_profiles.findOne({{user_id: "{user_id}"}}, {{_id: 0, user_id: 1, addresses: 1}})') or {}
        row = next((x for x in profile.get('addresses', []) if x.get('line1') == 'شارع الاختبار 1'), None)
        step('MongoDB: the address is in this account\'s profile', bool(row), row)
        if mine:
            item = page.locator('li').filter(has_text=TAG).first
            item.get_by_role('button', name='حذف', exact=True).first.click()
            page.wait_for_timeout(500)
            with page.expect_response(lambda x: '/api/patient/users/me/addresses/' in x.url and x.request.method == 'DELETE', timeout=60000) as info:
                page.locator('[role=dialog] button, [role=alertdialog] button, dialog button').filter(has_text='حذف').last.click()
            step('the address is removed (DELETE 2xx)', info.value.ok, info.value.status)
            again = api.get('/users/me/addresses')
            rows2 = again.body if isinstance(again.body, list) else (again.body or {}).get('addresses') or (again.body or {}).get('data') or []
            step('the address is gone from the list', not any(x.get('label') == TAG for x in rows2), f'{len(rows2)} left')
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
