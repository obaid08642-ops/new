"""Journey (patient-web in a real browser, signed out and signed in): doctors and specialties speak the page's language
(issue 1550 walkthrough).
  - /<locale>/consultations/specialties names every specialty from the site's SpecialtyNames messages (six languages), not the
    English/Arabic text of the server: Hindi, Bengali, Urdu and Filipino pages used to show English names;
  - /<locale>/doctors shows where a doctor works in the page's language: the doctor's `hospital` is Arabic free text, so the list
    now carries the facility's own names (facility_name_ar / facility_name_en) and the English, Hindi, Bengali and Filipino pages show
    the English one;
  - 360 px dark: no sideways scroll.
Stack: backend :8002 (seeded test doctors and facilities), patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import json
import os
import re

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
MESSAGES = os.path.join(os.path.dirname(__file__), '..', '..', 'patient-web', 'messages')
LOCALE = {'ar': 'ar-SA', 'en': 'en-US', 'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}
ARABIC = re.compile(r'[؀-ۿ]')


def main():
    import j_accounts
    anon = Client(None, 'anon')
    sp = anon.get('/care/specialties')
    specs = sp.body if isinstance(sp.body, list) else sp.items()
    spec = next((s for s in specs if s.get('slug') == 'cardiology'), specs[0] if specs else None)
    # other journeys add many doctors without a facility, so look through the pages for the ones that work in one
    docs, withfac = [], []
    for page_no in range(1, 9):
        d = anon.get(f'/care/doctors?limit=50&page={page_no}')
        batch = d.get('items') or []
        docs += batch
        withfac = [x for x in docs if x.get('facility_id') and x.get('hospital')]
        if withfac or not batch:
            break
    step('the care API lists the specialties and the doctors', sp.ok and d.ok and spec, f'{sp.status} {d.status} {len(withfac)} doctors in a facility')
    if not spec:
        return
    # A stack without seeded test doctors has none that work in a facility (CI runs this way): the facility part is then not run here,
    # and says so; the join of the facility names is covered by backend care-facility-names.spec.ts.
    if withfac:
        step('the doctors list carries the facility names (facility_name_en)', all(x.get('facility_name_en') for x in withfac), [x.get('facility_name_en') for x in withfac][:3])
    else:
        print('  NOTE  no doctor in this stack works in a facility: the facility-name steps are not run (see care-facility-names.spec.ts)')
    acct = j_accounts.app_signup(label='web-consult-locales')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web consult locales', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web consult locales', False, f'no chromium: {e}')
    try:
        for state in ('guest', 'user'):
            for loc in ('ar', 'en', 'ur', 'hi', 'bn', 'fil'):
                journey(f'web consult locales ({state}, {loc}, 360px dark)')
                names = json.load(open(os.path.join(MESSAGES, loc + '.json'), encoding='utf-8'))['SpecialtyNames']
                ctx = browser.new_context(locale=LOCALE[loc], viewport={'width': 360, 'height': 844}, color_scheme='dark')
                page = ctx.new_page()
                if state == 'user':
                    page.goto(f'{WEB}/{loc}', wait_until='load', timeout=60000)
                    lr = web_login(ctx, WEB, acct['email'], acct['password'])
                    step('patient signs in on the website', lr.ok, f'{lr.status}')
                page.goto(f'{WEB}/{loc}/consultations/specialties', wait_until='load', timeout=60000)
                page.wait_for_timeout(1000)
                body = page.inner_text('main')
                want = names[spec['slug']]
                step(f'/{loc}/consultations/specialties names "{spec["slug"]}" in {loc} ("{want}")', want in body, body[:120].replace('\n', ' '))
                if loc not in ('en', 'ar'):
                    step(f'/{loc}/consultations/specialties does not show the English name ("{spec["name_en"]}")', spec['name_en'] not in body or spec['name_en'] in want, '')
                step(f'/{loc}/consultations/specialties has no sideways scroll', page.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 2, '')
                if withfac:
                    page.goto(f'{WEB}/{loc}/doctors', wait_until='load', timeout=60000)
                    page.wait_for_timeout(1200)
                    body = page.inner_text('main')
                    shown = [x for x in withfac if (x['hospital'] in body or (x.get('facility_name_en') and x['facility_name_en'] in body))]
                    step(f'/{loc}/doctors lists a doctor with a facility', bool(shown), body[:120].replace('\n', ' '))
                    for x in shown[:3]:
                        if loc in ('ar', 'ur'):
                            step(f'/{loc}/doctors shows "{x["hospital"]}" in Arabic', x['hospital'] in body, '')
                        else:
                            step(f'/{loc}/doctors shows the facility in English ("{x.get("facility_name_en")}")', bool(x.get('facility_name_en')) and x['facility_name_en'] in body, '')
                            step(f'/{loc}/doctors does not show the Arabic facility name ("{x["hospital"]}")', x['hospital'] not in body, '')
                    step(f'/{loc}/doctors has no sideways scroll', page.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 2, '')
                    # the doctor's own page and the booking page name the facility in the page's language too
                    one = withfac[0]
                    for path in [f'/{loc}/consultations/doctors/{one["id"]}'] + ([f'/{loc}/consultations/book/{one["id"]}'] if state == 'user' else []):  # booking asks for the sign-in
                        page.goto(f'{WEB}{path}', wait_until='load', timeout=60000)
                        page.wait_for_timeout(1200)
                        body = page.inner_text('main')
                        if loc in ('ar', 'ur'):
                            step(f'{path} shows the facility in Arabic', one['hospital'] in body, body[:100].replace('\n', ' '))
                        else:
                            step(f'{path} shows the facility in English ("{one.get("facility_name_en")}")', bool(one.get('facility_name_en')) and one['facility_name_en'] in body, body[:100].replace('\n', ' '))
                            step(f'{path} does not show the Arabic facility name', one['hospital'] not in body, '')
                ctx.close()
    except Exception as e:
        step('web consult locales flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
