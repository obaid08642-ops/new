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
import re
import time
import urllib.parse

from lib import Client, journey, step, mail_to, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def _redis(*args):
    """One Redis command over a plain socket (RESP): the CI runner has Redis as a service only, no redis-cli."""
    import socket
    sock = socket.create_connection((os.environ.get('REDIS_HOST', '127.0.0.1'), int(os.environ.get('REDIS_PORT', '6379'))), timeout=10)
    try:
        sock.sendall(b''.join([b'*%d\r\n' % len(args)] + [b'$%d\r\n%s\r\n' % (len(a.encode()), a.encode()) for a in map(str, args)]))
        f = sock.makefile('rb')

        def read():
            line = f.readline().rstrip(b'\r\n')
            kind, rest = line[:1], line[1:]
            if kind in (b'+', b':'):
                return rest.decode()
            if kind == b'-':
                raise RuntimeError(rest.decode())
            if kind == b'$':
                n = int(rest)
                return None if n < 0 else f.read(n + 2)[:-2].decode()
            if kind == b'*':
                return [read() for _ in range(int(rest))]
            raise RuntimeError(f'unexpected reply {line!r}')
        return read()
    finally:
        sock.close()


def redis_keys(pattern):
    keys, cursor = [], '0'
    while True:
        cursor, batch = _redis('SCAN', cursor, 'MATCH', pattern, 'COUNT', '1000')
        keys += batch
        if cursor == '0':
            return keys


def redis_get(key):
    return _redis('GET', key) or ''


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

        journey('account A-06 (web): the new password is set on the reset page and signs in')
        blob = json.dumps(mails, ensure_ascii=False)
        m = re.search(r'/password-reset\?token=([A-Za-z0-9_.%\-]+)', blob)
        token = urllib.parse.unquote(m.group(1)) if m else ''
        step('the reset e-mail token is present in the link', bool(token), len(token))
        new_pw = 'Renewed!Web' + str(int(time.time()))[-6:]
        page.goto(f'{WEB}/ar/password-reset?token={urllib.parse.quote(token)}', wait_until='load', timeout=60000)
        pwd_inputs = page.locator('form input[type=password]')
        step('the reset page shows the new-password fields', pwd_inputs.count() >= 2, pwd_inputs.count())
        pwd_inputs.nth(0).fill(new_pw)
        pwd_inputs.nth(1).fill(new_pw)
        page.locator('form button[type=submit]').first.click()
        success = page.locator('[role=status]').first
        try:
            success.wait_for(timeout=30000)
            ok_text = success.inner_text().strip()
        except Exception as e:
            ok_text = f'no status: {e}'
        step('the reset page confirms the new password (role=status)', bool(ok_text) and not ok_text.startswith('no status'), ok_text[:120])
        r = web_login(ctx, WEB, email, new_pw, path='/api/auth/login')
        step('the new password signs in on the website', r.status == 200, r.status)
        r = web_login(ctx, WEB, email, acct['password'], path='/api/auth/login')
        step('the old password is refused after the reset', r.status in (400, 401), r.status)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
