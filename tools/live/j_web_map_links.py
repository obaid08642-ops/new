"""Journey (patient-web in a real browser, signed out): the public facilities map (issue 1550 walkthrough).
  - "Book" on a lab opens the lab's page (it used to be a 404: the map lists a lab by its profile id and the lab endpoint looked
    only for the account id) and "Book" on a doctor opens the doctor's page;
  - the city under each facility is in the page's language: English on the English, Hindi, Bengali and Filipino pages (the
    city list holds Arabic and English), Arabic on the Arabic and Urdu pages;
  - no sideways scroll at 360 px in dark mode.
Stack: backend :8002 (seeded test facilities), patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os
import re

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
LOCALE = {'ar': 'ar-SA', 'en': 'en-US', 'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}
ARABIC = re.compile(r'[؀-ۿ]')


def main():
    r = Client(None, 'anon').get('/providers/map')
    rows = r.body if isinstance(r.body, list) else r.items()
    lab = next((x for x in rows if x.get('type') == 'lab' and x.get('name_ar') and x.get('name_en')), None)
    doctor = next((x for x in rows if x.get('type') == 'doctor' and x.get('name_ar') and x.get('name_en') and x.get('city')), None)
    step('the public map lists a lab and a doctor', r.ok and lab and doctor, f'{r.status} {len(rows)}')
    cities = Client(None, 'anon').get('/locations/cities')
    crow = cities.body if isinstance(cities.body, list) else cities.items()
    city_row = next((c for c in crow if doctor and c.get('name_ar') == doctor.get('city')), None) or {}
    en_city = city_row.get('name_en')
    step('the city list knows the doctor\'s city in English', bool(en_city), doctor and doctor.get('city'))
    # the page shows the city's own translation where the list has one, else English (hi, bn, fil), else the Arabic (ur)
    expected_city = {'ar': doctor and doctor['city'], 'en': en_city, 'ur': city_row.get('name_ur') or (doctor and doctor['city']),
                     'hi': city_row.get('name_hi') or en_city, 'bn': city_row.get('name_bn') or en_city, 'fil': city_row.get('name_tl') or en_city}
    if not (lab and doctor and en_city):
        return
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web map', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web map', False, f'no chromium: {e}')
    try:
        for loc in ('ar', 'en', 'ur', 'hi', 'bn', 'fil'):
            journey(f'web map ({loc}, guest)')
            ctx = browser.new_context(locale=LOCALE[loc], viewport={'width': 360, 'height': 844}, color_scheme='dark')
            page = ctx.new_page()
            page.goto(f'{WEB}/{loc}/map', wait_until='load', timeout=60000)
            page.wait_for_selector('ul li', timeout=30000)
            page.wait_for_timeout(800)
            body = page.inner_text('main')
            step(f'/{loc}/map shows the city in the page language ("{expected_city[loc]}")', bool(expected_city[loc]) and expected_city[loc] in body, body[:120])
            if loc not in ('ar', 'ur') and expected_city[loc] != doctor['city']:
                step(f'/{loc}/map shows no Arabic city name', doctor['city'] not in body, doctor['city'])
            step(f'/{loc}/map has no sideways scroll at 360px (dark)', page.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 2, '')
            if loc in ('ar', 'en'):
                name = lab['name_ar'] if loc == 'ar' else lab['name_en']
                # other journeys seed facilities with the same name, so the card is found by the lab's own link
                link = page.locator(f'li a[href$="/diagnostics/labs/{lab["id"]}"]').first
                step(f'/{loc}/map has a Book link on the lab "{name}"', link.count() == 1, '')
                if link.count():
                    link.click()
                    page.wait_for_load_state('load')
                    page.wait_for_timeout(1200)
                    text = page.inner_text('body')
                    step(f'"Book" on the lab opens the lab page (not a 404) in {loc}', name in text and '404' not in page.title(), f'{page.url} {text[:100]!r}')
                dname = doctor['name_ar'] if loc == 'ar' else doctor['name_en']
                page.goto(f'{WEB}/{loc}/map', wait_until='load', timeout=60000)
                page.wait_for_selector('ul li', timeout=30000)
                dlink = page.locator('li', has_text=dname).first.locator('a[href*="/consultations/doctors/"]').first
                if dlink.count():
                    dlink.click()
                    page.wait_for_load_state('load')
                    page.wait_for_timeout(1200)
                    step(f'"Book" on the doctor opens the doctor page in {loc}', dname in page.inner_text('body'), page.url)
            ctx.close()
    except Exception as e:
        step('web map flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
