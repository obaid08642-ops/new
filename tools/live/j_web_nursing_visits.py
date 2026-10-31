"""Journey (patient-web in a real browser, signed in): a patient's nursing booking shows in "My visits" and in the
order center, and the order center does not say that some orders could not be loaded (issue 1550 walkthrough).
  The website used to read the nurse's job list (/nursing/visits, 403 for a patient), so "My visits" was always empty and
  /orders always showed the partial-failure note.
  Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
ALL_DAY = [{'day': 'All', 'open': '00:00', 'close': '23:59', 'open_evening': None, 'close_evening': None, 'closed': False}]


def main():
    import j_admin, j_accounts, j_onboarding, j_nursing
    from j_lab import tomorrow_at
    journey('web nursing visits: setup (a published service, an approved nurse, a patient booking)')
    admin, _ = j_admin.login()
    j_nursing.admin_publishes_nursing(admin)
    catalog = Client(None, 'anon').get('/nursing/catalog')
    rows = catalog.body if isinstance(catalog.body, list) else catalog.items()
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': x.get('price') or 50} for x in rows]
    p = j_onboarding.register_type('home_care', {'nursing_services': services, 'working_hours': ALL_DAY})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    nurse_id = Client(p['token'], 'nurse').get('/provider/me').get('account', 'id')
    svc = rows[0]
    acct = j_accounts.app_signup(label='web-nursing-visits')
    pat = Client(acct['token'], 'patient')
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}
    r = pat.post('/nursing/bookings', {'provider_id': nurse_id, 'service_id': svc['id'], 'service_name_ar': svc.get('name_ar'),
                                       'scheduled_at': tomorrow_at(9), 'address': addr, 'payment_method': 'card'})
    bid = r.get('id')
    step('the patient books a home nursing visit', r.ok and bid, r)
    if not bid:
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web nursing visits', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web nursing visits', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')

        journey('web nursing visits: "My visits" lists the booking')
        page.goto(f'{WEB}/ar/nursing/visits', wait_until='load', timeout=60000)
        link = page.locator(f'a[href="/ar/nursing/visits/{bid}"]')
        step('/ar/nursing/visits has a row that opens the booking', link.count() > 0, page.inner_text('main')[:300])
        if link.count() > 0:
            link.first.click()
            page.wait_for_url(f'**/ar/nursing/visits/{bid}**', timeout=30000)
            step('the row opens the visit page', f'/ar/nursing/visits/{bid}' in page.url, page.url)

        journey('web nursing visits: the order center loads every service')
        page.goto(f'{WEB}/en/orders', wait_until='load', timeout=60000)
        body = page.inner_text('main')
        step('/en/orders does not say that some orders could not be loaded', 'could not be loaded' not in body, body[:300])
        step('/en/orders lists the nursing visit', page.locator(f'a[href="/en/nursing/visits/{bid}"]').count() > 0, body[:300])
        name_en = svc.get('name_en')
        step('the English page names the visit in English', bool(name_en) and name_en in page.inner_text('main'), f'{name_en!r} {body[:300]}')
    except Exception as e:
        step('web nursing visits flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
