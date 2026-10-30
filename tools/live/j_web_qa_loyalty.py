"""Journey (QA A-12, patient-web in a real browser): loyalty balance and history.
  - the patient earns points through a real action: a vitals reading (POST /health/vitals -> health.vitals_logged -> awardPoints);
  - MongoDB loyalty_transactions holds the award (reason vitals_logged, user_id, points_delta) and its sum is the balance;
  - GET /loyalty/account (balance) and GET /loyalty/transactions (history) read back the same numbers;
  - the browser signs in, opens /ar/loyalty, and shows the balance and the history row (translated reason, + delta);
  - after a reload the page shows the same balance and history row.
Tiers, rewards, challenges and claiming are not covered here (see j_qa_account.py and j_loyalty_*.py).
A missing browser or website is a FAIL, never a PASS."""
import json
import os
import subprocess
import time

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
ARABIC_DIGITS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def ledger(user_id):
    return mongo_json(f'db.loyalty_transactions.find({{user_id: "{user_id}"}}, {{_id: 0, points_delta: 1, reason: 1, ref_id: 1, ref_type: 1}}).toArray()') or []


def wait_award(user_id, seconds=15):
    end = time.time() + seconds
    rows = [r for r in ledger(user_id) if r.get('reason') == 'vitals_logged']
    while not rows and time.time() < end:
        time.sleep(0.5)
        rows = [r for r in ledger(user_id) if r.get('reason') == 'vitals_logged']
    return rows


def numbers(n):
    """The balance as the page prints it: Arabic-Indic digits for ar, plain digits otherwise."""
    return {str(n), str(n).translate(ARABIC_DIGITS)}


def check_page(page, balance, when):
    """The balance is the hero ring (role=progressbar, aria-label carries the formatted balance); the history row is read from the text."""
    html = page.content()
    ring = page.get_by_role('progressbar').first.get_attribute('aria-label') or ''
    step(f'{when}: the balance label is shown', 'رصيد نقاطك' in html, 'رصيد نقاطك')
    step(f'{when}: the balance ring shows the balance', any(n in ring for n in numbers(balance)), f'{balance} points, ring "{ring[:80]}"')
    text = page.inner_text('body')
    step(f'{when}: the history shows the translated vitals reason', 'تسجيل قراءة صحية' in text, 'تسجيل قراءة صحية')
    step(f'{when}: the history shows the +10 delta', '+10' in text or '+' + '١٠' in text, '+10')


def main():
    import j_accounts
    from playwright.sync_api import sync_playwright
    from lib import summary

    acct = j_accounts.app_signup(label='web-loyalty')
    pat = Client(acct['token'], 'patient')
    user_id = pat.get('/auth/me').get('id')

    journey('loyalty A-12: a vitals reading earns points (API, MongoDB)')
    r = pat.post('/health/vitals', {'type': 'heart_rate', 'value': 72})
    step('the patient logs a heart-rate reading', r.ok, r.status)
    rows = wait_award(user_id)
    step('MongoDB: one vitals_logged award with points_delta 10', len(rows) == 1 and rows[0].get('points_delta') == 10, rows)
    balance = sum(int(r.get('points_delta') or 0) for r in ledger(user_id))
    api_account = pat.get('/loyalty/account')
    api_points = api_account.get('points')
    step('GET /loyalty/account equals the ledger sum (MongoDB)', api_account.ok and api_points == balance and balance > 0, f'api {api_points} ledger {balance}')
    api_hist = pat.get('/loyalty/transactions?page=1')
    hist = api_hist.body if isinstance(api_hist.body, list) else (api_hist.body or {}).get('items') or (api_hist.body or {}).get('transactions') or []
    step('GET /loyalty/transactions lists the vitals award', api_hist.ok and any(x.get('reason') == 'vitals_logged' and x.get('points_delta') == 10 for x in hist), api_hist.status)

    journey('loyalty A-12: the website shows the balance and the history')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        r = web_login(ctx, WEB, acct['email'], acct['password'], path='/api/auth/login')
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/loyalty', wait_until='load', timeout=60000)
        page.get_by_text('سجل النقاط', exact=True).first.wait_for(timeout=60000)
        check_page(page, balance, 'after the first load')
        page.reload(wait_until='load')
        page.get_by_text('سجل النقاط', exact=True).first.wait_for(timeout=60000)
        check_page(page, balance, 'after reload')
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
