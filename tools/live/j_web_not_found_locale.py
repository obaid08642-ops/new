"""Journey (patient-web in a real browser, signed in): a service page that cannot open (it needs an order, a booking or a
visit in its address) shows "page unavailable" in the page's language, not in Arabic (issue 1550 walkthrough).
  Next renders not-found without params, so the boundary fell back to Arabic on every English, Filipino... page.
  Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import json
import os
import re

from lib import journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
HERE = os.path.dirname(os.path.abspath(__file__))
AR = re.compile(r'[؀-ۿ]')
# pages that answer notFound() without the id they need (seen in the 2026-10-16 walkthrough)
PATHS = ['pharmacy/final-quote', 'consultations/booking-status', 'diagnostics/test-detail']
# nursing/insurance-status no longer answers notFound(): with no home care booking it shows its own empty state, as the app does
EMPTY_PATH = 'nursing/insurance-status'


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='web-not-found')
    titles = {loc: json.load(open(os.path.join(HERE, '../../patient-web/messages', f'{loc}.json')))['NotFound']['title'] for loc in ('en', 'fil')}
    empty = {loc: json.load(open(os.path.join(HERE, '../../patient-web/messages', f'{loc}.json')))['NursingWeb']['insuranceNone'] for loc in ('en', 'fil')}
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web not-found locale', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web not-found locale', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='en-US', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/en', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')
        for loc, title in titles.items():
            journey(f'web not-found ({loc}): the state is in the page language')
            for path in PATHS:
                page.goto(f'{WEB}/{loc}/{path}', wait_until='load', timeout=60000)
                # client pages show their loading state first; read the page once the state has settled
                try:
                    page.get_by_text(title, exact=False).first.wait_for(timeout=20000)
                except Exception:
                    pass
                body = page.inner_text('main') if page.locator('main').count() else page.inner_text('body')
                step(f'/{loc}/{path} says "{title}"', title in body, body[:200])
                step(f'/{loc}/{path} shows no Arabic', not AR.search(body), [l for l in body.split('\n') if AR.search(l)][:3])
                step(f'/{loc}/{path} returns to the {loc} home', page.locator(f'main a[href="/{loc}"]').count() > 0, body[:200])
            page.goto(f'{WEB}/{loc}/{EMPTY_PATH}', wait_until='load', timeout=60000)
            # the page shows its loading text first: wait for the empty state to be visible instead of reading the loading text
            try:
                page.get_by_text(empty[loc], exact=False).first.wait_for(state='visible', timeout=20000)
            except Exception:
                pass
            body = page.inner_text('main') if page.locator('main').count() else page.inner_text('body')
            step(f'/{loc}/{EMPTY_PATH} says "{empty[loc]}" (its own empty state)', empty[loc] in body, body[:200])
            step(f'/{loc}/{EMPTY_PATH} shows no Arabic', not AR.search(body), [l for l in body.split('\n') if AR.search(l)][:3])
    except Exception as e:
        step('web not-found flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
