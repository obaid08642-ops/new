"""Journey: the family invite code and scanning it (issues 694, 693).
  - The group owner gets the group's invite code (POST /family/invite with no channel: the code the apps show and put in
    the QR); without a group the same call is refused.
  - On the website (a real browser), the scan tab's camera button reads the QR and opens the join form with the code;
    joining puts the person in the family. Headless Chromium has no barcode reader, so the browser's BarcodeDetector is
    stood in by a stub that "reads" the owner's code (the fake camera stream is Chromium's own); the backend calls are real.
  - Someone with no family who opens the calendar or the chat gets the server's 404 / 403 (the apps show "no family yet").
  Stack: backend :8002, patient-web :3100.
"""
import os

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts
    owner = Client(j_accounts.app_signup(label='fam-owner')['token'], 'patient')
    joiner_acct = j_accounts.app_signup(label='fam-joiner')
    joiner = Client(joiner_acct['token'], 'patient')

    journey('issue 694: the owner gets the family invite code')
    r = owner.post('/family/invite', {})
    step('without a family the invite is refused', r.status in (400, 404), r)
    r = owner.post('/family/create', {'name': 'عائلة الاختبار'})
    step('the owner creates the family', r.ok, r)
    r = owner.post('/family/invite', {})
    code = r.get('invite_code')
    step('the owner gets the group\'s invite code (for the QR)', r.ok and isinstance(code, str) and len(code) >= 6, r)
    r = owner.post('/family/invite', {'channel': 'fax', 'target': 'x'})
    step('an unknown channel is refused by validation', r.status == 400, r)

    journey('issue 693: no family group is an answer the apps can tell apart')
    r = joiner.get('/family/calendar')
    step('the calendar of someone with no family answers 404 "Not part of a family group"', r.status == 404 and 'not part of a family group' in str(r.body).lower(), r)
    r = joiner.get('/family/chat/messages')
    step('the chat answers not_active_family_member', r.status == 403 and 'not_active_family_member' in str(r.body), r)
    if not code:
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web scan', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None,
                                 args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}, permissions=['camera'])
    ctx.add_init_script('window.BarcodeDetector = class { constructor(o) { this.formats = (o && o.formats) || []; }'
                        ' async detect() { return this.formats.includes("qr_code") ? [{ rawValue: %r }] : []; } };'
                        % f'{WEB}/ar/family/add?tab=join&code={code}')
    page = ctx.new_page()
    try:
        journey('issue 694 on the web: the camera reads the invite QR and the person joins')
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': joiner_acct['email'], 'password': joiner_acct['password']})
        step('the joiner signs in on the website', r.ok, f'{r.status}')
        page.goto(f'{WEB}/ar/family/add?tab=scan', wait_until='load', timeout=60000)
        page.get_by_role('button', name='امسح بالكاميرا').click(timeout=30000)
        page.wait_for_url(f'**tab=join&code={code}**', timeout=30000)
        step('the scan opens the join form with the code', f'code={code}' in page.url, page.url)
        field = page.locator('form input').first
        step('the code is filled in', field.input_value() == code, field.input_value())
        page.locator('form button[type="submit"]').click()
        page.wait_for_url('**/family**', timeout=30000)
        r = joiner.get('/family/my-group')
        step('the joiner is now in the family', r.ok, r)
    except Exception as e:
        step('web scan flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
