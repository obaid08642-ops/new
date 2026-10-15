"""Journey (patient-web in a real browser, signed in): one place to cancel or reschedule an appointment (journeys#42).
  The appointment page links to /consultations/cancel-reschedule (the policy, a new time and the cancellation, as the
  app); it no longer carries a second cancel form of its own.
  Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts, j_concurrency, j_consultation
    acct = j_accounts.app_signup(label='web-cancel')
    pat = Client(acct['token'], 'patient')
    j_concurrency.ensure_doctor()
    aid = j_consultation.book_paid(pat, j_concurrency.DOCTOR_CLIENT)
    step('a paid upcoming appointment', bool(aid), aid)
    if not aid:
        return
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web cancel', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web cancel', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': acct['email'], 'password': acct['password']})
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')

        journey('web appointment: one place to cancel or reschedule (journeys#42)')
        page.goto(f'{WEB}/ar/appointments/{aid}', wait_until='load', timeout=60000)
        page.wait_for_selector('h1, h2', timeout=30000)
        link = page.locator(f'a[href="/ar/consultations/cancel-reschedule?appointmentId={aid}"]')
        step('the appointment page links to the cancel/reschedule page', link.count() > 0, f'{link.count()} link(s)')
        inline = page.locator('button', has_text='إلغاء الموعد')
        step('the appointment page has no second cancel form of its own', inline.count() == 0, f'{inline.count()} inline cancel button(s)')
        if link.count():
            link.first.click()
            page.wait_for_url('**/consultations/cancel-reschedule**', timeout=30000)
            page.wait_for_selector('h1, h2', timeout=30000)
            step('the cancel/reschedule page opens with the cancellation', page.locator('button', has_text='إلغاء الموعد').count() > 0, page.url)
    except Exception as e:
        step('web cancel flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
