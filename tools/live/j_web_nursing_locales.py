"""Journey (patient-web in a real browser, signed out and signed in): home nursing speaks the page's language (issue 1550 walkthrough).
The catalogue sends every service with its name in Arabic and English only (owner rule, issue #1905: names are ar/en, the UI shows
the Arabic name on the Arabic page and the English name on every other page) and its description in six languages (description_bn ...).
  - /<locale>/nursing/catalog, /<locale>/home-care and the service page show the English name and the description in Urdu, Hindi,
    Bengali and Filipino, not the Arabic name, at 390 px, at 360 px (no sideways scroll) and in dark mode;
  - the search on the catalogue finds a service by its English name.
Stack: backend :8002 (seeded nursing catalogue), patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
SUFFIX = {'ur': 'ur', 'hi': 'hi', 'bn': 'bn', 'fil': 'tl'}
LOCALE = {'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}


def main():
    import j_accounts
    r = Client(None, 'anon').get('/nursing/catalog')
    rows = r.body if isinstance(r.body, list) else r.items()
    row = next((x for x in rows if all(x.get(f'description_{s}') for s in SUFFIX.values()) and x.get('name_en') and x.get('name_ar')), None)
    step('the nursing catalogue has a service with ar/en names and descriptions in all six languages', r.ok and row, f'{r.status} {len(rows)}')
    if not row:
        return
    acct = j_accounts.app_signup(label='web-nursing-locales')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web nursing locales', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web nursing locales', False, f'no chromium: {e}')
    try:
        for state in ('guest', 'user'):
            for loc, sfx in SUFFIX.items():
                for width, scheme in ((390, 'light'), (360, 'dark')):
                    journey(f'web nursing locales ({state}, {loc}, {width}px, {scheme})')
                    ctx = browser.new_context(locale=LOCALE[loc], viewport={'width': width, 'height': 844}, color_scheme=scheme)
                    page = ctx.new_page()
                    if state == 'user':
                        page.goto(f'{WEB}/{loc}', wait_until='load', timeout=60000)
                        lr = web_login(ctx, WEB, acct['email'], acct['password'])
                        step('patient signs in on the website', lr.ok, f'{lr.status}')
                    name, desc, ar = row['name_en'], row[f'description_{sfx}'], row['name_ar']
                    for path in ('/nursing/catalog', '/home-care'):
                        page.goto(f'{WEB}/{loc}{path}', wait_until='load', timeout=60000)
                        page.wait_for_timeout(1200)
                        body = page.inner_text('main')
                        # the signed-in hub is a menu of the patient's own pages; the services list is the guest hub's
                        if path == '/nursing/catalog' or state == 'guest':
                            step(f'/{loc}{path} shows the English service name ("{name}")', name in body, body[:160].replace('\n', ' '))
                            step(f'/{loc}{path} does not show the Arabic name ("{ar}")', ar not in body, '')
                        step(f'/{loc}{path} has no sideways scroll at {width}px', page.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 2, '')
                    page.goto(f'{WEB}/{loc}/nursing/catalog', wait_until='load', timeout=60000)
                    body = page.inner_text('main')
                    step(f'/{loc}/nursing/catalog shows the description in its language', desc[:30] in body, desc[:60])
                    # the service page
                    page.goto(f'{WEB}/{loc}/home-care/services/{row["id"]}', wait_until='load', timeout=60000)
                    page.wait_for_timeout(800)
                    h1 = page.inner_text('h1') if page.locator('h1').count() else ''
                    step(f'the service page title is the English name on {loc}', name in h1 or name in page.inner_text('main'), h1[:100])
                    ctx.close()
        journey('web nursing locales: search by the English name')
        ctx = browser.new_context(locale='hi-IN', viewport={'width': 390, 'height': 844})
        page = ctx.new_page()
        q = row['name_en'].split()[0]
        page.goto(f'{WEB}/hi/nursing/catalog?q={q}', wait_until='load', timeout=60000)
        page.wait_for_timeout(1000)
        step('the Hindi page search finds the service by its English name', row['name_en'] in page.inner_text('main'), q)
        ctx.close()
    except Exception as e:
        step('web nursing locales flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
