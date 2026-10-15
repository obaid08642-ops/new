"""Journey (patient-web in a real browser, signed in): the owner decisions of 2026-10-14 on care screens.
  B27: the doctor's thread shows the text of the patient's own messages and the doctor's replies.
  B12: the vitals tab that shows the latest reading of each vital is called "Latest".
  B18: no Relax (breathing / meditation) screen: the hub has no row, the old addresses open the hub.
  Stack: backend :8002, admin BFF :3001, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh). A missing browser or patient-web is a FAIL.
"""
import os
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def booked_consultation_thread():
    """A patient with a paid consultation and its booking thread holding one patient message and one doctor reply."""
    import j_accounts, j_admin, j_consultation, j_onboarding
    admin, _ = j_admin.login()  # the admin panel session (AdminWeb), as j_consultation's own run uses it
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
        return acct, None, None, None, pat, None
    journey('web care: the doctor runs and finishes the visit (the thread opens after it, decision 24)')
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    inc = [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]
    if aid in inc:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('doctor accepts', r.ok, r)
    for action in ('check-in', 'start'):
        r = doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'appointment {action}', r.ok, r)
    r = doctor.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'متابعة', 'notes': 'راحة', 'recommendations': 'مراجعة عند الحاجة'})
    step('doctor finishes the visit', r.ok, r)
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
    journey('web care: the appointments list names the doctor and the specialty (2-web#7)')
    detail = pat.get(f'/care/appointments/{aid}')
    lst = pat.get('/care/appointments')
    row = next((x for x in (lst.body if isinstance(lst.body, list) else lst.items()) if x.get('id') == aid), {})
    step('the list row carries the doctor name of the detail', bool(detail.get('doctor_name')) and row.get('doctor_name') == detail.get('doctor_name'), f"list={row.get('doctor_name')} detail={detail.get('doctor_name')}")
    step('the list row carries the specialty in Arabic and English', bool(row.get('specialty_name_ar')) and 'specialty_name_en' in row, {k: row.get(k) for k in ('specialty_name_ar', 'specialty_name_en')})
    return acct, tid, mine, reply, pat, detail.get('doctor_name')


def main():
    journey('web care: setup')
    acct, tid, mine, reply, pat, doctor_name = booked_consultation_thread()
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

    journey('web care: the appointments page shows the doctor (2-web#7)')
    try:
        page.goto(f'{WEB}/ar/appointments?tab=past', wait_until='load', timeout=60000)  # the visit is finished
        page.wait_for_selector('h1', timeout=30000)
        step("the appointments page names the booked doctor", bool(doctor_name) and doctor_name in page.inner_text('body'), doctor_name)
    except Exception as e:
        step('appointments flow', False, str(e)[:300])

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
            try:  # a server redirect from a page is streamed and followed in the browser
                page.wait_for_url('**/ar/mental-health', timeout=15000)
            except Exception:
                pass
            step(f'/mental-health/{old} opens the hub', page.url.rstrip('/').endswith('/ar/mental-health'), page.url)
    except Exception as e:
        step('mental health flow', False, str(e)[:300])

    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
