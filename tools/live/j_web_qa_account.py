"""Journey (QA A-06, patient-web in a real browser): forgot password from the website.
  - the patient opens /ar/forgot-password, types the account e-mail and submits (components-next/forgot-password-form.tsx);
  - the website shows the server's confirmation in its status line (role=status), and the next-step link appears;
  - the API stores a reset token for that account (Redis, auth:password:reset:*) and the reset e-mail carries a link with it (mail sink);
  - the browser reloads the page: the form is still there and the account still signs in with the old password (nothing changed yet).
Reset itself (new password, old refused) is proven by tools/live/j_qa_password.py over the API.
Stack: backend :8002, patient-web (NABD_WEB_JOURNEYS_URL, default :3100), mail sink (lib.mail_to).
Not covered here: entering a new password on the reset page (the API reset is in j_qa_password.py).
A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess
import time

from lib import Client, journey, step, mail_to, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def redis_keys(pattern):
    out = subprocess.run(['redis-cli', '--scan', '--pattern', pattern], capture_output=True, text=True).stdout
    return [k for k in out.splitlines() if k]


def redis_get(key):
    return subprocess.run(['redis-cli', 'GET', key], capture_output=True, text=True).stdout.strip()


def main():
    import j_accounts
    from playwright.sync_api import sync_playwright
    from lib import summary

    t0 = time.time()
    acct = j_accounts.app_signup(label='web-forgot')
    user_id = Client(acct['token'], 'patient').get('/auth/me').get('id')
    email = acct['email']

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('account A-06 (web): forgot password from the website')
        page.goto(f'{WEB}/ar/forgot-password', wait_until='load', timeout=60000)
        page.locator('form input').first.fill(email)
        page.locator('form button[type=submit]').first.click()
        status = page.locator('[role=status]').first
        try:
            status.wait_for(timeout=30000)
            text = status.inner_text().strip()
        except Exception as e:
            text = f'no status: {e}'
        step('the website answers with a confirmation (role=status)', bool(text) and not text.startswith('no status'), text[:120])
        step('the next-step link to the reset page appears', page.locator('a[href*="/password-reset"]').count() > 0, 'link')

        token_keys = [k for k in redis_keys('auth:password:reset:*') if redis_get(k) and user_id in redis_get(k)]
        step('the reset token is stored for this account (Redis, auth:password:reset:*)', bool(token_keys), len(token_keys))

        mails = mail_to(email, t0, timeout=30)
        link_ok = any('/password-reset?token=' in json.dumps(m, ensure_ascii=False) for m in mails)
        step('the reset e-mail carries a link to the reset page', link_ok, f'{len(mails)} mail(s)')

        page.reload(wait_until='load')
        step('after reload the form is still there', page.locator('form input').count() > 0, 'form')
        r = web_login(ctx, WEB, email, acct['password'], path='/api/auth/login')
        step('the old password still signs in (nothing changed yet)', r.status == 200, r.status)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
