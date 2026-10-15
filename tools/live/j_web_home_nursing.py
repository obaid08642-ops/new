"""Journey (patient-web in a real browser, signed in): book a home nursing service on the website (journeys#60, #63).
  - one services list (/nursing/catalog); the old /home-care/services list sends there;
  - the service page has "Book this service" -> /home-care/services/<id>/book;
  - the nurses are the approved nurses offering the service, the times are the nurse's own free slots (from the hours the
    nurse gave at registration), the address is a saved one with a map location, and a card visit opens the Moyasar page.
  Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh), fake Moyasar :9100.
"""
import os

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
# provider-app NursingRegistration, "Available 24/7": one window for every day
ALL_DAY = [{'day': 'All', 'open': '00:00', 'close': '23:59', 'open_evening': None, 'close_evening': None, 'closed': False}]


def main():
    import j_admin, j_accounts, j_onboarding, j_nursing
    admin, _ = j_admin.login()
    j_nursing.admin_publishes_nursing(admin)
    catalog = Client(None, 'anon').get('/nursing/catalog')
    rows = catalog.body if isinstance(catalog.body, list) else catalog.items()
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': 0} for x in rows]
    p = j_onboarding.register_type('home_care', {'nursing_services': services, 'working_hours': ALL_DAY})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    nurse = Client(p['token'], 'nurse')
    nurse_id = nurse.get('/provider/me').get('account', 'id')
    svc = rows[0]
    acct = j_accounts.app_signup(label='web-nursing')
    pat = Client(acct['token'], 'patient')
    r = pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع الملك فهد 3', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001, 'is_default': True})
    step('patient has a located address', r.ok, r)

    journey('home nursing: the nurse\'s registration hours give free times')
    import datetime
    day = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    r = Client(None, 'anon').get(f'/home-care/providers/{nurse_id}/slots?date={day}')
    step('the nurse who registered 24/7 has free times tomorrow', r.ok and len(r.get('slots') or []) > 0, f"{r.status} reason={r.get('reason')} slots={len(r.get('slots') or [])}")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web home nursing', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web home nursing', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': acct['email'], 'password': acct['password']})
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')

        journey('home nursing on the web: one services list (journeys#63)')
        page.goto(f'{WEB}/ar/home-care/services', wait_until='load', timeout=60000)
        try:  # the redirect may arrive in the streamed page (a client-side replace)
            page.wait_for_url('**/nursing/catalog**', timeout=15000)
        except Exception:
            pass
        step('the old services list opens the one nursing catalogue', '/nursing/catalog' in page.url, page.url)

        journey('home nursing on the web: book a service (journeys#60)')
        page.goto(f"{WEB}/ar/home-care/services/{svc['id']}", wait_until='load', timeout=60000)
        page.wait_for_selector('h1, h2', timeout=30000)
        book = page.locator(f"a[href=\"/ar/home-care/services/{svc['id']}/book\"]")
        step('the service page has "Book this service"', book.count() > 0, f'{book.count()} link(s)')
        if not book.count():
            return
        book.first.click()
        page.wait_for_url('**/book', timeout=30000)
        sec = lambda key: page.locator(f'section[aria-labelledby="home-care-{key}"]')
        sec('nurse').locator('button').first.wait_for(timeout=30000)
        nurses = sec('nurse').locator('button')
        listed = pat.get(f"/home-care/providers?type={svc['id']}")
        order = [n.get('id') for n in (listed.body if isinstance(listed.body, list) else listed.items())]
        step('the nurses offering the service are listed, this nurse among them', nurses.count() == len(order) and nurse_id in order, f'{nurses.count()} button(s), {len(order)} from the server')
        if nurse_id in order:
            nurses.nth(order.index(nurse_id)).click()
        sec('day').locator('button').nth(1).click()
        sec('time').locator('button').first.wait_for(timeout=30000)
        step('tomorrow shows the nurse\'s free times', sec('time').locator('button').count() > 0, sec('time').inner_text()[:200])
        sec('time').locator('button').first.click()
        step('the saved located address is offered', 'الملك فهد' in sec('address').inner_text(), sec('address').inner_text()[:200])
        with page.expect_request(lambda req: 'fake-moyasar' in req.url, timeout=30000) as went:
            page.locator('button', has_text='تأكيد الحجز').click()
        step('a card visit opens the Moyasar card page', 'fake-moyasar' in went.value.url, went.value.url)
    except Exception as e:
        step('web home nursing flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()

    r = pat.get('/home-care/bookings/my')
    rows = r.body if isinstance(r.body, list) else r.items()
    mine = [b for b in rows if isinstance(b, dict) and b.get('service_id') == svc['id']]
    b = mine[0] if mine else {}
    step('one booking was made, with the chosen nurse, by card', r.ok and len(mine) == 1 and b.get('provider_id') == nurse_id and b.get('payment_method') == 'card', f'{len(mine)} {b}'[:300])
    step('the booking carries the saved address\'s location', (b.get('address') or {}).get('lat') == 24.7001, str(b.get('address'))[:200])


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
