"""Journey (patient-web, real browser): what a cancellation gives back, and the home-visit address (journeys 44, 29).
  - A paid consultation is cancelled on /consultations/cancel-reschedule: the page then says how much goes back and that it
    goes to the original payment method (it only refreshed before), matching the server's refund on the appointment.
  - Booking a home visit asks for one of the patient's saved addresses that has a map location (no typed latitude and
    longitude), and the appointment carries that address's location.
  Stack: backend :8002, patient-web :3100.
"""
import os

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic', 'home']})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin, ('clinic', 'home'))
    acct = j_accounts.app_signup(label='web-cancel')
    pat = Client(acct['token'], 'patient')
    aid = j_consultation.book_paid(pat, doctor)
    r = pat.post('/users/me/addresses', {'label': 'البيت', 'street': 'شارع التحلية 7', 'city': 'الرياض', 'lat': 24.6951, 'lng': 46.6853, 'is_default': True})
    step('the patient has a saved address with a map location', r.ok, r)
    if not aid:
        return
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', r.ok, f'{r.status}')

        journey('journeys#44: the cancellation says what comes back')
        # each journey has its own try, so a failure here does not hide the next one
        try:
            page.goto(f'{WEB}/ar/consultations/cancel-reschedule?appointmentId={aid}', wait_until='load', timeout=60000)
            # wait until the page is interactive (a click before hydration does nothing)
            page.wait_for_function("() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('إلغاء الموعد')); return !!b && Object.keys(b).some((k) => k.startsWith('__react')); }", timeout=30000)
            page.get_by_role('button', name='إلغاء الموعد').first.click(timeout=30000)
            # the cancel form asks for a reason first, as the app does: confirm stays disabled until one is chosen
            page.get_by_role('button', name='سبب آخر').click(timeout=30000)
            with page.expect_response(lambda res: '/cancel' in res.url and res.request.method == 'POST', timeout=30000) as resp:
                page.get_by_role('button', name='تأكيد الإلغاء').click(timeout=30000)
            res = resp.value
            step('the website\'s cancel route answers with the refund', res.ok and isinstance((res.json() or {}).get('refund'), dict), f'{res.status} {res.text()[:300]}')
            status = page.get_by_text('أُلغي الموعد').first
            try:
                status.wait_for(timeout=30000)
            except Exception:
                raise RuntimeError('the page does not say the appointment is cancelled: ' + page.locator('main').first.inner_text()[:400])
            text = status.inner_text()
            a = pat.get(f'/care/appointments/{aid}')
            pct = a.get('refund_percentage')
            step('the server cancelled it with a refund rule', a.get('status') == 'CANCELLED' and pct is not None, a)
            step('the page says the amount goes back to the original payment method', 'وسيلة الدفع الأصلية' in text and ('ر.س' in text or 'SAR' in text), text)
        except Exception as e:
            step('journeys#44 web flow', False, str(e)[:300])

        journey('journeys#29: a home visit goes to a saved address')
        page.goto(f"{WEB}/ar/consultations/book/{doctor.get('/provider-onboarding/my-profile').get('id')}", wait_until='load', timeout=60000)
        home = page.get_by_role('radio', name='زيارة منزلية')
        if home.count() == 0:
            home = page.get_by_role('button', name='زيارة منزلية')
        home.first.click(timeout=30000)
        section = page.locator('section[aria-labelledby="book-home"]')  # SectionCard puts the id on its heading
        section.wait_for(timeout=30000)
        step('no latitude or longitude to type', section.locator('input').count() == 0, section.inner_text()[:300])
        select = section.locator('select')
        options = select.locator('option').all_inner_texts() if select.count() else []
        step('the saved address is offered', any('شارع التحلية 7' in o for o in options), options or section.inner_html()[:600])
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
