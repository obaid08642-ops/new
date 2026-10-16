"""Journey (patient-web in a real browser, signed in): the payment result after a consultation card payment
(issues 1055, 1087; journeys.json scenario 4 "pay card" and scenario 9 "payment").
  The payment provider sends the patient back to /payments/result with ITS payment id only (`?id=`). The page asks the
  backend which payment that is and offers the paid appointment, not the pharmacy orders list.
  Stack: backend :8002, admin BFF :3001, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os
import urllib.parse

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts, j_concurrency, j_consultation
    journey('web payment result: a consultation paid by card')
    acct = j_accounts.app_signup(label='web-pay-result')
    pat = Client(acct['token'], 'patient')
    j_concurrency.ensure_doctor()
    aid = j_consultation.book_paid(pat, j_concurrency.DOCTOR_CLIENT)
    gateway_id = (j_consultation.LAST_TXN or {}).get('gateway_intent_id')
    step('the consultation is paid and the provider gave its payment id', bool(aid and gateway_id), j_consultation.LAST_TXN)
    if not (aid and gateway_id):
        return
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web payment result', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web payment result', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')

        journey('web payment result: the provider sends the patient back with its own payment id')
        page.goto(f'{WEB}/ar/payments/result?id={urllib.parse.quote(gateway_id)}&status=paid', wait_until='load', timeout=60000)
        page.wait_for_selector('text=تم الدفع بنجاح', timeout=45000)
        step('the page says the payment succeeded (the backend said so)', True, None)
        btn = page.locator('button:has-text("عرض الحجز")')
        step('it offers the paid appointment ("عرض الحجز"), not only the pharmacy orders', btn.count() > 0, f'{btn.count()} button(s)')
        if btn.count():
            btn.first.click()
            page.wait_for_url(f'**/ar/appointments/{aid}', timeout=30000)
            step('the button opens that appointment', page.url.rstrip('/').endswith(f'/ar/appointments/{aid}'), page.url)
    except Exception as e:
        step('payment result flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
