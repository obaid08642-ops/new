"""Journey (QA PR-01 / PR-02 admin web, real browser): the admin reviews and issues a quotation for a pharmacy shortage request.
  - a pharmacy submits a shortage request over the API (j_qa_procurement.submit), which waits for admin review;
  - the admin signs in to the admin panel (with the 2FA code from the mail sink) and opens /admin/pharmacy-procurement;
  - the admin opens this run's request ("طلب #" + last 8 characters of its id) with "مراجعة وإصدار عرض", enters a unit price for
    each item and clicks "إصدار عرض السعر للصيدلية";
  - MongoDB procurementrequests: this request is QUOTATION_ISSUED, and the pharmacy's list shows it (API read-back).
Admin cancel and completion are in j_qa_procurement.py (API). A missing browser or admin app is a FAIL, never a PASS."""
import os
import time

from lib import Client, journey, step, mail_code

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
EMAIL = 'admin@nabd.test'


def main():
    import j_admin, j_accounts, j_onboarding, j_pharmacy, j_qa_procurement
    from lib import summary
    from playwright.sync_api import sync_playwright
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    meds = j_pharmacy.admin_adds_medicines(admin)
    pharm = Client(p['token'], 'pharmacy')
    pid = j_qa_procurement.submit(pharm, meds)
    if not pid:
        summary()
        return
    row_key = str(pid)[-8:]
    t0 = time.time()

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 1280, 'height': 900})
    page = ctx.new_page()
    try:
        journey('procurement PR-02 (admin web): the admin issues a quotation for the request')
        page.goto(f'{ADMIN_WEB}/login', wait_until='load', timeout=60000)
        page.locator('form input:not([type])').first.fill(EMAIL)
        page.fill('input[type="password"]', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass'))
        with page.expect_response(lambda resp: resp.request.method == 'POST' and 'login' in resp.url, timeout=30000) as sent:
            page.click('button[type="submit"]')
        step('the admin signs in (first factor)', sent.value.status < 400, sent.value.status)
        page.wait_for_selector('input[inputmode="numeric"]', timeout=30000)
        code = mail_code(EMAIL, t0)
        step('the 2FA code reaches the admin mail sink', bool(code), 'code' if code else 'no mail')
        page.fill('input[inputmode="numeric"]', code or '000000')
        page.click('button[type="submit"]')
        page.wait_for_url('**/admin**', timeout=30000)
        step('the admin is signed in to the panel', True, page.url)

        page.goto(f'{ADMIN_WEB}/admin/pharmacy-procurement', wait_until='load', timeout=60000)
        card = page.locator('div.rounded-xl', has_text=f'طلب #{row_key}').first
        card.wait_for(timeout=60000)
        step('the admin list shows this request', card.count() > 0, row_key)
        card.get_by_role('button', name='مراجعة وإصدار عرض').click()
        prices = page.locator('input[placeholder="0.00"]')
        prices.first.wait_for(timeout=30000)
        for i in range(prices.count()):
            prices.nth(i).fill(str(10 + i))
        step('the admin enters a unit price for each item', prices.count() >= 1, prices.count())
        with page.expect_response(lambda resp: '/quotation' in resp.url and resp.request.method == 'POST', timeout=60000) as quoted:
            page.get_by_role('button', name='إصدار عرض السعر للصيدلية').click()
        step('the quotation is issued (POST /admin/admin/procurement/:id/quotation)', 200 <= quoted.value.status < 300, quoted.value.status)

        row = j_qa_procurement.request_row(pid)
        step('MongoDB: this request is QUOTATION_ISSUED', bool(row) and row.get('status') == 'QUOTATION_ISSUED', row)
        r = pharm.get('/pharmacy/procurement/my-requests')
        mine = next((x for x in r.items() if x.get('_id') == pid or x.get('id') == pid), None)
        step('the pharmacy list shows the quotation', r.ok and mine and mine.get('status') == 'QUOTATION_ISSUED', r.status)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
