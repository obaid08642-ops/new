"""Journey (QA A-02, patient-web in a real browser): sign up with an e-mail address and the e-mail code.
  - the visitor fills the register form (components-next/register-form.tsx): name, e-mail, password, confirm, terms;
  - the website sends the code and moves to the code page (/ar/otp);
  - the code from the mail (lib.mail_code) is typed into the six cells and the website leaves the code page;
  - MongoDB: the users row exists for that e-mail, and the new account signs in through the API with the password.
  - Precondition (set here, not by another shard): the admin publishes patient_terms and privacy_policy with acceptance
    required. The website's sign-up refuses with 503 when those texts exist but are not required (patient-web
    app/api/auth/register/route.ts), and seed_legal.py publishes them as not required, so this journey cannot rely on
    j_web_signup having run first (it runs in another gate shard).
Stack: backend :8002, patient-web (NABD_WEB_JOURNEYS_URL, default :3100), mail sink. A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess
import time
import uuid

from lib import Client, journey, step, mail_code

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def main():
    import j_admin
    from playwright.sync_api import sync_playwright
    from lib import summary

    admin, _ = j_admin.login()
    journey('account A-02 (web): the patient texts are required at sign-up (local test database)')
    for key, ar, en in (('patient_terms', 'شروط استخدام المريض', 'Patient terms'), ('privacy_policy', 'سياسة الخصوصية', 'Privacy policy')):
        r = admin.put(f'/admin/admin/legal/policy/{key}', {'title_ar': ar, 'title_en': en, 'content_ar': f'{ar} — نص اختبار التسجيل {uuid.uuid4().hex[:6]}',
                                                           'content_en': f'{en} — sign-up journey text', 'requires_acceptance': True, 'change_note': 'web sign-up journey'})
        step(f'admin publishes {key} with acceptance required', r.ok, r.status)

    tag = uuid.uuid4().hex[:8]
    email = f'web-signup-{tag}@nabd.test'
    password = 'QaSignup-2026!'
    name = f'اختبار {tag}'
    t0 = time.time()

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('account A-02 (web): sign up with e-mail and the e-mail code')
        page.goto(f'{WEB}/ar/register', wait_until='load', timeout=60000)
        page.locator('form input').nth(0).fill(name)
        page.locator('form input[dir=ltr]').first.fill(email)
        page.locator('#register-password').fill(password)
        page.locator('form input[type=password]').nth(1).fill(password)
        page.locator('form input[type=checkbox]').first.check()
        with page.expect_response(lambda r: '/api/auth/register' in r.url and r.request.method == 'POST', timeout=60000) as info:
            page.locator('form button[type=submit]').first.click()
        step('the register request is accepted (2xx)', info.value.ok, info.value.status)
        page.wait_for_url('**/otp**', timeout=60000)
        step('the website moves to the code page', '/otp' in page.url, page.url)

        code = mail_code(email, t0, timeout=60)
        step('the e-mail code arrives', bool(code), 'code' if code else 'no code')
        cells = page.locator('input[inputmode=numeric]')
        for i, digit in enumerate(code or ''):
            cells.nth(i).fill(digit)
        with page.expect_response(lambda r: '/api/auth/otp/verify' in r.url and r.request.method == 'POST', timeout=60000) as verify:
            page.locator('form button[type=submit]').first.click()
        step('the code is verified by the website (2xx)', verify.value.ok, verify.value.status)
        page.wait_for_url(lambda u: '/otp' not in u, timeout=60000)
        step('the website leaves the code page after the right code', '/otp' not in page.url, page.url)

        row = mongo_json(f'db.users.findOne({{email: "{email}"}}, {{_id: 0, id: 1, email: 1, role: 1}})')
        step('MongoDB: the users row exists for the new e-mail', bool(row) and row.get('email') == email, row)
        r = Client(None, 'anon').post('/auth/login', {'identifier': email, 'password': password})
        step('the new account signs in with the password (API)', r.ok, r.status)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
