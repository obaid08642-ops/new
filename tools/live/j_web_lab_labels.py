"""Journey (patient-web in a real browser, signed in): the lab pages speak the page's language (issue 1550 walkthrough).
  - /diagnostics/packages: the category list shows labels ("Heart", "القلب"), not the catalogue codes ("cardiac", "package");
  - /en/diagnostics/search: the tests carry their English names (name_en), not the Arabic ones, and an English category label.
  Stack: backend :8002 (seeded lab catalogue), patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os
import re

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
CODES = {'blood', 'hormones', 'diabetes', 'vitamins', 'cardiac', 'imaging', 'kidney', 'liver', 'package'}
AR = re.compile(r'[؀-ۿ]')


def main():
    import j_accounts
    r = Client(None, 'anon').get('/labs/services')
    rows = r.body if isinstance(r.body, list) else r.items()
    test = next((x for x in rows if x.get('name_en') and x.get('name_ar') and AR.search(x['name_ar']) and not x.get('is_package')), None)
    step('the lab catalogue has a test with an Arabic and an English name', r.ok and test, f'{r.status} {len(rows)}')
    acct = j_accounts.app_signup(label='web-lab-labels')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web lab labels', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web lab labels', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')

        for loc, heart in (('ar', 'القلب'), ('en', 'Heart')):
            journey(f'web lab labels ({loc}): package categories')
            page.goto(f'{WEB}/{loc}/diagnostics/packages', wait_until='load', timeout=60000)
            # the categories are radio chips (the app's chips) in a radiogroup now, no longer a select: read the chips' labels
            page.locator('[role="radiogroup"] label').first.wait_for(timeout=30000)
            options = [o.strip() for o in page.locator('[role="radiogroup"] label').all_inner_texts()]
            step(f'/{loc}/diagnostics/packages shows no category code', not (set(options) & CODES), options)
            step(f'/{loc}/diagnostics/packages names the heart category "{heart}"', heart in options, options)

        journey('web lab labels (en): test names in English')
        page.goto(f'{WEB}/en/diagnostics/search', wait_until='load', timeout=60000)
        page.wait_for_selector('main li', timeout=30000)
        body = page.inner_text('main')
        if test:
            step(f'the English search lists "{test["name_en"]}"', test['name_en'] in body, body[:300])
            step('the English search does not show the Arabic name', test['name_ar'] not in body, test['name_ar'])
        step('the English search shows no category code', not any(re.search(rf'(^|\n){c}($|\n)', body) for c in CODES), body[:300])
    except Exception as e:
        step('web lab labels flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
