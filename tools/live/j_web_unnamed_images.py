"""Journey (patient-web in a real browser, signed in): no image-role element without a name (issue 1550 walkthrough, axe rule
role-img-alt, "serious"). The account avatar in the header of the signed-in Home page was drawn as role="img" with an empty
aria-label (its link carries the name): a screen reader read "image" with nothing after it. A decorative avatar is hidden from
assistive technology and a named one keeps its name.
Checks every page below in Arabic and English at 390 px (light) and 360 px (dark).
Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os

from lib import journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
PAGES = ['', '/dashboard', '/profile', '/doctors', '/consultations/doctors', '/diagnostics', '/home-care', '/notifications', '/settings']
UNNAMED = """() => [...document.querySelectorAll('[role=img]')]
  .filter((e) => !(e.getAttribute('aria-label') || '').trim() && !e.getAttribute('aria-labelledby') && !e.querySelector('title') && e.getAttribute('aria-hidden') !== 'true')
  .map((e) => e.outerHTML.slice(0, 120))"""


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='web-unnamed-img')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web unnamed images', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web unnamed images', False, f'no chromium: {e}')
    try:
        for loc in ('ar', 'en'):
            for width, scheme in ((390, 'light'), (360, 'dark')):
                journey(f'web unnamed images ({loc}, {width}px, {scheme}, signed in)')
                ctx = browser.new_context(locale='ar-SA' if loc == 'ar' else 'en-US', viewport={'width': width, 'height': 844}, color_scheme=scheme)
                page = ctx.new_page()
                page.goto(f'{WEB}/{loc}', wait_until='load', timeout=60000)
                lr = web_login(ctx, WEB, acct['email'], acct['password'])
                step('patient signs in on the website', lr.ok, f'{lr.status}')
                for path in PAGES:
                    page.goto(f'{WEB}/{loc}{path}', wait_until='load', timeout=60000)
                    page.wait_for_timeout(1000)
                    bad = page.evaluate(UNNAMED)
                    step(f'/{loc}{path} has no role="img" without a name', not bad, bad[:2])
                ctx.close()
    except Exception as e:
        step('web unnamed images flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
