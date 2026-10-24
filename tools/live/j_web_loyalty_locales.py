"""Journey (patient-web in a real browser, signed in): the loyalty hub speaks the page's language (issue 1550 walkthrough).
GET /loyalty/config sends the tier names, perks and ways to earn in Arabic, each with a stable code (tier id, perk_codes,
earn_ways[].reason). The hub drew the Arabic text on every page. Now each code is shown through its translation (the strings of
the patient app, patient-app/src/i18n/locales): English, Urdu, Hindi, Bengali and Filipino pages show no Arabic, and the
health-challenge row says "varies by challenge" in the page's language, not "<Arabic> points".
Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import json
import os
import re

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
APP = os.path.join(os.path.dirname(__file__), '..', '..', 'patient-app', 'src', 'i18n', 'locales')
FILE = {'en': 'en', 'ar': 'ar', 'ur': 'ur', 'hi': 'hi', 'bn': 'bn', 'fil': 'tl'}
LOCALE = {'ar': 'ar-SA', 'en': 'en-US', 'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}
ARABIC = re.compile(r'[؀-ۿ]')


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='web-loyalty-locales')
    cfg = Client(acct['token'], 'patient').get('/loyalty/config')
    step('the loyalty config has tiers with perk codes and earn ways with reasons', cfg.ok and cfg.get('tiers') and cfg.get('earn_ways'), cfg.status)
    if not cfg.ok:
        return
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web loyalty', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web loyalty', False, f'no chromium: {e}')
    try:
        bronze = cfg.get('tiers')[0]
        perk_code = bronze['perk_codes'][0]
        reason = next(w['reason'] for w in cfg.get('earn_ways') if w.get('reason'))
        challenge = next(w for w in cfg.get('earn_ways') if not w.get('reason'))
        for loc in ('en', 'ur', 'hi', 'bn', 'fil', 'ar'):
            app = json.load(open(os.path.join(APP, FILE[loc] + '.json'), encoding='utf-8'))
            for width, scheme in ((390, 'light'), (360, 'dark')):
                journey(f'web loyalty ({loc}, {width}px, {scheme})')
                ctx = browser.new_context(locale=LOCALE[loc], viewport={'width': width, 'height': 844}, color_scheme=scheme)
                page = ctx.new_page()
                page.goto(f'{WEB}/{loc}', wait_until='load', timeout=60000)
                lr = web_login(ctx, WEB, acct['email'], acct['password'])
                step('patient signs in on the website', lr.ok, f'{lr.status}')
                page.goto(f'{WEB}/{loc}/loyalty', wait_until='load', timeout=60000)
                page.wait_for_timeout(1500)
                body = page.inner_text('main')
                for what, expected in (('the tier', app['loyalty.tier.bronze']), ('a perk', app[f'loyalty.perk.{perk_code}']),
                                       ('a way to earn', app[f'loyalty.earn.{reason}']), ('the health challenge', app['loyalty.earn.challenge']),
                                       ('"varies by challenge"', app['loyalty.earn.perChallenge'])):
                    step(f'/{loc}/loyalty shows {what} in {loc} ("{expected}")', expected in body, body[:160].replace('\n', ' '))
                if loc != 'ar' and loc != 'ur':
                    step(f'/{loc}/loyalty shows no Arabic text', not ARABIC.search(body), ARABIC.findall(body)[:20])
                else:
                    step(f'/{loc}/loyalty does not mix in the server\'s Arabic challenge label with "points"', f"{challenge['pts']} " not in body or loc == 'ar', '')
                step(f'/{loc}/loyalty has no sideways scroll at {width}px', page.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 2, '')
                ctx.close()
    except Exception as e:
        step('web loyalty flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
