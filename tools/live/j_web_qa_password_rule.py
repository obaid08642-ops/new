"""Journey (QA A-07, patient-web in a real browser): the 8-character password rule on the register form.
  - the visitor fills the register form with a 7-character password (lib/auth/password-rule.ts, MIN_PASSWORD_LENGTH = 8);
  - the form refuses it on the website: no request to /api/auth/register is sent and a message is shown;
  - MongoDB: no users row exists for that e-mail (no account was created);
  - a valid 8-character password is accepted by the register request (2xx), then the e-mail code page is shown.
  The account made by the valid step is not used further. Stack: backend :8002, patient-web (NABD_WEB_JOURNEYS_URL, default :3100).
A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess
import uuid

from lib import journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def fill(page, email, password):
    page.goto(f'{WEB}/ar/register', wait_until='load', timeout=60000)
    page.locator('form input').nth(0).fill('اختبار كلمة المرور')
    page.locator('form input[dir=ltr]').first.fill(email)
    page.locator('#register-password').fill(password)
    page.locator('form input[type=password]').nth(1).fill(password)
    page.locator('form input[type=checkbox]').first.check()


def main():
    from playwright.sync_api import sync_playwright
    from lib import summary

    tag = uuid.uuid4().hex[:8]
    short_email = f'web-pw-short-{tag}@nabd.test'
    good_email = f'web-pw-good-{tag}@nabd.test'
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    sent = []
    page.on('request', lambda req: sent.append(req.url) if '/api/auth/register' in req.url and req.method == 'POST' else None)
    try:
        journey('account A-07 (web): the 8-character password rule on the register form')
        fill(page, short_email, 'Short7x')
        page.locator('form button[type=submit]').first.click()
        page.wait_for_timeout(2000)
        step('a 7-character password is refused on the website', len(sent) == 0, f'register requests sent: {len(sent)}')
        step('the website shows a message about the password', page.locator('[role=alert], [role=status]').count() > 0, 'message')
        row = mongo_json(f'db.users.findOne({{email: "{short_email}"}}, {{_id: 0, id: 1}})')
        step('MongoDB: no account was created for the refused password', row is None, row)

        sent.clear()
        fill(page, good_email, 'Longer8x')
        with page.expect_response(lambda r: '/api/auth/register' in r.url and r.request.method == 'POST', timeout=60000) as info:
            page.locator('form button[type=submit]').first.click()
        step('an 8-character password is accepted by the register request (2xx)', info.value.ok, info.value.status)
        page.wait_for_url('**/otp**', timeout=60000)
        step('the website moves to the code page', '/otp' in page.url, page.url)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
