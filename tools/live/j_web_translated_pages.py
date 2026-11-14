"""Journey (patient-web in a real browser, signed out): the public facilities map speaks the page's language (issue 1550 walkthrough). The map's messages (MapExplorer) were English text inside the Urdu, Hindi, Bengali and Filipino files, like 330 values in all
(the locale-parity gate counted them; the facility, laboratory, nurse and health-history pages shared the problem and are fixed with
it, but are not all reachable on the seeded stack: no published facility, no lab with priced tests). The page must show the value of
the page's own message file, never the English one, at 390 px and 360 px dark.
Stack: backend :8002 (seeded test facilities), patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import json
import os

from lib import journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
MESSAGES = os.path.join(os.path.dirname(__file__), '..', '..', 'patient-web', 'messages')
LOCALE = {'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}


def msgs(loc):
    return json.load(open(os.path.join(MESSAGES, loc + '.json'), encoding='utf-8'))


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web translated pages', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web translated pages', False, f'no chromium: {e}')
    try:
        en = msgs('en')
        for loc in ('ur', 'hi', 'bn', 'fil'):
            m = msgs(loc)
            for width, scheme in ((390, 'light'), (360, 'dark')):
                journey(f'web translated pages ({loc}, {width}px, {scheme})')
                ctx = browser.new_context(locale=LOCALE[loc], viewport={'width': width, 'height': 844}, color_scheme=scheme)
                page = ctx.new_page()

                def look(path, wanted, signed=False):
                    page.goto(f'{WEB}{path}', wait_until='load', timeout=60000)
                    page.wait_for_timeout(1500)
                    body = page.inner_text('main')
                    for ns, key in wanted:
                        step(f'{path} shows {ns}.{key} in {loc} ("{m[ns][key][:40]}")', m[ns][key] in body, body[:120].replace('\n', ' '))
                        if en[ns][key] != m[ns][key]:
                            step(f'{path} does not show the English {ns}.{key}', en[ns][key] not in body, en[ns][key])
                    step(f'{path} has no sideways scroll at {width}px', page.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 2, '')

                look(f'/{loc}/map', [('MapExplorer', 'subtitle'), ('MapExplorer', 'filterDoctors'), ('MapExplorer', 'filterLabs'), ('MapExplorer', 'directions'), ('MapExplorer', 'searchPh')])
                ctx.close()
    except Exception as e:
        step('web translated pages flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
