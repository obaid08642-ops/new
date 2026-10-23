"""Journey (patient-web in a real browser, signed out and signed in): labs, packages and radiology speak the page's language
(issue 1550 walkthrough). The catalogue sends every test, package and scan with its name, description and preparation in six
languages (name_hi, description_bn, preparation_tl ...); the pages read only Arabic and English, so Urdu read the Arabic text and
Hindi, Bengali and Filipino the English text.
  - /<locale>/diagnostics/search, /diagnostics/labs?q=, /diagnostics/packages, /diagnostics/radiology and the item pages show the
    row in Urdu, Hindi, Bengali and Filipino, at 390 px light and 360 px dark, with no sideways scroll;
  - the item page lists the preparation steps in the page's language;
  - both searches find a test by its translated name (the lab list search is the backend's).
Stack: backend :8002 (seeded + services content), patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os
import urllib.parse

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
SUFFIX = {'ur': 'ur', 'hi': 'hi', 'bn': 'bn', 'fil': 'tl'}
LOCALE = {'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}


def full(x, fields=('name', 'description')):
    return all(x.get(f'{f}_{s}') for f in fields for s in SUFFIX.values()) and x.get('name_en')


def main():
    import j_accounts
    anon = Client(None, 'anon')
    labs = anon.get('/labs/services')
    rows = labs.body if isinstance(labs.body, list) else labs.items()
    test = next((x for x in rows if not x.get('is_package') and full(x) and all(x.get(f'preparation_{s}') for s in SUFFIX.values())), None)
    pkg = next((x for x in rows if x.get('is_package') and full(x)), None)
    rad = anon.get('/radiology/services')
    rrows = rad.body if isinstance(rad.body, list) else rad.items()
    scan = rrows[0] if rrows and full(rrows[0]) else next((x for x in rrows if full(x)), None)
    step('the catalogue has a test, a package and a scan with names in all six languages', labs.ok and rad.ok and test and pkg and scan, f'{labs.status} {rad.status}')
    if not (test and pkg and scan):
        return
    acct = j_accounts.app_signup(label='web-diag-locales')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web diagnostics locales', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web diagnostics locales', False, f'no chromium: {e}')
    try:
        for state in ('guest', 'user'):
            for loc, sfx in SUFFIX.items():
                for width, scheme in ((390, 'light'), (360, 'dark')):
                    journey(f'web diagnostics locales ({state}, {loc}, {width}px, {scheme})')
                    ctx = browser.new_context(locale=LOCALE[loc], viewport={'width': width, 'height': 844}, color_scheme=scheme)
                    page = ctx.new_page()
                    if state == 'user':
                        page.goto(f'{WEB}/{loc}', wait_until='load', timeout=60000)
                        lr = web_login(ctx, WEB, acct['email'], acct['password'])
                        step('patient signs in on the website', lr.ok, f'{lr.status}')

                    def look(path, what, name, other=None):
                        page.goto(f'{WEB}{path}', wait_until='load', timeout=60000)
                        page.wait_for_timeout(1200)
                        body = page.inner_text('main')
                        step(f'{path} shows {what} in {loc} ("{name}")', name in body, body[:140].replace('\n', ' '))
                        if other and other not in name:  # a translated name may keep the English word (Filipino 'Complete Blood Count (CBC)')
                            step(f'{path} does not show the English {what} ("{other}")', other not in body, '')
                        step(f'{path} has no sideways scroll at {width}px', page.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 2, '')
                        return body

                    q = urllib.parse.quote(test['name_en'].split()[0])
                    look(f'/{loc}/diagnostics/search?q={q}', 'the test', test[f'name_{sfx}'], test['name_en'])
                    look(f'/{loc}/diagnostics/labs?q={q}', 'the test', test[f'name_{sfx}'], test['name_en'])
                    look(f'/{loc}/diagnostics/packages', 'the package', pkg[f'name_{sfx}'], pkg['name_en'])
                    look(f'/{loc}/diagnostics/radiology', 'the scan', scan[f'name_{sfx}'], scan['name_en'])
                    body = look(f'/{loc}/labs/{urllib.parse.quote(test["id"])}', 'the test page title', test[f'name_{sfx}'], test['name_en'])
                    prep = test[f'preparation_{sfx}'][0]
                    step(f'the test page lists the preparation in {loc}', prep[:25] in body, prep[:60])
                    look(f'/{loc}/diagnostics/radiology/{urllib.parse.quote(scan["id"])}', 'the scan page title', scan[f'name_{sfx}'], scan['name_en'])
                    ctx.close()
        journey('web diagnostics locales: search by the translated name')
        ctx = browser.new_context(locale='hi-IN', viewport={'width': 390, 'height': 844})
        page = ctx.new_page()
        for path in ('diagnostics/search', 'diagnostics/labs'):
            word = test['name_hi'].split()[0]
            page.goto(f'{WEB}/hi/{path}?q={urllib.parse.quote(word)}', wait_until='load', timeout=60000)
            page.wait_for_timeout(1500)
            step(f'/hi/{path}?q=<Hindi word> finds the test by its Hindi name', test['name_hi'] in page.inner_text('main'), word)
        ctx.close()
    except Exception as e:
        step('web diagnostics locales flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
