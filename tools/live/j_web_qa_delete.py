"""Journey (QA A-15, patient-web in a real browser): delete account from the website.
  - the signed-in patient opens /ar/settings/privacy and uses the danger zone (components-next/settings/data-rights.tsx);
  - a wrong password is refused and the account stays (the website shows the error, the API still signs in);
  - the right password sends DELETE /api/privacy/data-export (2xx) and the website goes to the login page;
  - the account can no longer sign in (API refuses), and the user row is flagged deleted in MongoDB.
Stack: backend :8002, patient-web (NABD_WEB_JOURNEYS_URL, default :3100). A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess

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

    acct = j_accounts.app_signup(label='web-delete')
    user_id = Client(acct['token'], 'patient').get('/auth/me').get('id')

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('account A-15 (web): delete account from the website')
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/settings/privacy?tab=delete', wait_until='load', timeout=60000)
        page.get_by_role('button', name='حذف حسابي', exact=True).first.wait_for(timeout=30000)
        page.get_by_role('button', name='حذف حسابي', exact=True).first.click()
        page.get_by_role('button', name='متابعة', exact=True).first.click()
        pw_input = page.locator('form[aria-label] input[type=password]').first
        pw_input.fill('wrong-password-123')
        with page.expect_response(lambda resp: resp.url.endswith('/api/privacy/data-export') and resp.request.method == 'DELETE', timeout=30000) as info:
            page.locator('form[aria-label] button[type=submit]').first.click()
        step('a wrong password is refused by the server (not 2xx)', not info.value.ok, info.value.status)
        step('the website says the password is wrong (role=alert)', page.locator('[role=alert]').count() > 0, 'alert')
        check = Client(None, 'anon').post('/auth/login', {'identifier': acct['email'], 'password': acct['password']})
        step('the account still signs in after the refused delete', check.ok, check.status)

        pw_input = page.locator('form[aria-label] input[type=password]').first
        pw_input.fill(acct['password'])
        with page.expect_response(lambda resp: resp.url.endswith('/api/privacy/data-export') and resp.request.method == 'DELETE', timeout=60000) as info:
            page.locator('form[aria-label] button[type=submit]').first.click()
        step('the right password deletes the account (DELETE 2xx)', info.value.ok, info.value.status)
        page.wait_for_url('**/login**', timeout=30000)
        step('the website goes to the login page', '/login' in page.url, page.url)

        row = mongo_json(f'db.users.findOne({{id: "{user_id}"}}, {{_id: 0, id: 1, is_deleted: 1, deleted_at: 1, active: 1}})')
        flagged = bool(row) and (row.get('is_deleted') is True or row.get('active') is False or row.get('deleted_at'))
        step('MongoDB: the user row is flagged deleted', flagged, row)
        r = Client(None, 'anon').post('/auth/login', {'identifier': acct['email'], 'password': acct['password']})
        step('the deleted account can no longer sign in', not r.ok, r.status)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
