"""Journey (patient-web in a real browser, signed in): the owner decisions of 2026-10-14 on care screens.
  B27: the doctor's thread shows the text of the patient's own messages and the doctor's replies.
  B12: the vitals tab that shows the latest reading of each vital is called "Latest".
  B18: no Relax (breathing / meditation) screen: the hub has no row, the old addresses open the hub.
  Stack: backend :8002, admin BFF :3001, patient-web :3000. A missing browser or patient-web is a FAIL.
"""
import os
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_PATIENT_WEB', 'http://127.0.0.1:3000')


def booked_consultation_thread():
    """A patient with a paid consultation and its booking thread holding one patient message and one doctor reply."""
    import j_accounts, j_admin, j_consultation, j_onboarding
    _, admin = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic', 'video', 'home']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doctor = Client(p['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin)
    acct = j_accounts.app_signup(label='web-care-patient')
    pat = Client(acct['token'], 'patient')
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return acct, None, None, None
    journey('web care: patient and doctor write in the booking thread')
    r = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': aid})
    tid = (r.body.get('data') or r.body).get('id') if isinstance(r.body, dict) else None
    step('booking thread for the appointment', r.ok and tid, r)
    mine = f'هل أحتاج صياماً قبل التحليل؟ {uuid.uuid4().hex[:5]}'
    reply = f'لا حاجة للصيام، أحضر تحاليلك السابقة {uuid.uuid4().hex[:5]}'
    r = pat.post(f'/chat/threads/{tid}/messages', {'body': mine, 'type': 'text', 'client_message_id': str(uuid.uuid4())}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('patient sends a message', r.ok, r)
    r = doctor.post('/provider/chat/send', {'appointment_id': aid, 'message': reply})
    step('doctor replies', r.ok, r)
    return acct, tid, mine, reply


def main():
    journey('web care: setup')
    acct, tid, mine, reply = booked_consultation_thread()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web care', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web care', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
    except Exception as e:
        browser.close(); pw.stop()
        return step('web care', False, f'patient-web not running at {WEB}: {e}')

    journey('web care: sign in on the website (login form calls /api/auth/login)')
    r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': acct['email'], 'password': acct['password']})
    step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')

    journey('web care: the doctor thread shows the message texts (owner decision B27)')
    try:
        if tid:
            page.goto(f'{WEB}/ar/chat/{tid}', wait_until='load', timeout=60000)
            page.wait_for_selector('h1', timeout=30000)
            body = page.inner_text('body')
            step("the patient's own message text is shown in the thread", mine in body, 'text not shown')
            step("the doctor's reply text is shown in the thread", reply in body, 'text not shown')
            step('the thread has a composer to answer (decision 24, issue 1046)', page.locator('textarea').count() > 0, 'no composer')
        else:
            step('booking thread for the web check', False, 'no thread')
    except Exception as e:
        step('chat thread flow', False, str(e)[:300])

    journey('web care: vitals tab is "Latest" (owner decision B12)')
    try:
        page.goto(f'{WEB}/ar/health/vitals', wait_until='load', timeout=60000)
        page.wait_for_selector('h1', timeout=30000)
        step('the vitals tab reads "الأحدث"', page.locator('text=الأحدث').count() > 0, 'no "الأحدث" tab')
    except Exception as e:
        step('vitals flow', False, str(e)[:300])

    journey('web care: no Relax screen (owner decision B18)')
    try:
        page.goto(f'{WEB}/ar/mental-health', wait_until='load', timeout=60000)
        page.wait_for_selector('h1', timeout=30000)
        n = page.locator('a[href*="/mental-health/relax"]').count()
        step('the mental health hub has no Relax row', n == 0, f'{n} link(s)')
        for old in ('relax', 'breathing', 'meditation'):
            page.goto(f'{WEB}/ar/mental-health/{old}', wait_until='load', timeout=60000)
            step(f'/mental-health/{old} opens the hub', page.url.rstrip('/').endswith('/ar/mental-health'), page.url)
    except Exception as e:
        step('mental health flow', False, str(e)[:300])

    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
