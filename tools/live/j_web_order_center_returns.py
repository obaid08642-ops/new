"""Journey (patient-web): the order centre lists the patient's pharmacy returns (owner decision 31, 1e-web#9).

A patient whose pharmacy order was delivered files a return through the API (as the return page does), then opens
/ar/orders on the website: the return is a row next to the order, and the row opens the return's own page.
Stack: backend :8002, patient-web :3100.
"""
import os

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts, j_admin, j_onboarding, j_pharmacy
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    acct = j_accounts.app_signup(label='order-centre-returns')
    meds = j_pharmacy.admin_adds_medicines(admin)
    ph = Client(p['token'], 'pharmacy')
    j_pharmacy.pharmacy_prices_items(ph, admin, meds)
    pat = Client(acct['token'], 'patient')
    oid = j_pharmacy.run(pat, ph, admin, meds)
    if not oid:
        return step('a delivered pharmacy order to return', False, 'no order')

    journey('decision 31: the patient files a return for the delivered order')
    r = pat.post('/pharmacy/returns', {'serviceType': 'pharmacy', 'reason': 'منتج تالف في العبوة', 'orderId': oid,
                                       'details': 'العبوة مكسورة', 'refundMethod': 'original'})
    rid = r.get('id')
    step('the return is filed', r.ok and bool(rid), r)
    if not rid:
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web order centre', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status}')

        journey('decision 31 on the web: the order centre lists the return')
        page.goto(f'{WEB}/ar/orders', wait_until='load', timeout=60000)
        row = page.locator(f'a[href="/ar/returns/{rid}"]')
        try:
            row.first.wait_for(timeout=30000)
        except Exception:
            pass
        step('the return is a row of the order centre', row.count() >= 1, f'{row.count()} link(s)')
        text = page.locator('main').inner_text() if page.locator('main').count() else page.inner_text('body')
        step('the row carries the reason and the kind "طلب إرجاع"', 'منتج تالف في العبوة' in text and 'طلب إرجاع' in text, text[:300])
        if row.count():
            row.first.click()
            page.wait_for_url(f'**/ar/returns/{rid}', timeout=30000)
            step('the row opens the return page', page.url.endswith(f'/ar/returns/{rid}'), page.url)
    except Exception as e:
        step('web order centre flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
